import { Express, Request, Response } from "express";

import {
  IWebServiceEndpoint,
  IExpressRequestHandler,
  IEndpointAuthzOptions,
} from "@hyperledger/cactus-core-api";
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  IAsyncProvider,
} from "@hyperledger/cactus-common";

import { registerWebServiceEndpoint } from "@hyperledger/cactus-core";

import { OdapGateway } from "../gateway/odap-gateway";
import { TransferCommenceMessage } from "../generated/openapi/typescript-axios";
import OAS from "../../json/openapi.json";

export interface ILockEvidencePrepareEndpointOptions {
  logLevel?: LogLevelDesc;
  gateway: OdapGateway;
}

export class LockEvidencePrepareEndpoint implements IWebServiceEndpoint {
  public static readonly CLASS_NAME = "LockEvidencePrepareEndpoint";

  private readonly log: Logger;

  public get className(): string {
    return LockEvidencePrepareEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: ILockEvidencePrepareEndpointOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.gateway, `${fnTag} arg options.connector`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  /*public getOasPath() {
    return OAS.paths["/api/v2/phase3/commitfinal"];
  }*/

  public getPath(): string {
    const apiPath = OAS.paths["/api/v2/phase2/transfercommence"];
    return apiPath.post["x-hyperledger-cactus"].http.path;
  }

  public getVerbLowerCase(): string {
    const apiPath = OAS.paths["/api/v2/phase2/transfercommence"];
    return apiPath.post["x-hyperledger-cactus"].http.verbLowerCase;
  }

  public getOperationId(): string {
    return OAS.paths["/api/v2/phase2/transfercommence"].post.operationId;
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
    const reqTag = `${this.getVerbLowerCase()} - ${this.getPath()}`;
    this.log.debug(reqTag);
    const reqBody: TransferCommenceMessage = req.body;
    try {
      const resBody = await this.options.gateway.LockEvidenceTransferCommence(
        reqBody,
      );
      res.json(resBody);
    } catch (ex) {
      this.log.error(`Crash while serving ${reqTag}`, ex);
      res.status(500).json({
        message: "Internal Server Error",
        error: ex?.stack || ex?.message,
      });
    }
  }
}
