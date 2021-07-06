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

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

export interface IPluginKeychainGoogleSmOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  instanceId: string;
  backend?: SecretManagerServiceClient;
}

export class PluginKeychainGoogleSm
  implements ICactusPlugin, IPluginWebService, IPluginKeychain {
  public static readonly CLASS_NAME = "PluginKeychainGoogleSm";
  private readonly log: Logger;
  private readonly instanceId: string;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private googleSmClient: SecretManagerServiceClient;

  public get className() {
    return PluginKeychainGoogleSm.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainGoogleSmOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);

    if (opts.backend) {
      this.googleSmClient = opts.backend;
    } else {
      this.googleSmClient = new SecretManagerServiceClient();
    }
    this.instanceId = this.opts.instanceId;
    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

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

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-vault`;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return "AES-256" as any;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getGoogleSmClient(): SecretManagerServiceClient {
    return this.googleSmClient;
  }

  async get<T>(key: string): Promise<T> {
    const accessResponse = await this.googleSmClient.getSecret({
      name: key,
    });
    if (accessResponse[0]) {
      const result = accessResponse[0];
      return (result as unknown) as T;
    } else {
      throw new Error(`${key} secret not found.`);
    }
  }

  /**
   * Detects the presence of a key by trying to read it and then
   * observing whether an HTTP 404 NOT FOUND error is returned or
   * not and deciding whether the keychain has the entry ot not
   * based on this.
   */
  async has(key: string): Promise<boolean> {
    const accessResponse = await this.googleSmClient.accessSecretVersion({
      name: key,
    });
    if (accessResponse) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * To implement this the key should consist of parent and secretId seperated by ?
   * For example, key = "projects/my-project?my-secret"
   */
  async set<T>(key: string, value: T): Promise<void> {
    const parent = key.split("?")[0];
    const secretId = key.split("?")[1];
    const secret = await this.googleSmClient.createSecret({
      parent: parent,
      secretId: secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });
    await this.googleSmClient.addSecretVersion({
      parent: secret[0].name,
      payload: {
        data: (value as unknown) as string,
      },
    });
  }

  async delete(key: string): Promise<void> {
    await this.googleSmClient.deleteSecret({
      name: key,
    });
  }
}
