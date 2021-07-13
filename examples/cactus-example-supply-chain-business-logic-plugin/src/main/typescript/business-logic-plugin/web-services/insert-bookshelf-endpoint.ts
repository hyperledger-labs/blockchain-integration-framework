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
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

import { InsertBookshelfEndpoint as Constants } from "./insert-bookshelf-endpoint-constants";
import { InsertBookshelfRequest } from "../../generated/openapi/typescript-axios/index";

export interface IInsertBookshelfEndpointOptions {
  logLevel?: LogLevelDesc;
  //  contractAddress: string;
  //  contractAbi: any;
  contractName: string;
  besuApi: BesuApi;
  web3SigningCredential: Web3SigningCredential;
  keychainId: string;
}

export class InsertBookshelfEndpoint implements IWebServiceEndpoint {
  public static readonly HTTP_PATH = Constants.HTTP_PATH;

  public static readonly HTTP_VERB_LOWER_CASE = Constants.HTTP_VERB_LOWER_CASE;

  public static readonly OPENAPI_OPERATION_ID = Constants.OPENAPI_OPERATION_ID;

  public static readonly CLASS_NAME = "InsertBookshelfEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return InsertBookshelfEndpoint.CLASS_NAME;
  }

  constructor(public readonly opts: IInsertBookshelfEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.besuApi, `${fnTag} options.besuApi`);
    // Checks.truthy(opts.contractAddress, `${fnTag} options.contractAddress`);
    // Checks.truthy(opts.contractAbi, `${fnTag} options.contractAbi`);
    Checks.nonBlankString(
      opts.contractName,
      `${fnTag} options.contractAddress`,
    );

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
    return InsertBookshelfEndpoint.HTTP_VERB_LOWER_CASE;
  }

  public getPath(): string {
    return InsertBookshelfEndpoint.HTTP_PATH;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      const { bookshelf } = req.body as InsertBookshelfRequest;
      this.log.debug(`${tag} %o`, bookshelf);

      const {
        data: { callOutput, transactionReceipt },
      } = await this.opts.besuApi.invokeContractV1({
        contractName: this.opts.contractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "insertRecord",
        gas: 1000000,
        params: [bookshelf],
        signingCredential: this.opts.web3SigningCredential,
        keychainId: this.opts.keychainId,
      });

      const body = { callOutput, transactionReceipt };
      res.status(200);
      res.json(body);
    } catch (ex) {
      this.log.debug(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
