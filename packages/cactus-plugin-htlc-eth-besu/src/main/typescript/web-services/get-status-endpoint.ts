import { Express, Request, Response } from "express";
import {
  Checks,
  IAsyncProvider,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  IEndpointAuthzOptions,
  IExpressRequestHandler,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";
import OAS from "../../json/openapi.json";
import { PluginHtlcEthBesu } from "../plugin-htlc-eth-besu";
export interface IGetStatusEndpointOptions {
  logLevel?: LogLevelDesc;
  plugin: PluginHtlcEthBesu;
}
export class GetStatusEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "GetStatusEndpoint";
  private readonly log: Logger;

  constructor(public readonly options: IGetStatusEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  public get className(): string {
    return GetStatusEndpoint.CLASS_NAME;
  }

  public getOASPath() {
    return OAS.paths[
      "/api/v1/plugins/@hyperledger/cactus-plugin-htlc-eth-besu/get-status"
    ];
  }

  public getVerbLowerCase(): string {
    const apiPath = this.getOASPath();
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getPath(): string {
    const apiPath = this.getOASPath();
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  public getOperationId(): string {
    return this.getOASPath().post.operationId;
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

  public getExpressRequestHandler(): IExpressRequestHandler {
    return this.handleRequest.bind(this);
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    const fnTag = "GetStatusEndpoint#handleRequest()";
    this.log.debug(`POST ${this.getPath()}`);
    try {
      const { callOutput } = await this.options.plugin.getStatus(req.body);

      if (callOutput === undefined) {
        res.status(400).json({
          message: "Bad request",
          error: callOutput,
        });
      } else {
        res.status(200);
        res.send(callOutput);
      }
    } catch (ex) {
      this.log.error(`${fnTag} failed to serve request`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
