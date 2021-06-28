import { Server } from "http";
import { Server as SecureServer } from "https";

import { Optional } from "typescript-optional";
import { Express } from "express";
import { v4 as uuidv4 } from "uuid";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  ICactusPlugin,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  DefaultApi as XdaiApi,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-xdai";

import {
  DefaultApi as FabricApi,
  PluginLedgerConnectorFabric,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import {
  ICarbonAccountingFabricContractDeploymentInfo,
  ICarbonAccountingXdaiContractDeploymentInfo,
} from "../i-carbon-accounting-contract-deployment-info";

import { GetAllowanceEndpoint } from "./web-services/dao-token/get-allowance-endpoint";

import {
  EnrollAdminInfo,
  EnrollAdminV1Request,
  EnrollAdminV1Response,
} from "../generated/openapi/typescript-axios";
import { EnrollAdminV1Endpoint } from "./web-services/utility-emissions-channel/enroll-admin-v1-endpoint";

export interface OrgEnv {
  CORE_PEER_LOCALMSPID: string;
  CORE_PEER_ADDRESS: string;
  CORE_PEER_MSPCONFIGPATH: string;
  CORE_PEER_TLS_ROOTCERT_FILE: string;
  ORDERER_TLS_ROOTCERT_FILE: string;
}

export interface ICarbonAccountingPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  keychainId: string;
  pluginRegistry: PluginRegistry;
  xdaiApiClient: XdaiApi;
  fabricApiClient: FabricApi;
  fabricPlugin: PluginLedgerConnectorFabric;
  web3SigningCredential?: Web3SigningCredential;
  fabricEnvironment?: NodeJS.ProcessEnv;
  fabricContracts: ICarbonAccountingFabricContractDeploymentInfo;
  xdaiContracts: ICarbonAccountingXdaiContractDeploymentInfo;
}

export class CarbonAccountingPlugin
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "CarbonAccountingPlugin";

  private readonly log: Logger;
  private readonly instanceId: string;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return CarbonAccountingPlugin.CLASS_NAME;
  }

  public get keychain(): PluginKeychainMemory {
    const { keychainId, pluginRegistry } = this.options;
    return pluginRegistry.findOneByKeychainId(keychainId);
  }

  constructor(public readonly options: ICarbonAccountingPluginOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.fabricContracts, `${fnTag} arg options.contracts`);
    Checks.truthy(options.fabricPlugin, `${fnTag} arg options.fabricPlugin`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const getAllowanceEp = new GetAllowanceEndpoint({
      plugin: this,
      logLevel: this.options.logLevel,
    });

    const enrollAdminEp = new EnrollAdminV1Endpoint({
      plugin: this,
      logLevel: this.options.logLevel,
    });

    const theEndpoints = [getAllowanceEp, enrollAdminEp];
    this.endpoints = theEndpoints;
    return theEndpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down ${this.className}...`);
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-example-carbon-accounting-backend";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public async enrollAdminV1(
    req: EnrollAdminV1Request,
  ): Promise<EnrollAdminV1Response> {
    const { fabricPlugin } = this.options;

    const caId = "ca.org1.example.com";
    const enrollmentID = "admin";
    const enrollmentSecret = "adminpw";
    const mspId = "Org1MSP";
    const identityId = "fabric_admin_identity_" + uuidv4();

    const [identity] = await fabricPlugin.enrollAdmin(
      caId,
      identityId,
      mspId,
      enrollmentID,
      enrollmentSecret,
    );

    this.keychain.set(identityId, identity);
    this.log.debug(`Stored Fabric admin identity on keychain as ${identityId}`);

    const res: EnrollAdminV1Response = {
      caName: caId,
      info: EnrollAdminInfo.ORG_ADMIN_REGISTERED,
      msp: mspId,
      orgName: req.orgName,
    };
    return res;
  }
}
