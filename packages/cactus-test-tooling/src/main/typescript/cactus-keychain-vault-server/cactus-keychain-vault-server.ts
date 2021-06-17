import { EventEmitter } from "events";

import Docker, { Container } from "dockerode";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";

export interface ICactusKeychainVaultServerOptions {
  envVars?: string[];
  imageVersion?: string;
  imageName?: string;
  logLevel?: LogLevelDesc;
}

export const K_DEFAULT_KEYCHAIN_VAULT_IMAGE_NAME =
  "petermetz/cactus-keychain-vault-server";
export const K_DEFAULT_KEYCHAIN_VAULT_IMAGE_VERSION = "2021-01-13-56e2dd1";
export const K_DEFAULT_KEYCHAIN_VAULT_HTTP_PORT = 8080;

/**
 * Class responsible for programmatically managing a container that is running
 * the image made for hosting a keychain plugin, written in the Rust language.
 */
export class CactusKeychainVaultServer {
  public static readonly CLASS_NAME = "CactusKeychainVaultServer";

  private readonly log: Logger;
  private readonly imageName: string;
  private readonly imageVersion: string;
  private readonly envVars: string[];

  private container: Container | undefined;
  private containerId: string | undefined;

  public get className(): string {
    return CactusKeychainVaultServer.CLASS_NAME;
  }

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  constructor(public readonly options: ICactusKeychainVaultServerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.imageName =
      this.options.imageName || K_DEFAULT_KEYCHAIN_VAULT_IMAGE_NAME;
    this.imageVersion =
      this.options.imageVersion || K_DEFAULT_KEYCHAIN_VAULT_IMAGE_VERSION;
    this.envVars = this.options.envVars || [];

    this.log.info(`Created ${this.className} OK. Image FQN: ${this.imageFqn}`);
  }

  public async start(): Promise<Container> {
    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    await Containers.pullImage(this.imageFqn);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        {
          Env: this.envVars,
          PublishAllPorts: true,
          // HostConfig: {
          //   // This is a workaround needed for macOS which has issues with routing
          //   // to docker container's IP addresses directly...
          //   // https://stackoverflow.com/a/39217691
          //   PublishAllPorts: true,
          //   // NetworkMode: "host",
          // },
        },
        {},
        (err: unknown) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;
        try {
          await Containers.waitForHealthCheck(this.containerId);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async stop(): Promise<any> {
    await Containers.stop(this.container as any);
  }

  public destroy(): Promise<unknown> {
    const fnTag = `${this.className}#destroy()`;
    if (this.container) {
      return this.container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getHostPortHttp(): Promise<number> {
    const fnTag = `${this.className}#getHostPortHttp()`;
    if (this.containerId) {
      const cInfo = await Containers.getById(this.containerId);
      return Containers.getPublicPort(
        K_DEFAULT_KEYCHAIN_VAULT_HTTP_PORT,
        cInfo,
      );
    } else {
      throw new Error(`${fnTag} Container ID not set. Did you call start()?`);
    }
  }
}
