import type { EventEmitter } from "events";
import fs from "fs-extra";
import { Optional } from "typescript-optional";
import { RuntimeError } from "run-time-error";
import type { Container } from "dockerode";
import Docker from "dockerode";
import { Logger, Checks, Bools } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { Containers } from "../common/containers";
import { RustcBuildCmd } from "./rustc-build-cmd";

export const K_DEFAULT_RUSTC_CONTAINER_WORKDIR = "/usr/src/host-sources-dir/";

export const K_DEFAULT_RUSTC_CONTAINER_CMD =
  RustcBuildCmd.WASM_PACK_BUILD_BUNDLER;

export interface IRustcContainerOptions {
  readonly logLevel?: LogLevelDesc;
  readonly imageName?: string;
  readonly imageTag?: string;
  /**
   * The path on the host machine's file-system where the carbo build should
   * occur. Note that host machine in this context means the machine that runs
   * the test using this class, the one launching the containers.
   */
  readonly hostSourceDir?: string;
  readonly emitContainerLogs?: boolean;
  readonly envVars?: Map<string, string>;
  readonly workDir?: string;
}

/**
 * Helper class designed to enable test cases compiling Rust code without needing
 * to depend on Rust being installed.
 *
 * At it's core, it is meant to be a programamatic substitute for doing something
 * like this on your local machine:
 *
 * ```sh
 * $ docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/myapp -w /usr/src/myapp rust:1.52.0 cargo build --release
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm
 */
export class RustcContainer {
  public static readonly CLASS_NAME = "RustcContainer";

  public readonly logLevel: LogLevelDesc;
  public readonly imageName: string;
  public readonly imageTag: string;
  public readonly imageFqn: string;
  public readonly log: Logger;
  public readonly emitContainerLogs: boolean;
  public readonly hostSourceDir: Optional<string>;
  public readonly workDir: string;
  public readonly envVars: Map<string, string>;

  private _containerId: Optional<string>;

  public get containerId(): Optional<string> {
    return this._containerId;
  }

  public get cwd(): string {
    return this.workDir;
  }

  public get container(): Optional<Container> {
    const docker = new Docker();
    return this.containerId.isPresent()
      ? Optional.ofNonNull(docker.getContainer(this.containerId.get()))
      : Optional.empty();
  }

  public get className(): string {
    return RustcContainer.CLASS_NAME;
  }

  constructor(public readonly opts: IRustcContainerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(opts, `${fnTag} arg options`);

    if (opts.hostSourceDir) {
      Checks.nonBlankString(opts.hostSourceDir, `${fnTag} opts.hostSourceDir`);
    }

    this._containerId = Optional.empty();
    this.hostSourceDir = Optional.ofNullable(opts.hostSourceDir);
    this.imageName =
      opts.imageName || "ghcr.io/hyperledger/cactus-rust-compiler";
    this.imageTag = opts.imageTag || "1.0.3";
    this.imageFqn = `${this.imageName}:${this.imageTag}`;
    this.envVars = opts.envVars || new Map();
    this.emitContainerLogs = Bools.isBooleanStrict(opts.emitContainerLogs)
      ? (opts.emitContainerLogs as boolean)
      : true;

    this.workDir = opts.workDir
      ? opts.workDir
      : K_DEFAULT_RUSTC_CONTAINER_WORKDIR;

    Checks.nonBlankString(this.workDir, `${fnTag} non-blank str this.workDir`);

    this.logLevel = opts.logLevel || "INFO";

    const level = this.logLevel;
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.log.debug(`Created instance of ${this.className} OK`);
  }

  public async start(omitPull = false): Promise<Container> {
    if (this.hostSourceDir.isPresent()) {
      await this.checkHostSourceDirExists();
    }

    const docker = new Docker();
    if (this.containerId.isPresent()) {
      this.log.warn(`Container ID provided. Will not start new one.`);
      const container = docker.getContainer(this.containerId.get());
      return container;
    }
    if (!omitPull) {
      this.log.debug(`Pulling image ${this.imageFqn}...`);
      await Containers.pullImage(this.imageFqn);
      this.log.debug(`Pulled image ${this.imageFqn} OK`);
    }

    const dockerEnvVars: string[] = new Array(...this.envVars).map(
      (pairs) => `${pairs[0]}=${pairs[1]}`,
    );

    const Binds = this.hostSourceDir.isPresent()
      ? [`${this.hostSourceDir.get()}:${this.cwd}`]
      : [];

    const createOptions = {
      WorkingDir: this.workDir,
      Env: dockerEnvVars,
      Healthcheck: {
        Test: [
          "CMD-SHELL",
          `rustup --version && rustc --version && cargo --version`,
        ],
        Interval: 1000000000, // 1 second
        Timeout: 3000000000, // 3 seconds
        Retries: 10,
        StartPeriod: 1000000000, // 1 second
      },
      HostConfig: {
        AutoRemove: true,
        Binds,
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
            const exception = new RuntimeError(errorMessage, err);
            this.log.error(exception);
            reject(exception);
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
        this.log.debug(`Registered container log stream callbacks OK`);

        try {
          this.log.debug(`Starting to wait for healthcheck... `);
          await Containers.waitForHealthCheck(this.containerId.get());
          this.log.debug(`Healthcheck passed OK`);
          resolve(container);
        } catch (ex) {
          this.log.error(ex);
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

  public async checkHostSourceDirExists(): Promise<void> {
    const pathExists = await fs.pathExists(this.hostSourceDir.get());
    if (!pathExists) {
      const errorMessage = `hostSourceDir ${this.hostSourceDir.get()} does not exist (or not accessible) on file-system. Cannot continue with Rust compilation`;
      throw new RuntimeError(errorMessage);
    }
  }
}
