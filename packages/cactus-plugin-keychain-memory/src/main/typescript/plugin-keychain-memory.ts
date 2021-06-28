import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { Express } from "express";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./get-prometheus-exporter-metrics/get-prometheus-exporter-metrics-endpoint-v1";

export interface IPluginKeychainMemoryOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  backend?: Map<string, unknown>;
  keychainId: string;
  prometheusExporter?: PrometheusExporter;
}

export class PluginKeychainMemory {
  public static readonly CLASS_NAME = "PluginKeychainMemory";

  private readonly backend: Map<string, unknown>;
  private readonly log: Logger;
  private readonly instanceId: string;
  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return PluginKeychainMemory.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainMemoryOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    this.backend = opts.backend || new Map();
    Checks.truthy(this.backend, `${fnTag} arg options.backend`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
    this.log.warn(
      `Never use ${this.className} in production. ` +
        `It does not support encryption. It stores everything in plain text.`,
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

  public async getOrCreateWebServices(
    expressApp: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const { log } = this;

    log.info(`Installing web services for plugin ${this.getPackageName()}...`);

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.opts.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoint.registerExpress(expressApp);
      endpoints.push(endpoint);
    }

    const pkg = this.getPackageName();
    log.info(`Installed web services for plugin ${pkg} OK`, { endpoints });

    return endpoints;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-memory`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async get<T>(key: string): Promise<T> {
    return this.backend.get(key) as T;
  }

  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.backend.set(key, value);
    this.prometheusExporter.setTotalKeyCounter(this.backend.size);
  }

  async delete(key: string): Promise<void> {
    this.backend.delete(key);
    this.prometheusExporter.setTotalKeyCounter(this.backend.size);
  }
}
