import type { Express, Request, Response } from "express";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import {
  RemoveObjectRequestV1,
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IPluginObjectStore,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { K_IPFS_JS_HTTP_ERROR_404 } from "../plugin-object-store-ipfs";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import OAS from "../../json/openapi.json";
import { RuntimeError } from "run-time-error";

export interface IRemoveObjectEndpointV1Options {
  readonly logLevel?: LogLevelDesc;
  readonly plugin: IPluginObjectStore;
}

export class RemoveObjectEndpointV1 implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "RemoveObjectEndpointV1";

  private readonly log: Logger;
  private readonly plugin: IPluginObjectStore;

  public get className(): string {
    return RemoveObjectEndpointV1.CLASS_NAME;
  }

  constructor(public readonly options: IRemoveObjectEndpointV1Options) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.plugin, `${fnTag} arg options.plugin`);

    this.plugin = options.plugin;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  private getOperation() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-object-store-ipfs/remove-object"
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
    return this.handleRequest.bind(this);
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const tag = `${this.getVerbLowerCase().toUpperCase()} ${this.getPath()}`;
    try {
      const reqBody = req.body as RemoveObjectRequestV1;
      this.log.debug(`${tag} %o`, reqBody);
      const resBody = await this.plugin.remove(reqBody);
      res.status(200);
      res.json(resBody);
    } catch (ex) {
      if (ex instanceof RuntimeError) {
        if (ex.cause == K_IPFS_JS_HTTP_ERROR_404) {
          this.log.debug(
            "404 Error thrown as file does not exist on object store",
            ex,
          );
          res.status(404);
          res.send("Error thrown as file does not exist on object store");
          return;
        }
      }
      this.log.error(`${tag} Failed to serve request:`, ex);
      res.status(500);
      res.json({ error: ex.stack });
    }
  }
}
