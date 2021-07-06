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
  IPluginWebService,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";

import { DefaultApi } from "./generated/openapi/typescript-axios";

export interface IPluginKeychainAzureKvRemoteAdapterOptions
  extends ICactusPluginOptions {
  backend: DefaultApi;
  keychainId: string;
  logLevel?: LogLevelDesc;
}

/**
 * Class responsible for encapsulating an API client object and then acting as
 * an adapter (ta-da) between said API client object and the calling code to
 * which it is (should be) transparent whether it is talking to an in-process
 * plugin instance of the keychain plugin or an adapter backed by an API client
 * object in which scenario the real keychain plugin object can be anywhere
 * else on the network and also can be written in any programming language that
 * the author so desires.
 */
export class PluginKeychainAzureKvRemoteAdapter
  implements ICactusPlugin, IPluginWebService {
  public static readonly CLASS_NAME = "PluginKeychainAzureKvRemoteAdapter";

  private readonly instanceId: string;
  private readonly keychainId: string;
  private readonly log: Logger;
  private readonly backend: DefaultApi;

  public get className(): string {
    return PluginKeychainAzureKvRemoteAdapter.CLASS_NAME;
  }

  constructor(
    public readonly opts: IPluginKeychainAzureKvRemoteAdapterOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.truthy(opts.backend, `${fnTag} options.backend`);
    Checks.truthy(
      opts.backend instanceof DefaultApi,
      `${fnTag} opts.backend instanceof DefaultApi`,
    );

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.backend = opts.backend;
    this.keychainId = opts.keychainId;

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  /**
   * Dummy implementation that wires no web services on the host API server
   * because there is no need. All the functionality is implemented somewhere
   * else on a host that's accessible through the network to this object
   * (because this class is a remote adapter not an actual plugin impl.).
   *
   * @param _expressApp
   */
  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    return [];
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  public registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    return this.getOrCreateWebServices();
  }

  public getHttpServer(): Optional<Server | SecureServer> {
    return Optional.empty();
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getEncryptionAlgorithm(): string {
    throw new Error("Method not implemented.");
  }

  public getKeychainId(): string {
    return this.keychainId;
  }

  public async has(key: string): Promise<boolean> {
    try {
      await this.backend.getKeychainEntryV1({ key });
      return true;
    } catch (ex) {
      // FIXME check for errors being thrown due to something other than
      // the key not being present...
      return false;
    }
  }

  public async get<T>(key: string): Promise<T> {
    const { data } = await this.backend.getKeychainEntryV1({ key });
    // FIXME what to do here? Does it make any sense to have the get() method
    // of the keychain be generically parameterizable when we know we can only
    // return a string anyway?
    return data.value as any;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    // FIXME Does it make any sense to have the set() method be generic?
    await this.backend.setKeychainEntryV1({ key, value: value as any });
  }

  public async delete(key: string): Promise<void> {
    // FIXME Pretty sure azure keyvault can do delete so we don't have to hack it like this
    // but it cannot be done in this code until the rust code has been updated
    // to have that endpoint as well...
    await this.backend.setKeychainEntryV1({ key, value: "" });
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-keychain-azure-kv`;
  }
}
