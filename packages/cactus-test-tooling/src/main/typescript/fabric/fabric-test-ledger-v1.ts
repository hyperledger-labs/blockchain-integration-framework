import { EventEmitter } from "events";

import compareVersions from "compare-versions";

import Docker, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
} from "dockerode";
import { Config as SshConfig } from "node-ssh";
import {
  X509WalletMixin,
  InMemoryWallet,
  Identity,
  Gateway,
} from "fabric-network";
import FabricCAServices from "fabric-ca-client";
import Joi from "joi";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";
import {
  Checks,
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Bools,
} from "@hyperledger/cactus-common";

/*
 * Contains options for Fabric container
 */
export interface IFabricTestLedgerV1ConstructorOptions {
  publishAllPorts: boolean;
  imageVersion?: string;
  imageName?: string;
  envVars?: Map<string, string>;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
}

/*
 * Provides default options for Fabric container
 */
const DEFAULT_OPTS = Object.freeze({
  imageVersion: "2021-01-05-3400c06",
  imageName: "ghcr.io/hyperledger/cactus-fabric-all-in-one",
  envVars: new Map([["FABRIC_VERSION", "1.4.8"]]),
});
export const FABRIC_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULT_OPTS;

/*
 * Provides validations for the Fabric container's options
 */
const OPTS_JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  publishAllPorts: Joi.boolean().required(),
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string()
    .regex(/[a-z0-9]+(?:[._-]{1,2}[a-z0-9]+)*/)
    .min(1)
    .required(),
  envVars: Joi.object().pattern(/.*/, [
    Joi.string().required(),
    Joi.string().min(1).required(),
  ]),
});

export const FABRIC_TEST_LEDGER_OPTIONS_JOI_SCHEMA = OPTS_JOI_SCHEMA;

export class FabricTestLedgerV1 implements ITestLedger {
  public static readonly CLASS_NAME = "FabricTestLedgerV1";

  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly publishAllPorts: boolean;
  public readonly emitContainerLogs: boolean;
  public readonly envVars: Map<string, string>;

  private readonly log: Logger;

  private container: Container | undefined;
  private containerId: string | undefined;

  public get className(): string {
    return FabricTestLedgerV1.CLASS_NAME;
  }

  constructor(public readonly options: IFabricTestLedgerV1ConstructorOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.imageVersion = options.imageVersion || DEFAULT_OPTS.imageVersion;
    this.imageName = options.imageName || DEFAULT_OPTS.imageName;
    this.publishAllPorts = options.publishAllPorts;
    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;
    this.envVars = options.envVars || DEFAULT_OPTS.envVars;

    if (compareVersions.compare(this.getFabricVersion(), "1.4", "<"))
      this.log.warn(
        `This version of Fabric ${this.getFabricVersion()} is unsupported`,
      );

    this.validateConstructorOptions();
  }

  public getContainer(): Container {
    const fnTag = "FabricTestLedgerV1#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public getFabricVersion(): string {
    return `${this.envVars.get("FABRIC_VERSION")}`;
  }

  public getDefaultMspId(): string {
    return "Org1MSP";
  }

  public async createCaClient(): Promise<FabricCAServices> {
    const fnTag = `${this.className}#createCaClient()`;
    try {
      const ccp = await this.getConnectionProfileOrg1();
      const caInfo = ccp.certificateAuthorities["ca.org1.example.com"];
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

  public async enrollUser(wallet: InMemoryWallet): Promise<any> {
    const fnTag = `${this.className}#enrollUser()`;
    try {
      const mspId = this.getDefaultMspId();
      const enrollmentID = "user2";
      const connectionProfile = await this.getConnectionProfileOrg1();
      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      const discovery = { enabled: true, asLocalhost: true };
      const gatewayOptions = {
        wallet,
        identity: "admin",
        discovery,
      };
      await gateway.connect(connectionProfile, gatewayOptions);

      // Get the CA client object from the gateway for interacting with the CA.
      // const ca = gateway.getClient().getCertificateAuthority();
      const ca = await this.createCaClient();
      const adminIdentity = gateway.getCurrentIdentity();

      // Register the user, enroll the user, and import the new identity into the wallet.
      const registrationRequest = {
        affiliation: "org1.department1",
        enrollmentID,
        role: "client",
      };
      const secret = await ca.register(registrationRequest, adminIdentity);
      this.log.debug(`Registered client user "${enrollmentID}" OK`);

      const enrollmentRequest = { enrollmentID, enrollmentSecret: secret };
      const enrollment = await ca.enroll(enrollmentRequest);
      this.log.debug(`Enrolled client user "${enrollmentID}" OK`);

      const { certificate: cert, key } = enrollment;
      const keyBytes = key.toBytes();

      const identity = X509WalletMixin.createIdentity(mspId, cert, keyBytes);

      await wallet.import(enrollmentID, identity);
      this.log.debug(`Wallet import of "${enrollmentID}" OK`);

      return [identity, wallet];
    } catch (ex) {
      this.log.error(`enrollUser() Failure:`, ex);
      throw new Error(`${fnTag} Exception: ${ex?.message}`);
    }
  }

  public async enrollAdmin(): Promise<[Identity, InMemoryWallet]> {
    const fnTag = `${this.className}#enrollAdmin()`;
    try {
      const ca = await this.createCaClient();
      const wallet = new InMemoryWallet(new X509WalletMixin());

      // Enroll the admin user, and import the new identity into the wallet.
      const request = { enrollmentID: "admin", enrollmentSecret: "adminpw" };
      const enrollment = await ca.enroll(request);

      const mspId = this.getDefaultMspId();
      const { certificate: cert, key } = enrollment;
      const keyBytes = key.toBytes();

      const identity = X509WalletMixin.createIdentity(mspId, cert, keyBytes);
      await wallet.import("admin", identity);

      return [identity, wallet];
    } catch (ex) {
      this.log.error(`enrollAdmin() Failure:`, ex);
      throw new Error(`${fnTag} Exception: ${ex?.message}`);
    }
  }

  public async getConnectionProfileOrg1(): Promise<any> {
    const cInfo = await this.getContainerInfo();
    const container = this.getContainer();
    const CCP_JSON_PATH_FABRIC_V1 =
      "/fabric-samples/first-network/connection-org1.json";
    const CCP_JSON_PATH_FABRIC_V2 =
      "/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json";
    const ccpJsonPath = compareVersions.compare(
      this.getFabricVersion(),
      "2.0",
      "<",
    )
      ? CCP_JSON_PATH_FABRIC_V1
      : CCP_JSON_PATH_FABRIC_V2;
    const ccpJson = await Containers.pullFile(container, ccpJsonPath);
    const ccp = JSON.parse(ccpJson);

    {
      // peer0.org1.example.com
      const privatePort = 7051;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      ccp.peers["peer0.org1.example.com"].url = `grpcs://localhost:${hostPort}`;
    }
    if (ccp.peers["peer1.org1.example.com"]) {
      // peer1.org1.example.com
      const privatePort = 8051;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      ccp.peers["peer1.org1.example.com"].url = `grpcs://localhost:${hostPort}`;
    }
    {
      // ca_peerOrg1
      const privatePort = 7054;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      const { certificateAuthorities: cas } = ccp;
      cas["ca.org1.example.com"].url = `https://localhost:${hostPort}`;
    }

    // FIXME - this still doesn't work. At this moment the only successful tests
    // we could run was with host ports bound to the matching ports of the internal
    // containers and with discovery enabled.
    // When discovery is disabled, it just doesn't yet work and these changes
    // below are my attempts so far at making the connection profile work without
    // discovery being turned on (which we cannot use when the ports are randomized
    // on the host for the parent container)
    if (this.publishAllPorts) {
      // orderer.example.com

      const privatePort = 7050;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      const url = `grpcs://localhost:${hostPort}`;
      const ORDERER_PEM_PATH_FABRIC_V1 =
        "/fabric-samples/first-network/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem";
      const ORDERER_PEM_PATH_FABRIC_V2 =
        "/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem";
      const ordererPemPath = compareVersions.compare(
        this.getFabricVersion(),
        "2.0",
        "<",
      )
        ? ORDERER_PEM_PATH_FABRIC_V1
        : ORDERER_PEM_PATH_FABRIC_V2;
      const pem = await Containers.pullFile(container, ordererPemPath);

      ccp.orderers = {
        "orderer.example.com": {
          url,
          grpcOptions: {
            "ssl-target-name-override": "orderer.example.com",
          },
          tlsCACerts: {
            pem,
          },
        },
      };

      ccp.channels = {
        mychannel: {
          orderers: ["orderer.example.com"],
          peers: {
            "peer0.org1.example.com": {
              endorsingPeer: true,
              chaincodeQuery: true,
              ledgerQuery: true,
              eventSource: true,
              discover: true,
            },
          },
        },
      };

      // FIXME: Still have no idea if we can use these options to make it work
      // with discovery
      // {
      //   const { grpcOptions } = ccp.peers["peer0.org1.example.com"];
      //   grpcOptions.hostnameOverride = `localhost`;
      // }
      // {
      //   const { grpcOptions } = ccp.peers["peer1.org1.example.com"];
      //   grpcOptions.hostnameOverride = `localhost`;
      // }
    }
    return ccp;
  }

  public async getSshConfig(): Promise<SshConfig> {
    const fnTag = "FabricTestLedger#getSshConnectionOptions()";
    if (!this.container) {
      throw new Error(`${fnTag} - invalid state no container instance set`);
    }
    const filePath = "/etc/hyperledger/cactus/fabric-aio-image.key";
    const privateKey = await Containers.pullFile(this.container, filePath);
    const containerInfo = await this.getContainerInfo();
    const port = await Containers.getPublicPort(22, containerInfo);
    const sshConfig: SshConfig = {
      host: "localhost",
      privateKey,
      username: "root",
      port,
    };
    return sshConfig;
  }

  public async start(omitPull = false): Promise<Container> {
    const containerNameAndTag = this.getContainerImageName();
    const dockerEnvVars: string[] = new Array(...this.envVars).map(
      (pairs) => `${pairs[0]}=${pairs[1]}`,
    );

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (!omitPull) {
      await Containers.pullImage(containerNameAndTag);
    }

    const createOptions: ContainerCreateOptions = {
      ExposedPorts: {
        "22/tcp": {}, // OpenSSH Server - TCP
        "5984/tcp": {}, // couchdb0
        "6984/tcp": {}, // couchdb1
        "7050/tcp": {}, // orderer.example.com
        "7051/tcp": {}, // peer0.org1.example.com
        "7054/tcp": {}, // ca_peerOrg1
        "7984/tcp": {}, // couchdb2
        "8051/tcp": {}, // peer1.org1.example.com
        "8054/tcp": {}, // ca_peerOrg2
        "8984/tcp": {}, // couchdb3
        "9001/tcp": {}, // supervisord web ui/dashboard
        "9051/tcp": {}, // peer0.org2.example.com
        "10051/tcp": {}, // peer1.org2.example.com
      },

      Env: dockerEnvVars,

      // This is a workaround needed for macOS which has issues with routing
      // to docker container's IP addresses directly...
      // https://stackoverflow.com/a/39217691

      // needed for Docker-in-Docker support
      // Privileged: true,
      HostConfig: {
        PublishAllPorts: this.publishAllPorts,
        Privileged: true,
        PortBindings: {
          "22/tcp": [{ HostPort: "30022" }],
          "7050/tcp": [{ HostPort: "7050" }],
          "7051/tcp": [{ HostPort: "7051" }],
          "7054/tcp": [{ HostPort: "7054" }],
          "8051/tcp": [{ HostPort: "8051" }],
          "8054/tcp": [{ HostPort: "8054" }],
          "9051/tcp": [{ HostPort: "9051" }],
          "10051/tcp": [{ HostPort: "10051" }],
        },
      },
    };

    // (createOptions as any).PortBindings = {
    //   "22/tcp": [{ HostPort: "30022" }],
    //   "7050/tcp": [{ HostPort: "7050" }],
    //   "7051/tcp": [{ HostPort: "7051" }],
    //   "7054/tcp": [{ HostPort: "7054" }],
    //   "8051/tcp": [{ HostPort: "8051" }],
    //   "8054/tcp": [{ HostPort: "8054" }],
    //   "9051/tcp": [{ HostPort: "9051" }],
    //   "10051/tcp": [{ HostPort: "10051" }],
    // };

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        containerNameAndTag,
        [],
        [],
        createOptions,
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            const fnTag = `[${this.getContainerImageName()}]`;
            this.log.debug(`${fnTag} %o`, data.toString("utf-8"));
          });
        }

        try {
          await this.waitForHealthCheck();
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "FabricTestLedgerV1#waitForHealthCheck()";
    const startedAt = Date.now();
    let reachable = false;
    do {
      try {
        const { Status } = await this.getContainerInfo();
        reachable = Status.endsWith(" (healthy)");
      } catch (ex) {
        reachable = false;
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 1000));
    } while (!reachable);
  }

  public stop(): Promise<any> {
    return Containers.stop(this.container as Container);
  }

  public async destroy(): Promise<any> {
    const fnTag = "FabricTestLedgerV1#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      throw new Error(`${fnTag} Containernot found, nothing to destroy.`);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = "FabricTestLedgerV1#getContainerInfo()";
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image "${image}"`);
    }
  }

  public async getContainerIpAddress(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getContainerInternalIp(containerInfo);
  }

  private validateConstructorOptions(): void {
    const fnTag = "FabricTestLedgerV1#validateConstructorOptions()";
    const result = Joi.validate<IFabricTestLedgerV1ConstructorOptions>(
      {
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        publishAllPorts: this.publishAllPorts,
        envVars: this.envVars,
      },
      OPTS_JOI_SCHEMA,
    );

    if (result.error) {
      throw new Error(`${fnTag} ${result.error.annotate()}`);
    }
  }
}
