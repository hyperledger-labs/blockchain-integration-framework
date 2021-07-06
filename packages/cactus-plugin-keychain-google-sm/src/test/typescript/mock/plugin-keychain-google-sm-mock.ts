/* eslint-disable @typescript-eslint/ban-types */
import {
  SecretManagerServiceClient,
  protos,
} from "@google-cloud/secret-manager";

import * as gax from "google-gax";
import { Descriptors } from "google-gax";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

export interface ISecretManagerServiceClientMock {
  logLevel?: LogLevelDesc;
}

export class SecretManagerServiceClientMock extends SecretManagerServiceClient {
  public static readonly CLASS_NAME = "SecretManagerServiceClientMock";
  private readonly log: Logger;

  private readonly secrets: Map<string, string>;

  public get className(): string {
    return SecretManagerServiceClientMock.CLASS_NAME;
  }

  constructor(public readonly options: ISecretManagerServiceClientMock) {
    super();
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;

    this.log = LoggerProvider.getOrCreate({ level, label });

    this.auth = ("" as unknown) as gax.GoogleAuth;
    this.descriptors = ("" as unknown) as Descriptors;
    this.innerApiCalls = ("" as unknown) as { [name: string]: Function };
    this.pathTemplates = ("" as unknown) as {
      [name: string]: gax.PathTemplate;
    };

    this.secrets = new Map<string, string>();
    this.log.info(`Created ${this.className}.`);
  }

  createSecret(
    request: protos.google.cloud.secretmanager.v1.ICreateSecretRequest,
  ): any {
    if (request.secretId && request.parent) {
      this.secrets.set(request.secretId, "");
      const result = {
        name: `${request.parent}?${request.secretId}`,
      };
      return [result];
    } else {
      throw new Error(
        "Incomplete secret details. Required request.secretId and request.parent",
      );
    }
  }

  addSecretVersion(
    request: protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest,
  ): any {
    if (request.parent && request.payload && request.payload.data) {
      this.secrets.set(
        request.parent.split("?")[1],
        request.payload.data.toString(),
      );
      return [request.payload.data.toString()];
    } else {
      throw new Error(
        "Incomplete request. Required request.parent, request.payload.data",
      );
    }
  }

  deleteSecret(
    request: protos.google.cloud.secretmanager.v1.IDeleteSecretRequest,
  ): any {
    if (request.name) {
      this.secrets.delete(request.name.split("?")[1]);
    } else {
      throw new Error("request.name not passed");
    }
  }

  accessSecretVersion(
    request: protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest,
  ): any {
    const result = this.secrets.has(request.name?.split("?")[1] || "");
    if (result) {
      return true;
    } else {
      return false;
    }
  }

  getSecret(
    request: protos.google.cloud.secretmanager.v1.IGetSecretRequest,
  ): any {
    const result = this.secrets.get(request.name?.split("?")[1] || "");
    if (result) {
      return [result];
    } else {
      throw new Error(`${request.name?.split("?")[1] || ""} secret not found.`);
    }
  }
}
