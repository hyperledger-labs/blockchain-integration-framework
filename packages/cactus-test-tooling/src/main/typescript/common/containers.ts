import path from "path";
import { Stream } from "stream";
import { IncomingMessage } from "http";
import { Container, ContainerInfo } from "dockerode";
import Dockerode from "dockerode";
import execa from "execa";
import tar from "tar-stream";
import fs from "fs-extra";
import pRetry from "p-retry";
import { RuntimeError } from "run-time-error";
import { Streams } from "../common/streams";
import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Strings,
  ILoggerOptions,
} from "@hyperledger/cactus-common";

export interface IPruneDockerResourcesRequest {
  logLevel?: LogLevelDesc;
}

/**
 * Contains a combined report of the resource pruning performed
 * by the similarly named utility method of the `Containers` class.
 * All the properties are optional because the method does a best
 * effort algorithm with the pruning meaning that all failures are
 * ignored in favor of continuing with trying to prune other
 * resources, meaning that all four pruning categories (container, volume, network, image)
 * are attempted regardless of how many of them succeed or fail.
 * Based on the above, it is never known for sure if the response object
 * will contain all, some or none of it's properties at all.
 */
export interface IPruneDockerResourcesResponse {
  containers?: Dockerode.PruneContainersInfo;
  images?: Dockerode.PruneImagesInfo;
  networks?: Dockerode.PruneNetworksInfo;
  volumes?: Dockerode.PruneVolumesInfo;
}

export interface IPushFileFromFsOptions {
  /**
   * The dockerode container object to send the files to OR a docker container ID that will be used to look up an
   * existing container (it is expected that it is already running).
   */
  containerOrId: Container | string;
  srcFileName?: string;
  srcFileDir?: string;
  srcFileAsString?: string;
  dstFileName: string;
  dstFileDir: string;
}

export interface IGetDiagnosticsRequest {
  logLevel: LogLevelDesc;
  dockerodeOptions?: Dockerode.DockerOptions;
}

export interface IGetDiagnosticsResponse {
  readonly images: Dockerode.ImageInfo[];
  readonly containers: Dockerode.ContainerInfo[];
  readonly volumes: {
    Volumes: Dockerode.VolumeInspectInfo[];
    Warnings: string[];
  };
  readonly networks: unknown[];
  readonly info: unknown;
  readonly version: Dockerode.DockerVersion;
}

export class Containers {
  /**
   * Obtains container diagnostic information that is mainly meant to be useful
   * in the event of a hard-to-debug test failure.
   */
  static async getDiagnostics(
    req: IGetDiagnosticsRequest,
  ): Promise<IGetDiagnosticsResponse> {
    const log = LoggerProvider.getOrCreate({
      label: "containers#get-diagnostics",
      level: req.logLevel,
    });

    try {
      const dockerode = new Dockerode(req.dockerodeOptions);
      const images = await dockerode.listImages();
      const containers = await dockerode.listContainers();
      const volumes = await dockerode.listVolumes();
      const networks = await dockerode.listNetworks();
      const info = await dockerode.info();
      const version = await dockerode.version();

      const response: IGetDiagnosticsResponse = {
        images,
        containers,
        volumes,
        networks,
        info,
        version,
      };
      return response;
    } catch (ex) {
      log.error("Failed to get diagnostics of Docker daemon", ex);
      throw new RuntimeError("Failed to get diagnostics of Docker daemon", ex);
    }
  }
  /**
   * Obtains container diagnostic information that is mainly meant to be useful
   * in the event of a hard-to-debug test failure.
   */
  static async logDiagnostics(
    req: IGetDiagnosticsRequest,
  ): Promise<IGetDiagnosticsResponse> {
    const log = LoggerProvider.getOrCreate({
      label: "containers#log-diagnostics",
      level: req.logLevel,
    });

    const response = await Containers.getDiagnostics(req);
    log.info("ContainerDiagnostics=%o", JSON.stringify(response, null, 4));
    return response;
  }

  /**
   * Uploads a file from the local (host) file system to a container's file-system.
   *
   * @param container
   * @param srcPath File system path on the host's FS, pointing to the file that will be uploaded to the container.
   * @param dstPath The path on the container's own file system where `srcPath` file will be placed.
   */
  static async putFile(opts: IPushFileFromFsOptions): Promise<IncomingMessage> {
    if (!opts) {
      throw new TypeError("Containers#putFileFromFs() opts was falsy.");
    }
    let container: Container;
    if (typeof opts.containerOrId === "string") {
      const docker = new Dockerode();
      container = docker.getContainer(opts.containerOrId);
    } else {
      container = opts.containerOrId;
    }

    const fileAsTarStream = await new Promise<tar.Pack>((resolve, reject) => {
      let fileAsString;
      if (opts.srcFileAsString) {
        fileAsString = opts.srcFileAsString;
      } else if (opts.srcFileDir && opts.srcFileName) {
        const srcFilePath = path.join(opts.srcFileDir, opts.srcFileName);
        fileAsString = fs.readFileSync(srcFilePath);
      } else {
        const msg = "Containers#putFileFromFs: need file as string or dir+name";
        reject(new Error(msg));
        return;
      }

      const pack = tar.pack({ autoDestroy: true });

      pack.entry({ name: opts.dstFileName }, fileAsString, (err: any) => {
        if (err) {
          reject(err);
        } else {
          pack.finalize();
          resolve(pack);
        }
      });
    });

    return new Promise((resolve, reject) => {
      const handler = (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };

      container.putArchive(
        fileAsTarStream,
        {
          path: opts.dstFileDir,
        },
        handler,
      );
    });
  }

  /**
   * Reads the contents of a file from a container's file system and returns a promise of that string.
   *
   * @param container The dockerode container to use when pulling the file.
   * @param filePath The path on the container's own file system where the file you want pulled is located.
   */
  static async pullFile(
    container: Container,
    filePath: string,
    encoding:
      | "ascii"
      | "utf8"
      | "utf-8"
      | "utf16le"
      | "ucs2"
      | "ucs-2"
      | "base64"
      | "latin1"
      | "binary"
      | "hex"
      | undefined = "utf-8",
  ): Promise<string> {
    Checks.truthy(container, "Containers#pullFile() container");
    Checks.truthy(filePath, "Containers#pullFile() filePath");

    const response: any = await container.getArchive({ path: filePath });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let fileContents = "";
      extract.on("entry", async (header: any, stream, next) => {
        stream.on("error", (err: Error) => {
          reject(err);
        });
        const chunks = await Streams.aggregate<string>(stream, encoding);
        fileContents += chunks.join("");
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        resolve(fileContents);
      });

      response.pipe(extract);
    });
  }

  /**
   * Reads the contents of a file from a container's file system and returns a promise of that string.
   *
   * @param container The dockerode container to use when pulling the file.
   * @param filePath The path on the container's own file system where the file you want pulled is located.
   */
  static async pullBinaryFile(
    container: Container,
    filePath: string,
  ): Promise<Buffer> {
    const fnTag = `Containers#pullFile()`;
    Checks.truthy(container, `${fnTag} container`);
    Checks.truthy(filePath, `${fnTag} filePath`);

    const response: any = await container.getArchive({ path: filePath });
    const extract: tar.Extract = tar.extract({ autoDestroy: true });

    return new Promise((resolve, reject) => {
      let buffer: Buffer;
      extract.on("entry", async (header: any, stream, next) => {
        stream.on("error", (err: Error) => {
          reject(err);
        });
        const buffers = await Streams.aggregateToBuffer(stream);
        if (buffer) {
          reject(new Error(`${fnTag} Multiple entries from: ${filePath}`));
        }
        buffer = Buffer.concat(buffers);
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        resolve(buffer);
      });

      response.pipe(extract);
    });
  }

  /**
   *
   * @param container The docker container to execute the `ls` command in.
   * @param dir The directory path to pass in to the `ls` binary for listing.
   */
  public static async ls(container: Container, dir: string): Promise<string[]> {
    const fnTag = "Containers#ls()";
    Checks.truthy(container, `${fnTag} container`);
    Checks.truthy(dir, `${fnTag} path`);
    Checks.truthy(typeof dir === "string", `${fnTag} path typeof string`);
    Checks.truthy(dir.length > 0, `${fnTag} path non blank`);

    const cmdArgs = ["ls", "-A", "-1", "-q", dir];
    const output = await Containers.exec(container, cmdArgs);
    return output
      .split(`\n`)
      .map((str) => Strings.dropNonPrintable(str)) // drop SOH, NUL, etc. ...
      .filter((str) => str); // drop empty strings
  }

  /**
   *
   * Note about `Tty: true` this is necessary because otherwise docker injects
   * 8 bytes of custom data to the beginning of each line. See details:
   * @link https://github.com/moby/moby/issues/7375#issuecomment-51462963
   *
   * @param container The container to execute `cmd` in.
   * @param cmd The list of strings that make up the command itself.
   *
   */
  public static async exec(
    container: Container,
    cmd: string[],
    timeoutMs = 300000, // 5 minutes default timeout
    logLevel: LogLevelDesc = "INFO",
  ): Promise<string> {
    const fnTag = "Containers#exec()";
    Checks.truthy(container, `${fnTag} container`);
    Checks.truthy(cmd, `${fnTag} cmd`);
    Checks.truthy(Array.isArray(cmd), `${fnTag} isArray(cmd)`);
    Checks.truthy(cmd.length > 0, `${fnTag} path non empty array`);
    Checks.nonBlankString(logLevel, `${fnTag} logLevel`);

    const log = LoggerProvider.getOrCreate({ label: fnTag, level: logLevel });

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    return new Promise((resolve, reject) => {
      log.debug(`Calling Exec Start on Docker Engine API...`);

      exec.start({ Tty: true }, (err: any, stream: Stream) => {
        const timeoutIntervalId = setInterval(() => {
          reject(new Error(`Docker Exec timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        if (err) {
          clearInterval(timeoutIntervalId);
          const errorMessage = `Docker Engine API Exec Start Failed:`;
          log.error(errorMessage, err);
          return reject(new RuntimeError(errorMessage, err));
        }
        log.debug(`Obtained output stream of Exec Start OK`);
        let output = "";
        stream.on("data", (data: Buffer) => {
          output += data.toString("utf-8");
        });
        stream.on("end", () => {
          clearInterval(timeoutIntervalId);
          log.debug(`Finished Docker Exec OK. Output: ${output.length} bytes`);
          resolve(output);
        });
      });
    });
  }

  public static async getPublicPort(
    privatePort: number,
    aContainerInfo: ContainerInfo,
  ): Promise<number> {
    const fnTag = `Containers#getPublicPort(privatePort=${privatePort})`;
    const { Ports: ports } = aContainerInfo;

    if (ports.length < 1) {
      throw new Error(`${fnTag} no ports exposed or mapped at all`);
    }
    const mapping = ports.find((x) => x.PrivatePort === privatePort);
    if (mapping) {
      if (!mapping.PublicPort) {
        throw new Error(`${fnTag} port ${privatePort} mapped but not public`);
      } else if (mapping.IP !== "0.0.0.0") {
        throw new Error(`${fnTag} port ${privatePort} mapped to localhost`);
      } else {
        return mapping.PublicPort;
      }
    } else {
      throw new Error(`${fnTag} no mapping found for ${privatePort}`);
    }
  }

  public static async getContainerInternalIp(
    containerInfo: ContainerInfo,
  ): Promise<string> {
    const fnTag = "Containers#getContainerInternalIp()";
    Checks.truthy(containerInfo, `${fnTag} arg #1 containerInfo`);

    const { NetworkSettings } = containerInfo;
    const networkNames: string[] = Object.keys(NetworkSettings.Networks);

    if (networkNames.length < 1) {
      throw new Error(`${fnTag} container not connected to any networks`);
    } else {
      // return IP address of container on the first network that we found it connected to. Make this configurable?
      return NetworkSettings.Networks[networkNames[0]].IPAddress;
    }
  }
  public static pullImage(
    imageFqn: string,
    options: any = {},
    logLevel?: LogLevelDesc,
  ): Promise<any[]> {
    const defaultLoggerOptions: ILoggerOptions = {
      label: "containers#pullImage()",
      level: logLevel || "INFO",
    };
    const log = LoggerProvider.getOrCreate(defaultLoggerOptions);
    const task = () => Containers.tryPullImage(imageFqn, options, logLevel);
    const retryOptions: pRetry.Options = {
      retries: 6,
      onFailedAttempt: async (ex) => {
        log.debug(`Failed attempt at pulling container image ${imageFqn}`, ex);
      },
    };
    return pRetry(task, retryOptions);
  }

  public static tryPullImage(
    imageFqn: string,
    options: any = {},
    logLevel?: LogLevelDesc,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const loggerOptions: ILoggerOptions = {
        label: "containers#tryPullImage()",
        level: logLevel || "INFO",
      };
      const log = LoggerProvider.getOrCreate(loggerOptions);

      const docker = new Dockerode();

      const pullStreamStartedHandler = (pullError: any, stream: any) => {
        if (pullError) {
          log.error(`Could not even start ${imageFqn} pull:`, pullError);
          reject(pullError);
        } else {
          log.debug(`Started ${imageFqn} pull progress stream OK`);
          docker.modem.followProgress(
            stream,
            (progressError: any, output: any[]) => {
              if (progressError) {
                log.error(`Failed to finish ${imageFqn} pull:`, progressError);
                reject(progressError);
              } else {
                log.debug(`Finished ${imageFqn} pull completely OK`);
                resolve(output);
              }
            },
          );
        }
      };

      docker.pull(imageFqn, options, pullStreamStartedHandler);
    });
  }

  public static stop(container: Container): Promise<any> {
    const fnTag = "Containers#stop()";
    return new Promise((resolve, reject) => {
      if (container) {
        container.stop({}, (err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        return reject(new Error(`${fnTag} Container was not running.`));
      }
    });
  }

  public static async getById(containerId: string): Promise<ContainerInfo> {
    const fnTag = `Containers#getById()`;

    Checks.nonBlankString(containerId, `${fnTag}:containerId`);

    const docker = new Dockerode();
    const containerInfos = await docker.listContainers({});
    const aContainerInfo = containerInfos.find((ci) => ci.Id === containerId);

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no container by ID"${containerId}"`);
    }
  }

  /**
   * Awaits until a container identified by the containerId
   * parameter becomes healthy.
   * @param containerId The ID of the container to wait for the healthy status.
   * @param timeoutMs How much (in milliseconds) do we wait before giving up.
   */
  public static async waitForHealthCheck(
    containerId: string,
    timeoutMs = 180000,
  ): Promise<void> {
    const fnTag = "Containers#waitForHealthCheck()";

    Checks.nonBlankString(containerId, `${fnTag}:containerId`);

    const startedAt = Date.now();
    let reachable = false;
    do {
      try {
        const { Status } = await Containers.getById(containerId);
        reachable = Status.endsWith(" (healthy)");
      } catch (ex) {
        // FIXME: if the container is slow to start this might trip with a
        // false positive because there is no container YET in the beginning.
        // if (ex.stack.includes(`no container by ID"${containerId}"`)) {
        //   throw new Error(
        //     `${fnTag} container crashed while awaiting healthheck -> ${ex.stack}`,
        //   );
        // }
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
        }
        reachable = false;
      }
      await new Promise((resolve2) => setTimeout(resolve2, 1000));
    } while (!reachable);
  }

  /**
   * Attempts to prune all docker resources that are unused on the current
   * docker host in the following order:
   * 1. Containers
   * 2. Volumes
   * 3. Images
   * 4. Networks
   *
   * @returns A complete rundown of how each pruning process worked out
   * where the properties pertaining to the pruning processes are `undefined`
   * if they failed.
   */
  public static async pruneDockerResources(
    req?: IPruneDockerResourcesRequest,
  ): Promise<IPruneDockerResourcesResponse> {
    const fnTag = `Containers#pruneDockerResources()`;
    const level = req?.logLevel || "INFO";
    const log = LoggerProvider.getOrCreate({ level, label: fnTag });
    const docker = new Dockerode();
    let containers;
    let volumes;
    let images;
    let networks;
    log.debug(`Pruning all docker resources...`);
    try {
      const { all } = await execa("docker", ["system", "df"], { all: true });
      log.debug(all);
    } catch (ex) {
      log.info(`Ignoring failure of docker system df.`, ex);
    }
    try {
      containers = await docker.pruneContainers();
    } catch (ex) {
      log.warn(`Failed to prune docker containers: `, ex);
    }
    try {
      images = await docker.pruneImages();
    } catch (ex) {
      log.warn(`Failed to prune docker images: `, ex);
    }
    try {
      volumes = await docker.pruneVolumes();
    } catch (ex) {
      log.warn(`Failed to prune docker volumes: `, ex);
    }
    try {
      networks = await docker.pruneNetworks();
    } catch (ex) {
      log.warn(`Failed to prune docker networks: `, ex);
    }

    const existingImages = await docker.listImages();
    const imageIds = existingImages.map((it) => it.Id);
    log.debug(`Clearing ${imageIds.length} images.... %o`, imageIds);

    const cleanUpCmds = [
      { binary: "docker", args: ["rmi", ...imageIds] },
      { binary: "docker", args: ["volume", "prune", "--force"] },
    ];
    for (const { binary, args } of cleanUpCmds) {
      try {
        const { all, command } = await execa(binary, args, { all: true });
        log.debug(command);
        log.debug(all);
      } catch (ex) {
        // The first 3 commands might fail if there are no containers or images
        // to delete (e.g. their number is zero)
        log.info("Ignoring docker resource cleanup command failure.", ex);
      }
    }
    const response: IPruneDockerResourcesResponse = {
      containers,
      images,
      networks,
      volumes,
    };

    log.debug(`Finished pruning all docker resources. Outcome: %o`, response);
    try {
      const { all } = await execa("df", [], { all: true });
      log.debug(all);
    } catch (ex) {
      log.info(`Ignoring failure of df.`, ex);
    }
    try {
      const { all } = await execa("docker", ["system", "df"], { all: true });
      log.debug(all);
    } catch (ex) {
      log.info(`Ignoring failure of docker system df.`, ex);
    }
    return response;
  }
}
