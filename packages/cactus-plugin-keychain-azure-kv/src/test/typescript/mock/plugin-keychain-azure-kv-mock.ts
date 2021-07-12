/**
 * This class mocks the SecretClient class of "@azure/keyvault-secrets" library
 * by overriding the SecretClient class methods and storing the secrets In-Memory
 * TO DO: This class shall be replaced with actual usage of SecretClient class in
 * the main class located at packages/cactus-plugin-keychain-azure-kv/src/main/typescript/plugin-keychain-azure-kv.ts
 */
import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import {
  SecretClient,
  KeyVaultSecret,
  SecretProperties,
  PollerLike,
  PollOperationState,
  DeletedSecret,
  PagedAsyncIterableIterator,
} from "@azure/keyvault-secrets";

export interface ISecretClientMock {
  azureKvUrl: string;
  logLevel?: LogLevelDesc;
}

export class SecretClientMock implements SecretClient {
  public static readonly CLASS_NAME = "SecretClientMock";
  private readonly log: Logger;
  readonly vaultUrl: string;
  private readonly secrets: Map<string, string>;

  public get className(): string {
    return SecretClientMock.CLASS_NAME;
  }

  constructor(public readonly options: ISecretClientMock) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.vaultUrl = this.options.azureKvUrl;
    this.secrets = new Map<string, string>();
    this.log = LoggerProvider.getOrCreate({ level, label });
  }

  async setSecret(secretName: string, value: string): Promise<KeyVaultSecret> {
    this.secrets.set(secretName, value);
    const secretProperties: SecretProperties = {
      vaultUrl: this.vaultUrl,
      name: secretName,
    };
    const keyVaultSecret: KeyVaultSecret = {
      properties: secretProperties,
      name: secretName,
    };
    return keyVaultSecret;
  }

  async beginDeleteSecret(
    name: string,
  ): Promise<PollerLike<PollOperationState<DeletedSecret>, DeletedSecret>> {
    this.secrets.delete(name);
    const secretProperties = {
      vaultUrl: this.vaultUrl,
      name: name,
    } as SecretProperties;
    const deletedSecret = {
      properties: secretProperties,
    } as DeletedSecret;
    const pollOperationsState = deletedSecret as PollOperationState<
      DeletedSecret
    >;
    const pollerLike = pollOperationsState as PollerLike<
      PollOperationState<DeletedSecret>,
      DeletedSecret
    >;
    return pollerLike;
  }

  async updateSecretProperties(): Promise<SecretProperties> {
    throw new Error("Method not implemented.");
  }

  async getSecret(secretName: string): Promise<KeyVaultSecret> {
    const result = this.secrets.get(secretName)?.toString();
    if (result == undefined) {
      return (null as unknown) as KeyVaultSecret;
    } else {
      const secretProperties: SecretProperties = {
        vaultUrl: this.vaultUrl,
        name: secretName,
      };
      const keyVaultSecret: KeyVaultSecret = {
        properties: secretProperties,
        name: secretName,
        value: result,
      };
      return keyVaultSecret;
    }
  }

  async hasSecret(secretName: string): Promise<boolean> {
    const result = this.secrets.has(secretName);
    return result;
  }

  async getDeletedSecret(): Promise<DeletedSecret> {
    throw new Error("Method not implemented");
  }

  async purgeDeletedSecret(): Promise<void> {
    throw new Error("Method not implemented");
  }

  async beginRecoverDeletedSecret(): Promise<
    PollerLike<PollOperationState<SecretProperties>, SecretProperties>
  > {
    throw new Error("Method not implemented");
  }

  async backupSecret(): Promise<Uint8Array | undefined> {
    throw new Error("Method not implemented");
  }

  async restoreSecretBackup(): Promise<SecretProperties> {
    throw new Error("Method not implemented");
  }

  listPropertiesOfSecretVersions(): PagedAsyncIterableIterator<
    SecretProperties
  > {
    throw new Error("Method not implemented");
  }

  listPropertiesOfSecrets(): PagedAsyncIterableIterator<SecretProperties> {
    throw new Error("Method not implemented");
  }

  listDeletedSecrets(): PagedAsyncIterableIterator<DeletedSecret> {
    throw new Error("Method not implemented");
  }
}
