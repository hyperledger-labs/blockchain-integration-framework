import type { Server } from "http";
import type { Server as SecureServer } from "https";

import {
  SharedIniFileCredentials,
  config as awsConfig,
  SecretsManager,
  Credentials,
} from "aws-sdk";

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
  IPluginKeychain,
} from "@hyperledger/cactus-core-api";

import { homedir } from "os";

export enum AwsCredentialType {
  LocalFile = "LOCAL_FILE",
  InMemory = "IN_MEMORY",
}

export interface IPluginKeychainAwsSmOptions extends ICactusPluginOptions {
  logLevel?: LogLevelDesc;
  keychainId: string;
  awsProfile: string;
  awsRegion: string;
  awsEndpoint: string;
  awsCredentialType: AwsCredentialType;
  /*
   *   awsCredentialFilePath field optional and necessary only when
   *   awsCredentialType == AwsCredentialType.LocalFile
   *   This field defaults to $HOME/.aws/credentials
   */
  awsCredentialFilePath?: string;
  /*
   *   awsAccessKeyId field optional and neccessary only when
   *   awsCredentialType == AwsCredentialType.InMemory
   */
  awsAccessKeyId?: string;
  /*
   *   awsSecretAccessKey field optional and neccessary only when
   *   awsCredentialType == AwsCredentialType.InMemory
   */
  awsSecretAccessKey?: string;
}

const SECRETMANAGER_STATUS_KEY_NOT_FOUND =
  "Secrets Manager can't find the specified secret.";
export class PluginKeychainAwsSm
  implements ICactusPlugin, IPluginWebService, IPluginKeychain {
  public static readonly CLASS_NAME = "PluginKeychainAwsSm";

  private readonly log: Logger;
  private readonly instanceId: string;
  /*
   *   awsProfile variable is used to refer to the aws profile to be consumed
   *   while running the plugin. The profile is located at
   *   ~/.aws/credentials by default and is setup when you run "aws configure"
   *   on the machine running this plugin.
   *   You can pass custom aws credential file path by defining the awsCredentialFilePath
   *   variable
   */
  private readonly awsProfile: string;
  private readonly awsRegion: string;
  private readonly awsEndpoint: string;
  private readonly awsClient: SecretsManager;
  private endpoints: IWebServiceEndpoint[] | undefined;
  private awsCredentialType: AwsCredentialType;

  public get className() {
    return PluginKeychainAwsSm.CLASS_NAME;
  }

  constructor(public readonly opts: IPluginKeychainAwsSmOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);
    Checks.truthy(opts.keychainId, `${fnTag} arg options.keychainId`);
    Checks.truthy(opts.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(opts.awsProfile, `${fnTag} options.awsProfile`);
    Checks.truthy(opts.awsRegion, `${fnTag} options.awsRegion`);
    Checks.truthy(opts.awsEndpoint, `${fnTag} options.awsEndpoint`);
    Checks.truthy(opts.awsCredentialType, `${fnTag} options.awsCredentialType`);
    Checks.nonBlankString(opts.keychainId, `${fnTag} options.keychainId`);
    Checks.nonBlankString(opts.awsProfile, `${fnTag} options.awsProfile`);
    Checks.nonBlankString(opts.awsRegion, `${fnTag} options.awsRegion`);
    Checks.nonBlankString(opts.awsEndpoint, `${fnTag} options.awsEndpoint`);
    if (opts.awsCredentialType == AwsCredentialType.InMemory) {
      Checks.nonBlankString(
        opts.awsAccessKeyId,
        `${fnTag} options.awsAccessKeyId`,
      );
      Checks.nonBlankString(
        opts.awsSecretAccessKey,
        `${fnTag} options.awsSecretAccessKey`,
      );
    }

    const level = this.opts.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.instanceId = this.opts.instanceId;
    this.awsProfile = this.opts.awsProfile;
    this.awsRegion = this.opts.awsRegion;
    this.awsEndpoint = this.opts.awsEndpoint;
    this.awsCredentialType = this.opts.awsCredentialType;

    if (this.awsCredentialType == AwsCredentialType.LocalFile) {
      const credentials = new SharedIniFileCredentials({
        profile: this.awsProfile,
        filename:
          this.opts.awsCredentialFilePath || `${homedir()}/.aws/credentials`,
      });
      awsConfig.credentials = credentials;
    } else if (this.awsCredentialType == AwsCredentialType.InMemory) {
      const credentials = new Credentials({
        accessKeyId: this.opts.awsAccessKeyId || "",
        secretAccessKey: this.opts.awsSecretAccessKey || "",
      });
      awsConfig.credentials = credentials;
    }

    awsConfig.region = this.awsRegion;
    this.awsClient = new SecretsManager({
      endpoint: this.awsEndpoint,
    });

    this.log.info(`Created ${this.className}. KeychainID=${opts.keychainId}`);
  }

  public getAwsClient(): SecretsManager {
    return this.awsClient;
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

    this.endpoints = endpoints;

    return endpoints;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
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
    return `@hyperledger/cactus-plugin-keychain-aws-sm`;
  }

  async rotateEncryptionKeys(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getEncryptionAlgorithm(): string {
    return null as any;
  }

  async get<T>(key: string): Promise<T> {
    const fnTag = `${this.className}#get(key: string)`;
    const awsClient = this.getAwsClient();
    try {
      const res = (await awsClient
        .getSecretValue({
          SecretId: key,
        })
        .promise()) as any;
      if (res.SecretString) {
        return res.SecretString;
      } else {
        throw new Error(
          `${fnTag}: Invalid response recieved from AWS SecretsManager. Expected "response.SecretString" property chain to be truthy`,
        );
      }
    } catch (ex) {
      const errorStatus = (ex as Error).message.includes(
        SECRETMANAGER_STATUS_KEY_NOT_FOUND,
      );
      if (errorStatus) {
        return (null as unknown) as T;
      } else {
        this.log.error(`Error retriving secret value for the key "${key}"`);
        throw ex;
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const fnTag = `${this.className}#has(key: string)`;
    const awsClient = this.getAwsClient();
    try {
      (await awsClient
        .describeSecret({
          SecretId: key,
        })
        .promise()) as any;
      return true;
    } catch (ex) {
      const errorStatus = (ex as Error).message.includes(
        SECRETMANAGER_STATUS_KEY_NOT_FOUND,
      );
      if (errorStatus) {
        return false;
      } else {
        this.log.error(`${fnTag}: Presence check of "${key}" crashed:`, ex);
        throw ex;
      }
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const fnTag = `${this.className}#set(key: string)`;
    const awsClient = this.getAwsClient();
    try {
      (await awsClient
        .createSecret({
          Name: key,
          SecretString: value as any,
        })
        .promise()) as any;
    } catch (ex) {
      this.log.error(` ${fnTag}: Error writing secret "${key}"`);
      throw ex;
    }
  }

  async delete(key: string): Promise<void> {
    const fnTag = `${this.className}#delete(key: string)`;
    const awsClient = this.getAwsClient();
    try {
      (await awsClient
        .deleteSecret({
          SecretId: key,
          ForceDeleteWithoutRecovery: true,
        })
        .promise()) as any;
    } catch (ex) {
      this.log.error(`${fnTag} Error deleting secret "${key}"`);
      throw ex;
    }
  }
}
