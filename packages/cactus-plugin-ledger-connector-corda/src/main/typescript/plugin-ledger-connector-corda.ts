import { Server } from "http";
import { Server as SecureServer } from "https";

import { Optional } from "typescript-optional";
import { Config as SshConfig } from "node-ssh";
import { Express, NextFunction, Request, Response } from "express";

import OAS from "../json/openapi.json";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import {
  IPluginLedgerConnector,
  IWebServiceEndpoint,
  IPluginWebService,
  ICactusPluginOptions,
  ConsensusAlgorithmFamily,
} from "@hyperledger/cactus-core-api";
import { consensusHasTransactionFinality } from "@hyperledger/cactus-core";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";

import { DeployContractJarsEndpoint } from "./web-services/deploy-contract-jars-endpoint";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import {
  IInvokeContractEndpointV1Options,
  InvokeContractEndpointV1,
} from "./web-services/invoke-contract-endpoint-v1";

export interface IPluginLedgerConnectorCordaOptions
  extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  sshConfigAdminShell: SshConfig;
  corDappsDir: string;
  prometheusExporter?: PrometheusExporter;
  cordaStartCmd?: string;
  cordaStopCmd?: string;
}

export class PluginLedgerConnectorCorda
  implements IPluginLedgerConnector<any, any, any, any>, IPluginWebService {
  public static readonly CLASS_NAME = "DeployContractJarsEndpoint";

  private readonly instanceId: string;
  private readonly log: Logger;
  public prometheusExporter: PrometheusExporter;

  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return DeployContractJarsEndpoint.CLASS_NAME;
  }

  private httpServer: Server | SecureServer | null = null;

  constructor(public readonly options: IPluginLedgerConnectorCordaOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} options`);
    Checks.truthy(options.sshConfigAdminShell, `${fnTag} sshConfigAdminShell`);
    Checks.truthy(options.instanceId, `${fnTag} instanceId`);

    const level = options.logLevel || "INFO";
    const label = "plugin-ledger-connector-corda";
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.instanceId = this.options.instanceId;
    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public async getConsensusAlgorithmFamily(): Promise<
    ConsensusAlgorithmFamily
  > {
    return ConsensusAlgorithmFamily.Authority;
  }
  public async hasTransactionFinality(): Promise<boolean> {
    const currentConsensusAlgorithmFamily = await this.getConsensusAlgorithmFamily();

    return consensusHasTransactionFinality(currentConsensusAlgorithmFamily);
  }

  getOpenApiSpecs(): OpenAPIV3.Document {
    return (OAS as unknown) as OpenAPIV3.Document;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-ledger-connector-corda";
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public deployContract(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async transact(): Promise<any> {
    this.prometheusExporter.addCurrentTransaction();
    return null as any;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    app.use(
      OpenApiValidator.middleware({
        apiSpec: this.getOpenApiSpecs(),
        validateApiSpec: false,
      }),
    );
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
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    // await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const pkgName = this.getPackageName();
    this.log.info(`Instantiating web services for ${pkgName}...`);
    const endpoints: IWebServiceEndpoint[] = [];
    {
      const endpoint = new DeployContractJarsEndpoint({
        sshConfigAdminShell: this.options.sshConfigAdminShell,
        logLevel: this.options.logLevel,
        corDappsDir: this.options.corDappsDir,
        cordaStartCmd: this.options.cordaStartCmd,
        cordaStopCmd: this.options.cordaStopCmd,
      });

      endpoints.push(endpoint);
    }

    {
      const opts: IInvokeContractEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new InvokeContractEndpointV1(opts);
      endpoints.push(endpoint);
    }

    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        connector: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(endpoint);
    }
    this.log.info(`Instantiated endpoints of ${pkgName}`);
    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.ofNullable(this.httpServer);
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public async getFlowList(): Promise<string[]> {
    return ["getFlowList()_NOT_IMPLEMENTED"];
  }
}
