import { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import {
  AuthorizationOptionsProvider,
  registerWebServiceEndpoint,
} from "@hyperledger/cactus-core";

import {
  DefaultApi as QuorumApi,
  EthContractInvocationType,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";

import { InsertBambooHarvestEndpoint as Constants } from "./insert-bamboo-harvest-endpoint-constants";
import { InsertBambooHarvestRequest } from "../../generated/openapi/typescript-axios";

export interface IInsertBambooHarvestEndpointOptions {
  logLevel?: LogLevelDesc;
  contractName: string;
  //  contractAbi: any;
  apiClient: QuorumApi;
  web3SigningCredential: Web3SigningCredential;
  keychainId: string;
  authorizationOptionsProvider?: AuthorizationOptionsProvider;
}

const K_DEFAULT_AUTHORIZATION_OPTIONS: IEndpointAuthzOptions = {
  isProtected: true,
  requiredRoles: [],
};

export class InsertBambooHarvestEndpoint implements IWebServiceEndpoint {
  public static readonly HTTP_PATH = Constants.HTTP_PATH;

  public static readonly HTTP_VERB_LOWER_CASE = Constants.HTTP_VERB_LOWER_CASE;

  public static readonly OPENAPI_OPERATION_ID = Constants.OPENAPI_OPERATION_ID;

  public static readonly CLASS_NAME = "InsertBambooHarvestEndpoint";

  private readonly log: Logger;
  private readonly authorizationOptionsProvider: AuthorizationOptionsProvider;

  public get className(): string {
    return InsertBambooHarvestEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IInsertBambooHarvestEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.apiClient, `${fnTag} options.apiClient`);
    // Checks.truthy(opts.contractAddress, `${fnTag} options.contractAddress`);
    // Checks.truthy(opts.contractAbi, `${fnTag} options.contractAbi`);
    Checks.nonBlankString(
      opts.contractName,
      `${fnTag} options.contractAddress`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.authorizationOptionsProvider =
      opts.authorizationOptionsProvider ||
      AuthorizationOptionsProvider.of(K_DEFAULT_AUTHORIZATION_OPTIONS, level);

    this.log.debug(`Instantiated ${this.className} OK`);
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    return this.authorizationOptionsProvider;
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    return InsertBambooHarvestEndpoint.HTTP_VERB_LOWER_CASE;
  }

  public getPath(): string {
    return InsertBambooHarvestEndpoint.HTTP_PATH;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      const { bambooHarvest } = req.body as InsertBambooHarvestRequest;
      this.log.debug(`${tag} %o`, bambooHarvest);

      const {
        data: { success, callOutput, transactionReceipt },
      } = await this.opts.apiClient.invokeContractV1({
        contractName: this.opts.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "insertRecord",
        gas: 1000000,
        params: [bambooHarvest],
        signingCredential: this.opts.web3SigningCredential,
        keychainId: this.opts.keychainId,
      });

      const body = { success, callOutput, transactionReceipt };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
