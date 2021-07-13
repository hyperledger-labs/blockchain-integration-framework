import type { Server } from "http";
import type { Server as SecureServer } from "https";

import type { Express, NextFunction, Request, Response } from "express";
import { Optional } from "typescript-optional";
import Vault from "node-vault";
import HttpStatus from "http-status-codes";

import OAS from "../json/openapi.json";
import * as OpenApiValidator from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPluginOptions,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./web-services/get-prometheus-exporter-metrics-endpoint-v1";
import { GetKeychainEntryEndpointV1 } from "./web-services/get-keychain-entry-endpoint-v1";
import { SetKeychainEntryEndpointV1 } from "./web-services/set-keychain-entry-endpoint-v1";
import { HasKeychainEntryEndpointV1 } from "./web-services/has-keychain-entry-endpoint-v1";
import { DeleteKeychainEntryEndpointV1 } from "./web-services/delete-keychain-entry-endpoint-v1";

export interface IPluginKeychainVaultOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  /**
   * API version to use when talking to the backing Vault instance through
   * the NodeJS vault-node client.
   * Optional, defaults to `v1`
   */
  apiVersion?: string;
  /**
   * Network host where the backing Vault instance is accessible.
   */
  endpoint: string;
  /**
   * The `VAULT_TOKEN` which the backing Vault instance will accept as valid.
   */
  token: string;
  /**
   * Prometheus Exporter object for metrics monitoring
   */

  prometheusExporter?: PrometheusExporter;

  /**
   * The HTTP path prefix where the KV Secrets Engine is mounted.
   */
  kvSecretsMountPath?: string;
}

export const K_DEFAULT_KV_SECRETS_MOUNT_PATH = "secret/";

export class PluginKeychainVault implements IPluginWebService, IPluginKeychain {
  public static readonly CLASS_NAME = "PluginKeychainVault";

  private readonly apiVersion: string;
  private readonly token: string;
  private readonly endpoint: string;
  private readonly log: Logger;
  private readonly instanceId: string;
  private readonly kvSecretsMountPath: string;
  private readonly backend: Vault.client;
  private endpoints: IWebServiceEndpoint[] | undefined;
  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return PluginKeychainVault.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainVaultOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    Checks.nonBlankString(opts.endpoint, `${fnTag} options.endpoint`);
    Checks.nonBlankString(opts.token, `${fnTag} options.token`);

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.token = this.opts.token;
    this.endpoint = this.opts.endpoint;
    this.apiVersion = this.opts.apiVersion || "v1";

    this.kvSecretsMountPath =
      opts.kvSecretsMountPath || K_DEFAULT_KV_SECRETS_MOUNT_PATH;
    this.log.info(`this.kvSecretsMountPath=${this.kvSecretsMountPath}`);

    this.backend = Vault({
      apiVersion: this.apiVersion,
      endpoint: this.endpoint,
      token: this.token,
    });

    this.prometheusExporter =
      opts.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });
    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );

    this.log.info(`Created Vault backend OK. Endpoint=${this.endpoint}`);

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
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

    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];

    {
      const ep = new GetKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(ep);
    }
    {
      const ep = new SetKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(ep);
    }
    {
      const ep = new HasKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(ep);
    }
    {
      const ep = new DeleteKeychainEntryEndpointV1({
        logLevel: this.opts.logLevel,
        plugin: this,
      });
      endpoints.push(ep);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.opts.logLevel,
      };
      const ep = new GetPrometheusExporterMetricsEndpointV1(opts);
      endpoints.push(ep);
    }
    this.endpoints = endpoints;

    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  getOpenApiSpecs(): OpenAPIV3.Document {
    return (OAS as unknown) as OpenAPIV3.Document;
  }

  public async shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getKeychainId(): string {
    return this.opts.keychainId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-vault`;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return "AES256";
  }

  protected pathFor(key: string): string {
    return `${this.kvSecretsMountPath}${key}`;
  }

  async get<T>(key: string): Promise<T> {
    const fnTag = `${this.className}#get(key: string)`;
    const path = this.pathFor(key);
    try {
      const res = await this.backend.read(path);
      this.log.debug(`Response from Vault: %o`, () => JSON.stringify(res));
      if (res?.data?.data?.value) {
        return res.data.data.value;
      } else {
        throw new Error(
          `${fnTag}: Invalid response received from Vault. Expected "response.data.data.value" property chain to be truthy`,
        );
      }
    } catch (ex) {
      if (ex?.response?.statusCode === HttpStatus.NOT_FOUND) {
        return (null as unknown) as T;
      } else {
        this.log.error(`Retrieval of "${key}" crashed:`, ex);
        throw ex;
      }
    }
  }

  /**
   * Detects the presence of a key by trying to read it and then
   * observing whether an HTTP 404 NOT FOUND error is returned or
   * not and deciding whether the keychain has the entry ot not
   * based on this.
   */
  async has(key: string): Promise<boolean> {
    const path = this.pathFor(key);
    try {
      const res = await this.backend.read(path);
      return res;
    } catch (ex) {
      // We have to make sure that the exception is either an expected
      // or an unexpected one where the expected exception is what we
      // get when the key is not present in the keychain and anything
      // else being an unexpected exception that we do not want to
      // handle nor suppress under any circumstances since doing so
      // would lead to silent failures or worse.
      if (ex?.response?.statusCode === HttpStatus.NOT_FOUND) {
        return false;
      } else {
        this.log.error(`Presence check of "${key}" crashed:`, ex);
        throw ex;
      }
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const path = this.pathFor(key);
    await this.backend.write(path, { data: { value } });
    this.prometheusExporter.setTotalKeyCounter(key, "set");
  }

  async delete(key: string): Promise<void> {
    const path = this.pathFor(key);
    await this.backend.delete(path);
    this.prometheusExporter.setTotalKeyCounter(key, "delete");
  }
}
