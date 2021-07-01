import fs from "fs";
import path from "path";
import { Server } from "http";
import { Server as SecureServer } from "https";

import { Express, NextFunction, Request, Response } from "express";

// import "multer";
import temp from "temp";
import {
  NodeSSH,
  Config as SshConfig,
  SSHExecCommandOptions,
  SSHExecCommandResponse,
} from "node-ssh";
import {
  DefaultEventHandlerOptions,
  DefaultEventHandlerStrategies,
  Gateway,
  GatewayOptions,
  Identity,
  InMemoryWallet,
  X509WalletMixin,
  TransientMap,
} from "fabric-network";

import { Optional } from "typescript-optional";

import OAS from "../json/openapi.json";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import {
  ConsensusAlgorithmFamily,
  IPluginLedgerConnector,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";

import {
  consensusHasTransactionFinality,
  PluginRegistry,
} from "@hyperledger/cactus-core";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  IRunTransactionEndpointV1Options,
  RunTransactionEndpointV1,
} from "./run-transaction/run-transaction-endpoint-v1";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./get-prometheus-exporter-metrics/get-prometheus-exporter-metrics-endpoint-v1";

import {
  ConnectionProfile,
  GatewayDiscoveryOptions,
  GatewayEventHandlerOptions,
  DeployContractGoSourceV1Request,
  DeployContractGoSourceV1Response,
  DeployContractV1Request,
  DeployContractV1Response,
  FabricContractInvocationType,
  RunTransactionRequest,
  RunTransactionResponse,
  ChainCodeProgrammingLanguage,
  ChainCodeLifeCycleCommandResponses,
} from "./generated/openapi/typescript-axios/index";

import {
  DeployContractGoSourceEndpointV1,
  IDeployContractGoSourceEndpointV1Options,
} from "./deploy-contract-go-source/deploy-contract-go-source-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { IQueryInstalledResponse } from "./peer/i-query-installed-response";
import { IQueryCommittedResponse } from "./peer/i-query-committed-response";
import {
  DeployContractEndpointV1,
  IDeployContractEndpointV1Options,
} from "./deploy-contract/deploy-contract-endpoint-v1";
import { sourceLangToRuntimeLang } from "./peer/source-lang-to-runtime-lang";
import FabricCAServices from "fabric-ca-client";

/**
 * Constant value holding the default $GOPATH in the Fabric CLI container as
 * observed on fabric deployments that are produced by the official examples
 * found in the https://github.com/hyperledger/fabric-samples repository.
 */
export const K_DEFAULT_CLI_CONTAINER_GO_PATH = "/opt/gopath/";

/**
 * The command that will be used to issue docker commands while controlling
 * the Fabric CLI container and the peers.
 */
export const K_DEFAULT_DOCKER_BINARY = "docker";

export interface IPluginLedgerConnectorFabricOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  dockerBinary?: string;
  peerBinary: string;
  goBinary?: string;
  cliContainerGoPath?: string;
  cliContainerEnv: NodeJS.ProcessEnv;
  pluginRegistry: PluginRegistry;
  sshConfig: SshConfig;
  connectionProfile: ConnectionProfile;
  prometheusExporter?: PrometheusExporter;
  discoveryOptions?: GatewayDiscoveryOptions;
  eventHandlerOptions?: GatewayEventHandlerOptions;
}

export class PluginLedgerConnectorFabric
  implements
    IPluginLedgerConnector<
      DeployContractV1Request,
      DeployContractV1Response,
      RunTransactionRequest,
      RunTransactionResponse
    >,
    ICactusPlugin,
    IPluginWebService {
  public static readonly CLASS_NAME = "PluginLedgerConnectorFabric";
  private readonly instanceId: string;
  private readonly log: Logger;
  private readonly dockerBinary: string;
  private readonly peerBinary: string;
  private readonly goBinary: string;
  private readonly cliContainerGoPath: string;
  public prometheusExporter: PrometheusExporter;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return PluginLedgerConnectorFabric.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginLedgerConnectorFabricOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.peerBinary, `${fnTag} options.peerBinary`);
    Checks.truthy(opts.pluginRegistry, `${fnTag} options.pluginRegistry`);
    Checks.truthy(opts.connectionProfile, `${fnTag} options.connectionProfile`);
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.dockerBinary = opts.dockerBinary || K_DEFAULT_DOCKER_BINARY;
    Checks.truthy(this.dockerBinary != null, `${fnTag}:dockerBinary`);

    this.cliContainerGoPath =
      opts.cliContainerGoPath || K_DEFAULT_CLI_CONTAINER_GO_PATH;
    Checks.nonBlankString(
      this.cliContainerGoPath,
      `${fnTag}:cliContainerGoPath`,
    );

    this.goBinary = opts.goBinary || "go";
    this.peerBinary = opts.peerBinary;
    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = opts.instanceId;
    this.prometheusExporter.startMetricsCollection();
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  getOpenApiSpecs(): OpenAPIV3.Document {
    return (OAS as unknown) as OpenAPIV3.Document;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-ledger-connector-fabric`;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }
  private async sshExec(
    cmd: string,
    label: string,
    ssh: NodeSSH,
    sshCmdOptions: SSHExecCommandOptions,
  ): Promise<SSHExecCommandResponse> {
    this.log.debug(`${label} CMD: ${cmd}`);
    const cmdRes = await ssh.execCommand(cmd, sshCmdOptions);
    this.log.debug(`${label} CMD Response: %o`, cmdRes);
    Checks.truthy(cmdRes.code === null, `${label} cmdRes.code === null`);
    return cmdRes;
  }

  /**
   * @param req The object containing all the necessary metadata and parameters
   * in order to have the contract deployed.
   */
  public async deployContract(
    req: DeployContractV1Request,
  ): Promise<DeployContractV1Response> {
    const fnTag = `${this.className}#deployContract()`;
    const { log, opts } = this;

    const ssh = new NodeSSH();
    await ssh.connect(opts.sshConfig);
    if (req.collectionsConfigFile) {
      log.debug(`Has private data collection definition`);
    }
    try {
      const {
        sourceFiles,
        ccName,
        ccLabel,
        ccVersion,
        ccLang,
        targetOrganizations,
        caFile,
        ccSequence,
        channelId,
        orderer,
        ordererTLSHostnameOverride,
        collectionsConfigFile,
        connTimeout,
        constructorArgs,
        signaturePolicy,
      } = req;

      Checks.truthy(sourceFiles, `${fnTag}:sourceFiles`);
      Checks.truthy(Array.isArray(sourceFiles), `${fnTag}:sourceFiles array`);

      let signaturePolicyCliArg = " ";
      if (signaturePolicy) {
        signaturePolicyCliArg = ` --signature-policy=${signaturePolicy} `;
      }

      let connTimeoutCliArg = " ";
      if (connTimeout) {
        connTimeoutCliArg = ` --connTimeout=${connTimeout}s `;
      }

      let initRequiredCliArg = " ";
      if (constructorArgs) {
        initRequiredCliArg = ` --init-required `;
      }

      temp.track();
      const tmpDirPrefix = `hyperledger-cactus-${this.className}`;
      const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

      const remoteDirPath = path.join(this.cliContainerGoPath, "src/", ccLabel);
      log.debug(`Remote dir path on CLI container: ${remoteDirPath}`);

      let collectionsConfigFileCliArg = " ";
      if (collectionsConfigFile) {
        const remoteFilePath = path.join(remoteDirPath, collectionsConfigFile);
        this.log.debug(`Collections config: ${remoteFilePath}`);
        collectionsConfigFileCliArg = `--collections-config ${remoteFilePath} `;
      }

      const sshCmdOptions: SSHExecCommandOptions = {
        execOptions: {
          pty: true, // FIXME do we need this? probably not... same for env
          env: {
            // just in case go modules would be otherwise disabled
            GO111MODULE: "on",
            FABRIC_LOGGING_SPEC: "DEBUG",
          },
        },
        cwd: remoteDirPath,
      };

      const dockerExecEnv = Object.entries(this.opts.cliContainerEnv)
        .map(([key, value]) => `--env ${key}=${value}`)
        .join(" ");

      const { dockerBinary } = this;
      const dockerBuildCmd =
        `${dockerBinary} exec ` +
        dockerExecEnv +
        ` --env GO111MODULE=on` +
        ` --workdir=${remoteDirPath}` +
        ` cli `;

      const r1 = new RegExp(
        `\\s+(-e|--env)\\s+CORE_LOGGING_LEVEL='?"?\\w+'?"?\\s+`,
        "gmi",
      );
      const r2 = new RegExp(`FABRIC_LOGGING_SPEC=('?"?\\w+'?"?)`, "gmi");

      // Need to make sure that the logging is turned off otherwise it
      // mangles the JSON syntax and makes the output invalid...
      const dockerBuildCmdInfoLog = dockerBuildCmd
        .replace(r1, " ")
        .replace(r2, " FABRIC_LOGGING_SPEC=ERROR ");

      // await this.sshExec(
      //   `${dockerBinary} exec cli mkdir -p ${remoteDirPath}/`,
      //   "Create ChainCode project (go module) directory",
      //   ssh,
      //   sshCmdOptions,
      // );

      // await this.sshExec(
      //   `${dockerBinary} exec cli go version`,
      //   "Print go version",
      //   ssh,
      //   sshCmdOptions,
      // );

      for (const sourceFile of sourceFiles) {
        const { filename, filepath, body } = sourceFile;
        const relativePath = filepath || "./";
        const subDirPath = path.join(tmpDirPath, relativePath);
        fs.mkdirSync(subDirPath, { recursive: true });
        const localFilePath = path.join(subDirPath, filename);
        fs.writeFileSync(localFilePath, body, "base64");
      }

      log.debug(`SCP from/to %o => %o`, tmpDirPath, remoteDirPath);
      await ssh.putDirectory(tmpDirPath, remoteDirPath);
      log.debug(`SCP OK %o`, remoteDirPath);

      if (ccLang === ChainCodeProgrammingLanguage.Golang) {
        // const cliRemoteDirPath = path.join(remoteDirPath, "../");
        // const copyToCliCmd = `${dockerBinary} cp ${remoteDirPath} cli:${cliRemoteDirPath}`;
        // log.debug(`Copy to CLI Container CMD: ${copyToCliCmd}`);
        // const copyToCliRes = await ssh.execCommand(copyToCliCmd, sshCmdOptions);
        // log.debug(`Copy to CLI Container CMD Response: %o`, copyToCliRes);
        // Checks.truthy(copyToCliRes.code === null, `copyToCliRes.code === null`);

        {
          const label = "docker copy go code to cli container";
          const cliRemoteDirPath = path.join(remoteDirPath, "../");
          const cmd = `${dockerBinary} cp ${remoteDirPath} cli:${cliRemoteDirPath}`;
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }

        {
          const label = "go mod vendor";
          const cmd = `${dockerBuildCmd} go mod vendor`;
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }
      } else if (ccLang === ChainCodeProgrammingLanguage.Typescript) {
        {
          const cmd = `npm install`;
          const label = "ChainCode: Typescript install dependencies";
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }
        {
          const cmd = `npm run build`;
          const label = "ChainCode: Typescript build";
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }
        {
          const label = "docker copy compiled TS code to cli container";
          const cliRemoteDirPath = path.join(remoteDirPath, "../");
          const cmd = `${dockerBinary} cp ${remoteDirPath} cli:${cliRemoteDirPath}`;
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }
      } else if (ccLang === ChainCodeProgrammingLanguage.Javascript) {
        {
          const label = "docker copy JS code to cli container";
          const cliRemoteDirPath = path.join(remoteDirPath, "../");
          const cmd = `${dockerBinary} cp ${remoteDirPath} cli:${cliRemoteDirPath}`;
          await this.sshExec(cmd, label, ssh, sshCmdOptions);
        }
      }

      const lifecycle: ChainCodeLifeCycleCommandResponses = {
        approveForMyOrgList: [],
        installList: [],
        queryInstalledList: [],
      };
      const packageIds: string[] = [];

      // Commands executed here are based on the deployCC.sh script in the fabric-samples
      // repository
      // https://github.com/hyperledger/fabric-samples/blob/14dc7e13160ef1b7332bafb01f8ffa865116f9e7/test-network/scripts/deployCC.sh
      {
        const runtimeLang = sourceLangToRuntimeLang(ccLang);
        const cmd =
          `${dockerBuildCmd} peer lifecycle chaincode package ${ccName}.tar.gz ` +
          ` --path ${remoteDirPath} ` +
          ` --label ${ccLabel} ` +
          ` --lang ${runtimeLang}`;

        const cmdLabel = `packaging chain code`;
        const res = await this.sshExec(cmd, cmdLabel, ssh, sshCmdOptions);
        lifecycle.packaging = res;
      }

      // https://github.com/hyperledger/fabric-samples/blob/release-1.4/fabcar/startFabric.sh
      for (const org of targetOrganizations) {
        const dockerExecEnv = Object.entries(org)
          .map(([key, val]) => `--env ${key}=${val}`)
          .join(" ");

        const dockerBuildCmd =
          `${dockerBinary} exec ` +
          dockerExecEnv +
          ` --env GO111MODULE=on` +
          ` --workdir=${remoteDirPath}` +
          ` cli `;

        const cmd =
          `${dockerBuildCmd} peer lifecycle chaincode install ${ccName}.tar.gz ` +
          ` ${connTimeoutCliArg} `;
        const label = `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`;
        const res = await this.sshExec(cmd, label, ssh, sshCmdOptions);
        lifecycle.installList.push(res);

        let packageId: string;
        {
          const cmd = `${dockerBuildCmdInfoLog} peer lifecycle chaincode queryinstalled --output json`;
          const label = `query installed contracts CMD`;
          const res = await this.sshExec(cmd, label, ssh, sshCmdOptions);
          lifecycle.queryInstalledList.push(res);

          Checks.truthy(res.stdout.includes(ccLabel));
          const json = res.stdout;
          const qir = JSON.parse(json) as IQueryInstalledResponse;
          const icc = qir.installed_chaincodes.find(
            (chainCode) => chainCode.label === ccLabel,
          );
          this.log.debug(`Parsed list of installed contracts: %o`, qir);
          Checks.truthy(icc, "No installed chaincode with label: %o", ccLabel);
          if (!icc?.package_id) {
            throw new Error(`${fnTag}: package ID falsy. Something's wrong.`);
          }
          packageId = icc?.package_id;
          this.log.debug(`Found package ID: ${packageId}`);
          packageIds.push(packageId);
        }
        {
          const cmd =
            ` ${dockerBuildCmd} peer lifecycle chaincode approveformyorg ` +
            `--orderer ${orderer} ` +
            `--ordererTLSHostnameOverride ${ordererTLSHostnameOverride} ` +
            `--tls ` +
            `--cafile ${caFile} ` +
            `--channelID ${channelId} ` +
            `--name ${ccName} ` +
            `--version ${ccVersion} ` +
            `--package-id ${packageId} ` +
            `--sequence ${ccSequence} ` +
            ` ${signaturePolicyCliArg} ` +
            ` ${collectionsConfigFileCliArg} ` +
            ` ${initRequiredCliArg} ` +
            ` ${connTimeoutCliArg} `;

          const cmdLabel = `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`;

          const res = await this.sshExec(cmd, cmdLabel, ssh, sshCmdOptions);
          lifecycle.approveForMyOrgList.push(res);
        }
      }

      let success = true;
      const commitCmd =
        `${dockerBuildCmd} peer lifecycle chaincode commit ` +
        // ` --ctor '${ctorArgsJson}' ` +
        ` --name ${ccName} ` +
        ` --version ${ccVersion} ` +
        ` --channelID ${channelId} ` +
        ` --orderer ${orderer} ` +
        ` --ordererTLSHostnameOverride ${ordererTLSHostnameOverride} ` +
        ` --tls ` +
        ` --cafile ${caFile} ` +
        ` --peerAddresses ${targetOrganizations[0].CORE_PEER_ADDRESS} ` +
        ` --tlsRootCertFiles ${targetOrganizations[0].CORE_PEER_TLS_ROOTCERT_FILE}` +
        ` --peerAddresses ${targetOrganizations[1].CORE_PEER_ADDRESS} ` +
        ` --tlsRootCertFiles ${targetOrganizations[1].CORE_PEER_TLS_ROOTCERT_FILE}` +
        ` --sequence=${ccSequence} ` +
        ` ${initRequiredCliArg} ` +
        ` ${connTimeoutCliArg} ` +
        ` ${collectionsConfigFileCliArg} ` +
        ` ${signaturePolicyCliArg} `;

      {
        const res = await this.sshExec(commitCmd, "Commit", ssh, sshCmdOptions);
        lifecycle.commit = res;
        success = success && res.code === null;
      }

      {
        const cmd = `${dockerBuildCmdInfoLog} peer lifecycle chaincode querycommitted --channelID=${channelId} --output json`;
        const label = `query committed contracts`;
        const res = await this.sshExec(cmd, label, ssh, sshCmdOptions);
        lifecycle.queryCommitted = res;

        Checks.truthy(res.stdout.includes(ccName), "stdout has contract name");
        const json = res.stdout;
        const qcr = JSON.parse(json) as IQueryCommittedResponse;
        const ccd = qcr.chaincode_definitions.find(
          (ccd) => ccd.name === ccName && ccd.version === ccVersion,
        );

        this.log.debug(`Parsed list of installed contracts: %o`, qcr);
        Checks.truthy(ccd, "No installed chaincode with label: %o", ccLabel);
      }

      log.debug(`EXIT doDeploy()`);
      const res: DeployContractV1Response = {
        success,
        packageIds,
        lifecycle,
      };
      return res;
    } finally {
      try {
        ssh.dispose();
      } finally {
        temp.cleanup();
      }
    }
  }

  /**
   * @param req The object containing all the necessary metadata and parameters
   * in order to have the contract deployed.
   */
  public async deployContractGoSourceV1(
    req: DeployContractGoSourceV1Request,
  ): Promise<DeployContractGoSourceV1Response> {
    const fnTag = `${this.className}#deployContract()`;
    const { log } = this;

    const ssh = new NodeSSH();
    await ssh.connect(this.opts.sshConfig);
    log.debug(`SSH connection OK`);

    try {
      log.debug(`${fnTag} Deploying .go source: ${req.goSource.filename}`);

      Checks.truthy(req.goSource, `${fnTag}:req.goSource`);

      temp.track();
      const tmpDirPrefix = `hyperledger-cactus-${this.className}`;
      const tmpDirPath = temp.mkdirSync(tmpDirPrefix);

      // The module name of the chain-code, for example this will extract
      // ccName to be "hello-world" from a filename of "hello-world.go"
      const inferredModuleName = path.basename(req.goSource.filename, ".go");
      log.debug(`Inferred module name: ${inferredModuleName}`);
      const ccName = req.moduleName || inferredModuleName;
      log.debug(`Determined ChainCode name: ${ccName}`);

      const remoteDirPath = path.join(this.cliContainerGoPath, "src/", ccName);
      log.debug(`Remote dir path on CLI container: ${remoteDirPath}`);

      const localFilePath = path.join(tmpDirPath, req.goSource.filename);
      fs.writeFileSync(localFilePath, req.goSource.body, "base64");

      const remoteFilePath = path.join(remoteDirPath, req.goSource.filename);

      log.debug(`SCP from/to %o => %o`, localFilePath, remoteFilePath);
      await ssh.putFile(localFilePath, remoteFilePath);
      log.debug(`SCP OK %o`, remoteFilePath);

      const sshCmdOptions: SSHExecCommandOptions = {
        execOptions: {
          pty: true,
          env: {
            // just in case go modules would be otherwise disabled
            GO111MODULE: "on",
            FABRIC_LOGGING_SPEC: "DEBUG",
          },
        },
        cwd: remoteDirPath,
      };

      const dockerExecEnv = Object.entries(this.opts.cliContainerEnv)
        .map(([key, value]) => `--env ${key}=${value}`)
        .join(" ");

      const { dockerBinary } = this;
      const dockerBuildCmd =
        `${dockerBinary} exec ` +
        dockerExecEnv +
        ` --env GO111MODULE=on` +
        ` --workdir=${remoteDirPath}` +
        ` cli `;

      await this.sshExec(
        `${dockerBinary} exec cli mkdir -p ${remoteDirPath}/`,
        "Create ChainCode project (go module) directory",
        ssh,
        sshCmdOptions,
      );

      await this.sshExec(
        `${dockerBinary} exec cli go version`,
        "Print go version",
        ssh,
        sshCmdOptions,
      );

      const copyToCliCmd = `${dockerBinary} cp ${remoteFilePath} cli:${remoteFilePath}`;
      log.debug(`Copy to CLI Container CMD: ${copyToCliCmd}`);
      const copyToCliRes = await ssh.execCommand(copyToCliCmd, sshCmdOptions);
      log.debug(`Copy to CLI Container CMD Response: %o`, copyToCliRes);
      Checks.truthy(copyToCliRes.code === null, `copyToCliRes.code === null`);

      {
        const goModInitCmd = `${dockerBuildCmd} go mod init ${ccName}`;
        log.debug(`go mod init CMD: ${goModInitCmd}`);
        const goModInitRes = await ssh.execCommand(goModInitCmd, sshCmdOptions);
        log.debug(`go mod init CMD Response: %o`, goModInitRes);
        Checks.truthy(goModInitRes.code === null, `goModInitRes.code === null`);
      }

      const pinnedDeps = req.pinnedDeps || [];
      for (const dep of pinnedDeps) {
        const goGetCmd = `${dockerBuildCmd} go get ${dep}`;
        log.debug(`go get CMD: ${goGetCmd}`);
        const goGetRes = await ssh.execCommand(goGetCmd, sshCmdOptions);
        log.debug(`go get CMD Response: %o`, goGetRes);
        Checks.truthy(goGetRes.code === null, `goGetRes.code === null`);
      }

      {
        const goModTidyCmd = `${dockerBuildCmd} go mod tidy`;
        log.debug(`go mod tidy CMD: ${goModTidyCmd}`);
        const goModTidyRes = await ssh.execCommand(goModTidyCmd, sshCmdOptions);
        log.debug(`go mod tidy CMD Response: %o`, goModTidyRes);
        Checks.truthy(goModTidyRes.code === null, `goModTidyRes.code === null`);
      }

      {
        const goVendorCmd = `${dockerBuildCmd} go mod vendor`;
        log.debug(`go mod vendor CMD: ${goVendorCmd}`);
        const goVendorRes = await ssh.execCommand(goVendorCmd, sshCmdOptions);
        log.debug(`go mod vendor CMD Response: %o`, goVendorRes);
        Checks.truthy(goVendorRes.code === null, `goVendorRes.code === null`);
      }

      {
        const goBuildCmd = `${dockerBuildCmd} go build`;
        log.debug(`go build CMD: ${goBuildCmd}`);
        const goBuildRes = await ssh.execCommand(goBuildCmd, sshCmdOptions);
        log.debug(`go build CMD Response: %o`, goBuildRes);
        Checks.truthy(goBuildRes.code === null, `goBuildRes.code === null`);
      }

      const installationCommandResponses: SSHExecCommandResponse[] = [];
      // https://github.com/hyperledger/fabric-samples/blob/release-1.4/fabcar/startFabric.sh
      for (const org of req.targetOrganizations) {
        const env =
          ` --env CORE_PEER_LOCALMSPID=${org.CORE_PEER_LOCALMSPID}` +
          ` --env CORE_PEER_ADDRESS=${org.CORE_PEER_ADDRESS}` +
          ` --env CORE_PEER_MSPCONFIGPATH=${org.CORE_PEER_MSPCONFIGPATH}` +
          ` --env CORE_PEER_TLS_ROOTCERT_FILE=${org.CORE_PEER_TLS_ROOTCERT_FILE}`;

        const anInstallationCommandResponse = await this.sshExec(
          dockerBinary +
            ` exec ${env} cli peer chaincode install` +
            ` --name ${ccName} ` +
            ` --path ${ccName} ` +
            ` --version ${req.chainCodeVersion} ` +
            ` --lang golang`,
          `Install ChainCode in ${org.CORE_PEER_LOCALMSPID}`,
          ssh,
          sshCmdOptions,
        );

        installationCommandResponses.push(anInstallationCommandResponse);
      }

      let success = true;

      const ctorArgsJson = JSON.stringify(req.constructorArgs || {});
      const ordererCaFile =
        "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt";

      const instantiateCmd =
        `${dockerBuildCmd} peer chaincode instantiate ` +
        ` --name ${ccName} ` +
        ` --version ${req.chainCodeVersion} ` +
        ` --ctor '${ctorArgsJson}' ` +
        ` --channelID ${req.channelId} ` +
        ` --peerAddresses ${req.targetPeerAddresses[0]} ` +
        ` --lang golang ` +
        ` --tlsRootCertFiles ${req.tlsRootCertFiles}` +
        ` --policy "${req.policyDslSource}"` +
        ` --tls --cafile ${ordererCaFile}`;

      log.debug(`Instantiate CMD: %o`, instantiateCmd);
      const instantiationCommandResponse = await ssh.execCommand(
        instantiateCmd,
        sshCmdOptions,
      );

      log.debug(`Instantiate CMD Response:%o`, instantiationCommandResponse);
      success = success && instantiationCommandResponse.code === null;

      log.debug(`EXIT doDeploy()`);
      const res: DeployContractGoSourceV1Response = {
        success,
        installationCommandResponses,
        instantiationCommandResponse,
      };
      return res;
    } finally {
      try {
        ssh.dispose();
      } finally {
        temp.cleanup();
      }
    }
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    app.use(
      OpenApiValidator.middleware({
        apiSpec: this.getOpenApiSpecs(),
        validateApiSpec: false,
      }),
    );
    app.use(
      (
        err: {
          status?: number;
          errors: [
            {
              path: string;
              message: string;
              errorCode: string;
            },
          ];
        },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        if (err) {
          res.status(err.status || 500);
          res.send(err.errors);
        } else {
          next();
        }
      },
    );

    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];

    {
      const opts: IDeployContractGoSourceEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new DeployContractGoSourceEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IDeployContractEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new DeployContractEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IRunTransactionEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new RunTransactionEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public async transact(
    req: RunTransactionRequest,
  ): Promise<RunTransactionResponse> {
    const fnTag = `${this.className}#transact()`;

    const { connectionProfile, eventHandlerOptions: eho } = this.opts;
    const {
      signingCredential,
      channelName,
      contractName,
      invocationType,
      methodName: fnName,
      params,
      transientData,
      endorsingParties,
    } = req;

    const gateway = new Gateway();
    const wallet = new InMemoryWallet(new X509WalletMixin());
    const keychain = this.opts.pluginRegistry.findOneByKeychainId(
      signingCredential.keychainId,
    );
    this.log.debug(
      "transact() obtained keychain by ID=%o OK",
      signingCredential.keychainId,
    );

    const fabricX509IdentityJson = await keychain.get<string>(
      signingCredential.keychainRef,
    );
    this.log.debug(
      "transact() obtained keychain entry Key=%o OK",
      signingCredential.keychainRef,
    );
    const identity = JSON.parse(fabricX509IdentityJson);

    try {
      await wallet.import(signingCredential.keychainRef, identity);
      this.log.debug("transact() imported identity to in-memory wallet OK");

      const eventHandlerOptions: DefaultEventHandlerOptions = {
        commitTimeout: this.opts.eventHandlerOptions?.commitTimeout || 300,
      };
      if (eho?.strategy) {
        eventHandlerOptions.strategy =
          DefaultEventHandlerStrategies[eho.strategy];
      }

      const gatewayOptions: GatewayOptions = {
        discovery: this.opts.discoveryOptions,
        eventHandlerOptions,
        identity: signingCredential.keychainRef,
        wallet,
      };

      this.log.debug(`discovery=%o`, gatewayOptions.discovery);
      this.log.debug(`eventHandlerOptions=%o`, eventHandlerOptions);
      await gateway.connect(
        connectionProfile as ConnectionProfile,
        gatewayOptions,
      );
      this.log.debug("transact() gateway connection established OK");

      const network = await gateway.getNetwork(channelName);
      const contract = network.getContract(contractName);

      let out: Buffer;
      let success: boolean;
      switch (invocationType) {
        case FabricContractInvocationType.Call: {
          out = await contract.evaluateTransaction(fnName, ...params);
          success = true;
          break;
        }
        case FabricContractInvocationType.Send: {
          out = await contract.submitTransaction(fnName, ...params);
          success = true;
          break;
        }
        case FabricContractInvocationType.Sendprivate: {
          if (!transientData) {
            const message =
              "Set transaction to send Transient Data but it was not provided";
            throw new Error(`${fnTag} ${message}`);
          }

          const transientMap: TransientMap = transientData as TransientMap;

          try {
            //Obtains and parses each component of transient data
            for (const key in transientMap) {
              transientMap[key] = Buffer.from(
                JSON.stringify(transientMap[key]),
              );
            }
          } catch (ex) {
            this.log.error(`Building transient map crashed: `, ex);
            throw new Error(
              `${fnTag} Unable to build the transient map: ${ex.message}`,
            );
          }

          const transactionProposal = await contract.createTransaction(fnName);

          if (endorsingParties) {
            endorsingParties.forEach((org) => {
              transactionProposal.setEndorsingOrganizations(org);
            });
          }

          out = await transactionProposal.setTransient(transientMap).submit();
          success = true;
          break;
        }
        default: {
          const message = `FabricContractInvocationType: ${invocationType}`;
          throw new Error(`${fnTag} unknown ${message}`);
        }
      }
      const outUtf8 = out.toString("utf-8");
      const res: RunTransactionResponse = {
        functionOutput: outUtf8,
        success,
      };
      this.log.debug(`transact() response: %o`, res);
      this.prometheusExporter.addCurrentTransaction();

      return res;
    } catch (ex) {
      this.log.error(`transact() crashed: `, ex);
      throw new Error(`${fnTag} Unable to run transaction: ${ex.message}`);
    }
  }

  /**
   * @param caId The key of the CA in the Fabric connection profile's
   * `certificateAuthorities` attribute.
   * @returns The instantiated `FabricCAServices` object.
   */
  public async createCaClient(caId: string): Promise<FabricCAServices> {
    const fnTag = `${this.className}#createCaClient()`;
    try {
      const ccp = this.opts.connectionProfile;
      if (!ccp.certificateAuthorities) {
        throw new Error(`${fnTag} conn. profile certificateAuthorities falsy.`);
      }
      const caInfo = ccp.certificateAuthorities[caId] as Record<string, any>;
      const { tlsCACerts, url: caUrl, caName } = caInfo;
      const { pem: caTLSCACertPem } = tlsCACerts;
      const tlsOptions = { trustedRoots: caTLSCACertPem, verify: false };
      this.log.debug(`createCaClient() caName=%o caUrl=%o`, caName, caUrl);
      this.log.debug(`createCaClient() tlsOptions=%o`, tlsOptions);
      return new FabricCAServices(caUrl, tlsOptions, caName);
    } catch (ex) {
      this.log.error(`createCaClient() Failure:`, ex);
      throw new Error(`${fnTag} Inner Exception: ${ex?.message}`);
    }
  }

  public async enrollAdmin(
    caId: string,
    identityId: string,
    mspId: string,
    enrollmentID: string,
    enrollmentSecret: string,
  ): Promise<[Identity, InMemoryWallet]> {
    const fnTag = `${this.className}#enrollAdmin()`;
    try {
      const ca = await this.createCaClient(caId);
      const wallet = new InMemoryWallet(new X509WalletMixin());

      // Enroll the admin user, and import the new identity into the wallet.
      const request = { enrollmentID, enrollmentSecret };
      const enrollment = await ca.enroll(request);

      const { certificate: cert, key } = enrollment;
      const keyBytes = key.toBytes();

      const identity = X509WalletMixin.createIdentity(mspId, cert, keyBytes);
      await wallet.import(identityId, identity);

      return [identity, wallet];
    } catch (ex) {
      this.log.error(`enrollAdmin() Failure:`, ex);
      throw new Error(`${fnTag} Exception: ${ex?.message}`);
    }
  }
}
