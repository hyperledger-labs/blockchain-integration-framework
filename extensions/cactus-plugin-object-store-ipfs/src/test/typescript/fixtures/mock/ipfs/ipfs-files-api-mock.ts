/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  API as FilesAPI,
  ChmodOptions,
  CpOptions,
  MFSEntry,
  MkdirOptions,
  MvOptions,
  ReadOptions,
  RmOptions,
  StatOptions,
  StatResult,
  TouchOptions,
  WriteOptions,
} from "ipfs-core-types/src/files";

import { Logger, Checks, LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";
import { AbortOptions } from "ipfs-core-types";
import { IPFSPath } from "ipfs-core-types/src/utils";
import { RuntimeError } from "run-time-error";
import { K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST } from "../../../../../main/typescript/plugin-object-store-ipfs";

export interface IFilesApiMockOptions {
  logLevel?: LogLevelDesc;
}

export class FilesApiMock implements FilesAPI {
  public static readonly CLASS_NAME = "FilesApiMock";

  private readonly log: Logger;
  private readonly data: Map<string, Buffer>;

  public get className(): string {
    return FilesApiMock.CLASS_NAME;
  }

  constructor(public readonly options: IFilesApiMockOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.data = new Map();

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.log.debug(`Instantiated ${this.className} OK`);
  }

  public async chmod(
    path: string,
    mode: string | number,
    options?: ChmodOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method chmod() not implemented");
  }

  public async cp(
    from: IPFSPath | IPFSPath[],
    to: string,
    options?: CpOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method cp() not implemented");
  }

  public async mkdir(
    path: string,
    options?: MkdirOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method mkdir() not implemented");
  }

  public async stat(
    ipfsPath: IPFSPath,
    options?: StatOptions | undefined,
  ): Promise<StatResult> {
    if (typeof ipfsPath !== "string") {
      throw new RuntimeError("Sorry, the mock only supports string IPFS paths");
    }
    if (this.data.has(ipfsPath)) {
      return {} as StatResult;
    } else {
      throw new RuntimeError(K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST);
    }
  }

  public async touch(
    ipfsPath: string,
    options?: TouchOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method touch() not implemented");
  }

  public async rm(
    ipfsPaths: string | string[],
    options?: RmOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method rm() not implemented");
  }

  public async *read(
    ipfsPath: IPFSPath,
    options?: ReadOptions | undefined,
  ): AsyncIterable<Uint8Array> {
    if (typeof ipfsPath !== "string") {
      throw new RuntimeError("Sorry, the mock only supports string IPFS paths");
    }
    const buffer = this.data.get(ipfsPath);
    if (!buffer) {
      throw new RuntimeError(K_IPFS_JS_HTTP_ERROR_FILE_DOES_NOT_EXIST);
    }
    yield buffer;
  }

  public async write(
    ipfsPath: string,
    content:
      | string
      | Uint8Array
      | AsyncIterable<Uint8Array>
      | Blob
      | Iterable<Uint8Array>,
    options?: WriteOptions | undefined,
  ): Promise<void> {
    if (!(content instanceof Buffer)) {
      throw new RuntimeError("Sorry, this mock only supports Buffer content.");
    }
    this.data.set(ipfsPath, content);
  }

  public async mv(
    from: string | string[],
    to: string,
    options?: MvOptions | undefined,
  ): Promise<void> {
    throw new RuntimeError("Method mv() not implemented");
  }

  public async flush(
    ipfsPath: string,
    options?: AbortOptions | undefined,
  ): Promise<import("cids")> {
    throw new RuntimeError("Method flush() not implemented");
  }

  public ls(
    ipfsPath: IPFSPath,
    options?: AbortOptions | undefined,
  ): AsyncIterable<MFSEntry> {
    throw new RuntimeError("Method ls() not implemented");
  }
}
