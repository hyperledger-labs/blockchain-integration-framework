import type { EventEmitter } from "events";
import { Optional } from "typescript-optional";
import { RuntimeError } from "run-time-error";
import type { Container } from "dockerode";
import Docker from "dockerode";
import { Logger, Checks, Bools } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { Containers } from "../common/containers";

export interface IGoIpfsTestContainerOptions {
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: Map<string, string>;
  readonly containerId?: string;
  readonly apiPort?: number;
  readonly swarmPort?: number;
  readonly webGatewayPort?: number;
}

export class GoIpfsTestContainer {
  public static readonly CLASS_NAME = "GoIpfsTestContainer";

  public readonly logLevel: LogLevelDesc;
  public readonly imageName: string;
  public readonly imageTag: string;
  public readonly imageFqn: string;
  public readonly log: Logger;
  public readonly emitContainerLogs: boolean;
  public readonly envVars: Map<string, string>;
  public readonly apiPort: number;
  public readonly swarmPort: number;
  public readonly webGatewayPort: number;

  private _containerId: Optional<string>;

  public get containerId(): Optional<string> {
    return this._containerId;
  }

  public get container(): Optional<Container> {
    const docker = new Docker();
    return this.containerId.isPresent()
      ? Optional.ofNonNull(docker.getContainer(this.containerId.get()))
      : Optional.empty();
  }

  public get className(): string {
    return GoIpfsTestContainer.CLASS_NAME;
  }

  constructor(public readonly options: IGoIpfsTestContainerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.swarmPort = options.swarmPort || 4001;
    this.apiPort = options.apiPort || 5001;
    this.webGatewayPort = options.webGatewayPort || 8080;
    this.imageName = options.imageName || "ipfs/go-ipfs";
    this.imageTag = options.imageTag || "v0.8.0";
    this.imageFqn = `${this.imageName}:${this.imageTag}`;
    this.envVars = options.envVars || new Map();
    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;

    this._containerId = Optional.ofNullable(options.containerId);

    this.logLevel = options.logLevel || "INFO";

    const level = this.logLevel;
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.debug(`Created instance of ${this.className} OK`);
  }

  public async start(omitPull = false): Promise<Container> {
    const docker = new Docker();
    if (this.containerId.isPresent()) {
      this.log.warn(`Container ID provided. Will not start new one.`);
      const container = docker.getContainer(this.containerId.get());
      return container;
    }
    // otherwise we carry on with launching the container

    if (!omitPull) {
      await Containers.pullImage(this.imageFqn);
    }

    const dockerEnvVars: string[] = new Array(...this.envVars).map(
      (pairs) => `${pairs[0]}=${pairs[1]}`,
    );

    const createOptions = {
      ExposedPorts: {
        [`${this.swarmPort}/tcp`]: {},
        [`${this.apiPort}/tcp`]: {},
        [`${this.webGatewayPort}/tcp`]: {},
      },
      Env: dockerEnvVars,
      Healthcheck: {
        Test: [
          "CMD-SHELL",
          `wget -O- --post-data='' --header='Content-Type:application/json' 'http://127.0.0.1:5001/api/v0/commands'`,
        ],
        Interval: 1000000000, // 1 second
        Timeout: 3000000000, // 3 seconds
        Retries: 99,
        StartPeriod: 1000000000, // 1 second
      },
      HostConfig: {
        PublishAllPorts: true,
      },
    };

    this.log.debug(`Starting ${this.imageFqn} with options: `, createOptions);

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        createOptions,
        {},
        (err: Error) => {
          if (err) {
            const errorMessage = `Failed to start container ${this.imageFqn}`;
            reject(new RuntimeError(errorMessage, err));
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        const { id } = container;
        this.log.debug(`Started ${this.imageFqn} successfully. ID=${id}`);
        this._containerId = Optional.ofNonNull(id);

        if (this.emitContainerLogs) {
          const logOptions = { follow: true, stderr: true, stdout: true };
          const logStream = await container.logs(logOptions);
          logStream.on("data", (data: Buffer) => {
            const fnTag = `[${this.imageFqn}]`;
            this.log.debug(`${fnTag} %o`, data.toString("utf-8"));
          });
        }

        try {
          await Containers.waitForHealthCheck(this.containerId.get());
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async stop(): Promise<unknown> {
    return Containers.stop(this.container.get());
  }

  public async destroy(): Promise<unknown> {
    return this.container.get().remove();
  }

  public async getApiUrl(): Promise<string> {
    const port = await this.getApiPort();
    return `http://127.0.0.1:${port}`;
  }

  public async getWebGatewayUrl(): Promise<string> {
    const port = await this.getWebGatewayPort();
    return `http://127.0.0.1:${port}`;
  }

  public async getApiPort(): Promise<number> {
    const containerInfo = await Containers.getById(this.containerId.get());
    return Containers.getPublicPort(this.apiPort, containerInfo);
  }

  public async getWebGatewayPort(): Promise<number> {
    const containerInfo = await Containers.getById(this.containerId.get());
    return Containers.getPublicPort(this.webGatewayPort, containerInfo);
  }

  public async getSwarmPort(): Promise<number> {
    const containerInfo = await Containers.getById(this.containerId.get());
    return Containers.getPublicPort(this.swarmPort, containerInfo);
  }
}
