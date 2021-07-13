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
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import {
  DefaultApi as BesuApi,
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { ListBookshelfEndpoint as Constants } from "./list-bookshelf-endpoint-constants";
import { BookshelfConverter } from "../../model/converter/bookshelf-converter";

export interface IListBookshelfEndpointOptions {
  logLevel?: LogLevelDesc;
  contractName: string;
  // contractAddress: string;
  //  contractAbi: any;
  besuApi: BesuApi;
  keychainId: string;
}

export class ListBookshelfEndpoint implements IWebServiceEndpoint {
  public static readonly HTTP_PATH = Constants.HTTP_PATH;

  public static readonly HTTP_VERB_LOWER_CASE = Constants.HTTP_VERB_LOWER_CASE;

  public static readonly OPENAPI_OPERATION_ID = Constants.OPENAPI_OPERATION_ID;

  public static readonly CLASS_NAME = "ListBookshelfEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return ListBookshelfEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IListBookshelfEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.besuApi, `${fnTag} options.besuApi`);
    // Checks.truthy(opts.contractAddress, `${fnTag} options.contractAddress`);
    // Checks.truthy(opts.contractAbi, `${fnTag} options.contractAbi`);
    Checks.nonBlankString(opts.contractName, `${fnTag} options.contractName`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  getAuthorizationOptionsProvider(): IAsyncProvider<IEndpointAuthzOptions> {
    // TODO: make this an injectable dependency in the constructor
    return {
      get: async () => ({
        isProtected: true,
        requiredRoles: [],
      }),
    };
  }

  public async registerExpress(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint> {
    await registerWebServiceEndpoint(expressApp, this);
    return this;
  }

  public getVerbLowerCase(): string {
    return ListBookshelfEndpoint.HTTP_VERB_LOWER_CASE;
  }

  public getPath(): string {
    return ListBookshelfEndpoint.HTTP_PATH;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      this.log.debug(`${tag}`);

      const { data } = await this.opts.besuApi.invokeContractV1({
        contractName: this.opts.contractName,
        invocationType: EthContractInvocationType.Call,
        methodName: "getAllRecords",
        gas: 1000000,
        params: [],
        signingCredential: {
          type: Web3SigningCredentialType.None,
        },
        keychainId: this.opts.keychainId,
      });
      const { callOutput } = data;

      const rows = BookshelfConverter.ofSolidityStructList(callOutput);
      this.log.debug(`apiV1BesuInvokeContract() => %o`, data);

      const body = { data: rows };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
