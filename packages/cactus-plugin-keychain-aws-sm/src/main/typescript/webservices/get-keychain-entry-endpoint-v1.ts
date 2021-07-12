import type { Express } from "express";

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

import OAS from "../../json/openapi.json";

export interface IGetKeychainEntryEndpointV1Options {
  logLevel?: LogLevelDesc;
}

export class GetKeychainEntryEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetKeychainEntryEndpointV1";

  private readonly log: Logger;

  public get className(): string {
    return GetKeychainEntryEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IGetKeychainEntryEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  private getOperation() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-keychain-aws-sm/get-keychain-entry"
    ].post;
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
    return this.getOperation()["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    return this.getOperation()["x-hyperledger-cactus"].http.path;
  }

  public getExpressRequestHandler(): IExpressRequestHandler {
    throw new Error("Method not implemented.");
  }
}
