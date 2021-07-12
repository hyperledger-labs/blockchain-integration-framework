/* eslint-disable @typescript-eslint/no-unused-vars */
import { API as BitswapAPI } from "ipfs-core-types/src/bitswap";
import { API as BlockAPI } from "ipfs-core-types/src/block";
import { API as BootstrapAPI } from "ipfs-core-types/src/bootstrap";
import { API as ConfigAPI } from "ipfs-core-types/src/config";
import { API as DAGAPI } from "ipfs-core-types/src/dag";
import { API as DHTAPI } from "ipfs-core-types/src/dht";
import { API as DiagAPI } from "ipfs-core-types/src/diag";
import { API as FilesAPI } from "ipfs-core-types/src/files";
import { API as KeyAPI } from "ipfs-core-types/src/key";
import { API as LogAPI } from "ipfs-core-types/src/log";
import { API as NameAPI } from "ipfs-core-types/src/name";
import { API as ObjectAPI } from "ipfs-core-types/src/object";
import { API as PinAPI } from "ipfs-core-types/src/pin";
import { API as PubsubAPI } from "ipfs-core-types/src/pubsub";
import { Refs, Local } from "ipfs-core-types/src/refs";
import { API as RepoAPI } from "ipfs-core-types/src/repo";
import { API as StatsAPI } from "ipfs-core-types/src/stats";
import { API as SwarmAPI } from "ipfs-core-types/src/swarm";
import { AbortOptions } from "ipfs-core-types";
import {
  AddOptions,
  AddResult,
  AddAllOptions,
  CatOptions,
  GetOptions,
  IPFSEntry,
  ListOptions,
  IDOptions,
  IDResult,
  VersionResult,
  DNSOptions,
  PingOptions,
  PingResult,
  ResolveOptions,
  MountOptions,
  MountResult,
} from "ipfs-core-types/src/root";
import {
  ImportCandidate,
  ImportCandidateStream,
  IPFSPath,
} from "ipfs-core-types/src/utils";
import { EndpointConfig } from "ipfs-http-client/dist/src/types";

import { RuntimeError } from "run-time-error";

import { Logger, Checks, LogLevelDesc } from "@hyperledger/cactus-common";
import { LoggerProvider } from "@hyperledger/cactus-common";

import { IIpfsHttpClient } from "../../../../../main/typescript";
import { FilesApiMock } from "./ipfs-files-api-mock";

interface RefsAPI extends Refs {
  local: Local;
}

export interface IIpfsHttpClientMockOptions {
  logLevel?: LogLevelDesc;
}

export class IpfsHttpClientMock implements IIpfsHttpClient {
  public static readonly CLASS_NAME = "IpfsHttpClientMock";

  private readonly logger: Logger;

  public readonly bitswap: BitswapAPI;
  public readonly block: BlockAPI;
  public readonly bootstrap: BootstrapAPI;
  public readonly config: ConfigAPI;
  public readonly dag: DAGAPI;
  public readonly dht: DHTAPI;
  public readonly diag: DiagAPI;
  public readonly files: FilesAPI;
  public readonly key: KeyAPI;
  public readonly log: LogAPI;
  public readonly name: NameAPI;
  public readonly object: ObjectAPI;
  public readonly pin: PinAPI;
  public readonly pubsub: PubsubAPI;
  public readonly refs: RefsAPI;
  public readonly repo: RepoAPI;
  public readonly stats: StatsAPI;
  public readonly swarm: SwarmAPI;

  public get className(): string {
    return IpfsHttpClientMock.CLASS_NAME;
  }

  constructor(public readonly options: IIpfsHttpClientMockOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.bitswap = {} as BitswapAPI;
    this.block = {} as BlockAPI;
    this.bootstrap = {} as BootstrapAPI;
    this.config = {} as ConfigAPI;
    this.dag = {} as DAGAPI;
    this.dht = {} as DHTAPI;
    this.diag = {} as DiagAPI;
    this.files = new FilesApiMock({ logLevel: this.options.logLevel });
    this.key = {} as KeyAPI;
    this.log = {} as LogAPI;
    this.name = {} as NameAPI;
    this.object = {} as ObjectAPI;
    this.pin = {} as PinAPI;
    this.pubsub = {} as PubsubAPI;
    this.refs = {} as RefsAPI;
    this.repo = {} as RepoAPI;
    this.stats = {} as StatsAPI;
    this.swarm = {} as SwarmAPI;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.logger = LoggerProvider.getOrCreate({ level, label });
    this.logger.debug(`Instantiated ${this.className} OK`);
  }

  public getEndpointConfig(): EndpointConfig {
    throw new RuntimeError("Method getEndpointConfig() not implemented.");
  }

  public add(
    entry: ImportCandidate,
    options?: AddOptions | undefined,
  ): Promise<AddResult> {
    throw new RuntimeError("Method add() not implemented.");
  }

  public addAll(
    source: ImportCandidateStream,
    options?: (AddAllOptions & AbortOptions) | undefined,
  ): AsyncIterable<AddResult> {
    throw new RuntimeError("Method addAll() not implemented.");
  }

  public cat(
    ipfsPath: IPFSPath,
    options?: CatOptions | undefined,
  ): AsyncIterable<Uint8Array> {
    throw new RuntimeError("Method cat() not implemented.");
  }

  get(
    ipfsPath: IPFSPath,
    options?: GetOptions | undefined,
  ): AsyncIterable<IPFSEntry> {
    throw new RuntimeError("Method get() not implemented.");
  }

  ls(
    ipfsPath: IPFSPath,
    options?: ListOptions | undefined,
  ): AsyncIterable<IPFSEntry> {
    throw new RuntimeError("Method ls() not implemented.");
  }

  public async id(options?: IDOptions | undefined): Promise<IDResult> {
    throw new RuntimeError("Method id() not implemented.");
  }

  public async version(
    options?: AbortOptions | undefined,
  ): Promise<VersionResult> {
    throw new RuntimeError("Method version() not implemented.");
  }

  public async dns(
    domain: string,
    options?: DNSOptions | undefined,
  ): Promise<string> {
    throw new RuntimeError("Method dns() not implemented.");
  }

  public async start(): Promise<void> {
    throw new RuntimeError("Method start() not implemented.");
  }

  public async stop(options?: AbortOptions | undefined): Promise<void> {
    throw new RuntimeError("Method stop() not implemented.");
  }

  ping(
    peerId: string,
    options?: PingOptions | undefined,
  ): AsyncIterable<PingResult> {
    throw new RuntimeError("Method ping() not implemented.");
  }

  public async resolve(
    name: string,
    options?: ResolveOptions | undefined,
  ): Promise<string> {
    throw new RuntimeError("Method resolve() not implemented.");
  }

  public async commands(options?: AbortOptions | undefined): Promise<string[]> {
    throw new RuntimeError("Method commands() not implemented.");
  }

  public async mount(options?: MountOptions | undefined): Promise<MountResult> {
    throw new RuntimeError("Method mount() not implemented.");
  }

  public isOnline(): boolean {
    return true;
  }
}
