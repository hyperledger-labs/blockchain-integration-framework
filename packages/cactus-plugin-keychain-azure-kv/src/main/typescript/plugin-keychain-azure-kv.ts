import type { Server } from "http";
import type { Server as SecureServer } from "https";

import type { Express } from "express";
import { Optional } from "typescript-optional";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  ICactusPlugin,
  ICactusPluginOptions,
  IPluginKeychain,
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { KeyVaultSecret, SecretClient } from "@azure/keyvault-secrets";
import {
  UsernamePasswordCredential,
  DefaultAzureCredential,
} from "@azure/identity";

// TODO: Writing the getExpressRequestHandler() method for
// GetKeychainEntryEndpointV1 and SetKeychainEntryEndpointV1
// import { GetKeychainEntryEndpointV1 } from "./web-services/get-keychain-entry-endpoint-v1";
// import { SetKeychainEntryEndpointV1 } from "./web-services/set-keychain-entry-endpoint-v1";

export enum AzureCredentialType {
  LocalFile = "LOCAL_FILE",
  InMemory = "IN_MEMORY",
}

export interface IAzureInMemoryCredentials {
  azureTenantId: string;
  azureClientId: string;
  azureUsername: string;
  azurePassword: string;
}

export interface IPluginKeychainAzureKvOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  instanceId: string;
  azureEndpoint: string;
  azureCredentialType?: AzureCredentialType;
  azureInMemoryCredentials?: IAzureInMemoryCredentials;
  backend?: SecretClient;
}

export class PluginKeychainAzureKv
  implements ICactusPlugin, IPluginWebService, IPluginKeychain {
  public static readonly CLASS_NAME = "PluginKeychainAzureKv";

  readonly vaultUrl: string;
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private azureKvClient: SecretClient;

  public get className() {
    return PluginKeychainAzureKv.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainAzureKvOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.nonBlankString(opts.azureEndpoint, `${fnTag} options.azureEndpoint`);
    if (
      opts.azureCredentialType &&
      opts.azureInMemoryCredentials &&
      opts.azureCredentialType == AzureCredentialType.InMemory
    ) {
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureTenantId,
        `${fnTag} opts.azureInMemoryCredentials.azureTenantId`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureClientId,
        `${fnTag} opts.azureInMemoryCredentials.azureClientId`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azureUsername,
        `${fnTag} opts.azureInMemoryCredentials.azureUsername`,
      );
      Checks.nonBlankString(
        opts.azureInMemoryCredentials.azurePassword,
        `${fnTag} opts.azureInMemoryCredentials.azurePassword`,
      );
    }

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.vaultUrl = this.opts.azureEndpoint;

    if (opts.backend) {
      this.azureKvClient = opts.backend;
    } else if (
      !opts.backend &&
      opts.azureCredentialType == AzureCredentialType.InMemory &&
      opts.azureInMemoryCredentials
    ) {
      const azureCredentials = new UsernamePasswordCredential(
        opts.azureInMemoryCredentials.azureTenantId,
        opts.azureInMemoryCredentials.azureClientId,
        opts.azureInMemoryCredentials.azureUsername,
        opts.azureInMemoryCredentials.azurePassword,
      );
      this.azureKvClient = new SecretClient(this.vaultUrl, azureCredentials);
    } else {
      const azureCredentials = new DefaultAzureCredential();
      this.azureKvClient = new SecretClient(this.vaultUrl, azureCredentials);
    }

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    await Promise.all(webServices.map((ws) => ws.registerExpress(app)));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }
    const endpoints: IWebServiceEndpoint[] = [];

    // TODO: Writing the getExpressRequestHandler() method for
    // GetKeychainEntryEndpointV1 and SetKeychainEntryEndpointV1

    // {
    //   const ep = new GetKeychainEntryEndpointV1({
    //     logLevel: this.opts.logLevel,
    //   });
    //   ep.registerExpress(expressApp);
    //   endpoints.push(ep);
    // }
    // {
    //   const ep = new SetKeychainEntryEndpointV1({
    //     logLevel: this.opts.logLevel,
    //   });
    //   ep.registerExpress(expressApp);
    //   endpoints.push(ep);
    // }
    this.endpoints = endpoints;

    return endpoints;
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
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

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-vault`;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return null as any;
  }

  public getAzureKvClient(): SecretClient {
    return this.azureKvClient;
  }

  async get<T>(key: string): Promise<T> {
    const keyVaultSecret: KeyVaultSecret = await this.azureKvClient.getSecret(
      key,
    );
    if (keyVaultSecret) {
      const result = keyVaultSecret.value;
      return (result as unknown) as T;
    } else {
      throw new Error(`${key} secret not found`);
    }
  }

  /**
   * Detects the presence of a key by trying to read it and then
   * observing whether an HTTP 404 NOT FOUND error is returned or
   * not and deciding whether the keychain has the entry ot not
   * based on this.
   */

  async has(key: string): Promise<boolean> {
    const keyVaultSecret = await this.azureKvClient.getSecret(key);
    if (keyVaultSecret) {
      return true;
    } else {
      return false;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.azureKvClient.setSecret(key, (value as unknown) as string);
  }

  async delete(key: string): Promise<void> {
    await this.azureKvClient.beginDeleteSecret(key);
  }
}
