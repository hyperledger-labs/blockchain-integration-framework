import { Server } from "http";
import { Server as SecureServer } from "https";
import { Optional } from "typescript-optional";
import { promisify } from "util";
import express, { Express, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import { JWS, JWK } from "jose";
import jsonStableStringify from "json-stable-stringify";
import { v4 as uuidv4 } from "uuid";

import OAS from "../json/openapi.json";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import {
  ConsortiumDatabase,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  JWSGeneral,
  JWSRecipient,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { GetConsortiumEndpointV1 } from "./consortium/get-consortium-jws-endpoint-v1";
import { GetNodeJwsEndpoint } from "./consortium/get-node-jws-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./consortium/get-prometheus-exporter-metrics-endpoint-v1";

import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";
export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IPluginConsortiumManualOptions extends ICactusPluginOptions {
  keyPairPem: string;
  consortiumDatabase: ConsortiumDatabase;
  consortiumRepo: ConsortiumRepository;
  prometheusExporter?: PrometheusExporter;
  pluginRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  webAppOptions?: IWebAppOptions;
}

export class PluginConsortiumManual
  implements ICactusPlugin, IPluginWebService {
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginConsortiumManualOptions) {
    const fnTag = `PluginConsortiumManual#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.consortiumDatabase,
      `${fnTag} options.consortiumDatabase`,
    );
    this.log = LoggerProvider.getOrCreate({
      label: "plugin-consortium-manual",
    });
    this.instanceId = this.options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.setNodeCount(this.getNodeCount());
  }

  getOpenApiSpecs(): OpenAPIV3.Document {
    return (OAS as unknown) as OpenAPIV3.Document;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getNodeCount(): number {
    const consortiumDatabase: ConsortiumDatabase = this.options
      .consortiumDatabase;
    const consortiumRepo: ConsortiumRepository = new ConsortiumRepository({
      db: consortiumDatabase,
    });
    return consortiumRepo.allNodes.length;
  }

  /**
   * Updates the Node count Prometheus metric of the plugin.
   * Note: This does not change the underlying consortium database at all,
   * only affects **the metrics**.
   */
  public updateMetricNodeCount(): void {
    const consortiumDatabase: ConsortiumDatabase = this.options
      .consortiumDatabase;
    const consortiumRepo: ConsortiumRepository = new ConsortiumRepository({
      db: consortiumDatabase,
    });
    this.prometheusExporter.setNodeCount(consortiumRepo.allNodes.length);
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down...`);
    const serverMaybe = this.getHttpServer();
    if (serverMaybe.isPresent()) {
      this.log.info(`Awaiting server.close() ...`);
      const server = serverMaybe.get();
      await promisify(server.close.bind(server))();
      this.log.info(`server.close() OK`);
    } else {
      this.log.info(`No HTTP server found, skipping...`);
    }
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webApp: Express = this.options.webAppOptions ? express() : app;

    if (this.options.webAppOptions) {
      this.log.info(`Creating dedicated HTTP server...`);
      const { port, hostname } = this.options.webAppOptions;

      webApp.use(bodyParser.json({ limit: "50mb" }));

      const address = await new Promise((resolve, reject) => {
        const httpServer = webApp.listen(port, hostname, (err?: any) => {
          if (err) {
            reject(err);
            this.log.error(`Failed to create dedicated HTTP server`, err);
          } else {
            this.httpServer = httpServer;
            const theAddress = this.httpServer.address();
            resolve(theAddress);
          }
        });
      });
      this.log.info(`Creation of HTTP server OK`, { address });
    }

    const webServices = await this.getOrCreateWebServices();
    const apiSpec = this.getOpenApiSpecs();
    const openApiMiddleware = OpenApiValidator.middleware({
      apiSpec,
      validateApiSpec: false,
      $refParser: {
        mode: "dereference",
      },
    });
    app.use(openApiMiddleware);
    app.use(
      (
        err: {
          status?: number;
          errors: [
            {
              path: string;
              message: string;
              errorCode: string;
            },
          ];
        },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        if (err) {
          res.status(err.status || 500);
          res.send(err.errors);
        } else {
          next();
        }
      },
    );

    webServices.forEach((ws) => ws.registerExpress(webApp));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    log.info(`Creating web services for plugin ${pkgName}...`);
    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on

    const { consortiumDatabase, keyPairPem } = this.options;
    const consortiumRepo = new ConsortiumRepository({
      db: consortiumDatabase,
    });

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetConsortiumEndpointV1(options);
      endpoints.push(endpoint);
      const path = endpoint.getPath();
      this.log.info(`Instantiated GetConsortiumEndpointV1 at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetNodeJwsEndpoint(options);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    this.endpoints = endpoints;

    log.info(`Instantiated web svcs for plugin ${pkgName} OK`, { endpoints });
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-consortium-manual`;
  }

  public async getNodeJws(): Promise<JWSGeneral> {
    const { keyPairPem, consortiumRepo: repo } = this.options;

    this.updateMetricNodeCount();
    const keyPair = JWK.asKey(keyPairPem);
    const payloadObject = { consortiumDatabase: repo.consortiumDatabase };
    const payloadJson = jsonStableStringify(payloadObject);
    const _protected = {
      iat: Date.now(),
      jti: uuidv4(),
      iss: "Hyperledger Cactus",
    };
    // TODO: double check if this casting is safe (it is supposed to be)
    return JWS.sign.general(payloadJson, keyPair, _protected) as JWSGeneral;
  }

  public async getConsortiumJws(): Promise<JWSGeneral> {
    const nodes = this.options.consortiumRepo.allNodes;

    const requests = nodes
      .map((cnm) => cnm.nodeApiHost)
      .map((host) => new Configuration({ basePath: host }))
      .map((configuration) => new DefaultApi(configuration))
      .map((apiClient) => apiClient.getNodeJws());

    const responses = await Promise.all(requests);

    const signatures: JWSRecipient[] = [];

    responses
      .map((apiResponse) => apiResponse.data)
      .map((getNodeJwsResponse) => getNodeJwsResponse.jws)
      .forEach((aJws: JWSGeneral) =>
        aJws.signatures.forEach((signature) => signatures.push(signature)),
      );

    const [response] = responses;
    const jws = response.data.jws;
    jws.signatures = signatures;
    return jws;
  }
}
