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
import {
  DefaultApi as QuorumApi,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import { DefaultApi as BesuApi } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { InsertBambooHarvestEndpoint } from "./web-services/insert-bamboo-harvest-endpoint";
import { DefaultApi as FabricApi } from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import { ListBambooHarvestEndpoint } from "./web-services/list-bamboo-harvest-endpoint";
import { ISupplyChainContractDeploymentInfo } from "../i-supply-chain-contract-deployment-info";
import { InsertBookshelfEndpoint } from "./web-services/insert-bookshelf-endpoint";
import { ListBookshelfEndpoint } from "./web-services/list-bookshelf-endpoint";
import { InsertShipmentEndpoint } from "./web-services/insert-shipment-endpoint";
import { ListShipmentEndpoint } from "./web-services/list-shipment-endpoint";

export interface OrgEnv {
  CORE_PEER_LOCALMSPID: string;
  CORE_PEER_ADDRESS: string;
  CORE_PEER_MSPCONFIGPATH: string;
  CORE_PEER_TLS_ROOTCERT_FILE: string;
  ORDERER_TLS_ROOTCERT_FILE: string;
}

export interface ISupplyChainCactusPluginOptions {
  logLevel?: LogLevelDesc;
  instanceId: string;
  quorumApiClient: QuorumApi;
  besuApiClient: BesuApi;
  fabricApiClient: FabricApi;
  web3SigningCredential?: Web3SigningCredential;
  fabricEnvironment?: NodeJS.ProcessEnv;
  contracts: ISupplyChainContractDeploymentInfo;
}

export class SupplyChainCactusPlugin
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "SupplyChainCactusPlugin";

  private readonly log: Logger;
  private readonly instanceId: string;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return SupplyChainCactusPlugin.CLASS_NAME;
  }

  constructor(public readonly options: ISupplyChainCactusPluginOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.instanceId, `${fnTag} arg options.instanceId`);
    Checks.nonBlankString(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(options.contracts, `${fnTag} arg options.contracts`);
    Checks.truthy(
      options.quorumApiClient,
      `${fnTag} arg options.quorumApiClient`,
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
    const insertBambooHarvest = new InsertBambooHarvestEndpoint({
      // contractAddress: this.options.contracts.bambooHarvestRepository.address,
      // contractAbi: this.options.contracts.bambooHarvestRepository.abi,
      contractName: this.options.contracts.bambooHarvestRepository.contractName,
      apiClient: this.options.quorumApiClient,
      web3SigningCredential: this.options
        .web3SigningCredential as Web3SigningCredential,
      logLevel: this.options.logLevel,
      keychainId: this.options.contracts.bambooHarvestRepository.keychainId,
    });

    const listBambooHarvest = new ListBambooHarvestEndpoint({
      // contractAddress: this.options.contracts.bambooHarvestRepository.address,
      // contractAbi: this.options.contracts.bambooHarvestRepository.abi,
      contractName: this.options.contracts.bambooHarvestRepository.contractName,
      apiClient: this.options.quorumApiClient,
      logLevel: this.options.logLevel,
      keychainId: this.options.contracts.bambooHarvestRepository.keychainId,
    });

    const insertBookshelf = new InsertBookshelfEndpoint({
      contractName: this.options.contracts.bookshelfRepository.contractName,
      besuApi: this.options.besuApiClient,
      web3SigningCredential: this.options
        .web3SigningCredential as Web3SigningCredential,
      logLevel: this.options.logLevel,
      keychainId: this.options.contracts.bookshelfRepository.keychainId,
    });

    const listBookshelf = new ListBookshelfEndpoint({
      contractName: this.options.contracts.bookshelfRepository.contractName,
      besuApi: this.options.besuApiClient,
      logLevel: this.options.logLevel,
      keychainId: this.options.contracts.bookshelfRepository.keychainId,
    });

    const insertShipment = new InsertShipmentEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      keychainId: this.options.contracts.bookshelfRepository.keychainId,
    });

    const listShipment = new ListShipmentEndpoint({
      logLevel: this.options.logLevel,
      fabricApi: this.options.fabricApiClient,
      keychainId: this.options.contracts.bookshelfRepository.keychainId,
    });

    this.endpoints = [
      insertBambooHarvest,
      listBambooHarvest,
      insertBookshelf,
      listBookshelf,
      insertShipment,
      listShipment,
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
    return "@hyperledger/cactus-example-supply-chain-backend";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }
}
