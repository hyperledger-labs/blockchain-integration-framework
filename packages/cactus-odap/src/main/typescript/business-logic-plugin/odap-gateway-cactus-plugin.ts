import type { Server } from "http";
import type { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { Express } from "express";
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
import { DefaultApi as OdapGatewayApi } from "../generated/openapi/typescript-axios/api";
import { OdapGateway } from "../gateway/odap-gateway";
import { CommitFinalEndpoint } from "../web-services/commit-final-endpoint";
import { CommitPrepareEndpoint } from "../web-services/commite-prepare-endpoint";
import { LockEvidenceEndpoint } from "../web-services/lock-evidence-endpoint";
import { LockEvidencePrepareEndpoint } from "../web-services/lock-evidence-transfer-commence-endpoint";
import { TransferCompleteEndpoint } from "../web-services/transfer-complete";
import { TransferInitiationEndpoint } from "../web-services/transfer-initiation-endpoint";

export interface OrgEnv {
  CORE_PEER_LOCALMSPID: string;
  CORE_PEER_ADDRESS: string;
  CORE_PEER_MSPCONFIGPATH: string;
  CORE_PEER_TLS_ROOTCERT_FILE: string;
  ORDERER_TLS_ROOTCERT_FILE: string;
}

export interface IOdapGateWayCactusPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  odapGateWayApiClient: OdapGatewayApi;
}

export class OdapGateWayCactusPlugin
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "OdapGateWayCactusPlugin";

  private readonly log: Logger;
  private readonly instanceId: string;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return OdapGateWayCactusPlugin.CLASS_NAME;
  }

  constructor(public readonly options: IOdapGateWayCactusPluginOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.odapGateWayApiClient,
      `${fnTag} arg options.odapGateWayApiClient`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = options.instanceId;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const odapGateWay = new OdapGateway("cactus-plugin#odapGateway");
    const transferinitiation = new TransferInitiationEndpoint({
      gateway: odapGateWay,
    });
    const lockEvidencePreparation = new LockEvidencePrepareEndpoint({
      gateway: odapGateWay,
    });
    const lockEvidence = new LockEvidenceEndpoint({ gateway: odapGateWay });
    const commitPreparation = new CommitPrepareEndpoint({
      gateway: odapGateWay,
    });
    const commitFinal = new CommitFinalEndpoint({ gateway: odapGateWay });
    const transferComplete = new TransferCompleteEndpoint({
      gateway: odapGateWay,
    });

    this.endpoints = [
      transferinitiation,
      lockEvidencePreparation,
      lockEvidence,
      commitPreparation,
      commitFinal,
      transferComplete,
    ];
    return this.endpoints;
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
    return "@hyperledger/cactus-odap-odap-gateway-business-logic-plugin";
  }
}
