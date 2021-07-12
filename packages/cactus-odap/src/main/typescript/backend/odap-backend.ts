import { AddressInfo } from "net";
import { Server } from "http";

import { JWK } from "jose";
import { v4 as uuidv4 } from "uuid";
import exitHook, { IAsyncExitHookDoneCallback } from "async-exit-hook";

import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
  IPluginKeychain,
  Ledger,
  LedgerType,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Servers,
} from "@hyperledger/cactus-common";

import { ApiServer, ConfigService } from "@hyperledger/cactus-cmd-api-server";

import { DefaultApi as OdapApi } from "../generated/openapi/typescript-axios/api";
import { OdapGateWayCactusPlugin } from "../business-logic-plugin/odap-gateway-cactus-plugin";

//TODO: replace this
import { Configuration } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

export interface IOdapGateWayNodeOptions {
  disableSignalHandlers?: true;
  logLevel?: LogLevelDesc;
  keychain?: IPluginKeychain;
}

export type ShutdownHook = () => Promise<void>;
//TODO: Generate fabric connector and set in the pluginRegistry
export class OdapGateWayNode {
  private readonly log: Logger;
  private readonly shutdownHooks: ShutdownHook[];
  private _odapApiClient?: OdapApi;

  public get OdapApiClientOrThrow(): OdapApi {
    if (this._odapApiClient) {
      return this._odapApiClient;
    } else {
      throw new Error("Invalid state: odap gate way were not started yet.");
    }
  }

  public constructor(public readonly options: IOdapGateWayNodeOptions) {
    const fnTag = "OdapGateWayNode#constructor()";

    if (!options) {
      throw new Error(`${fnTag} options parameter is falsy`);
    }
    const { logLevel } = options;

    const level = logLevel || "INFO";
    const label = "odap-gate-way-node";
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.shutdownHooks = [];
  }

  public async start(port: number): Promise<IStartInfo> {
    this.log.debug(`Starting SupplyChainApp...`);

    if (!this.options.disableSignalHandlers) {
      exitHook((callback: IAsyncExitHookDoneCallback) => {
        this.stop().then(callback);
      });
      this.log.debug(`Registered signal handlers for graceful auto-shutdown`);
    }

    // Reserve the ports where the Cactus nodes will run API servers, GUI
    const httpApiA = await Servers.startOnPort(port, "0.0.0.0");
    const httpGuiA = await Servers.startOnPort(3000, "0.0.0.0");

    const addressInfoA = httpApiA.address() as AddressInfo;
    const nodeApiHostA = `http://localhost:${addressInfoA.port}`;

    const odapGateWayConfig = new Configuration({ basePath: nodeApiHostA });

    const odapGateWayApiClient = new OdapApi(odapGateWayConfig);

    this.log.info(`Configuring Cactus Node for Ledger A...`);

    const registryA = new PluginRegistry({
      plugins: [
        new OdapGateWayCactusPlugin({
          instanceId: "OdapGateWayCactusPlugin_A",
          odapGateWayApiClient: odapGateWayApiClient,
          logLevel: this.options.logLevel,
        }),
      ],
    });

    const apiServerA = await this.startNode(httpApiA, httpGuiA, registryA);

    this.log.info(`Configuring Cactus Node for Ledger C...`);

    return {
      apiServerA,
      OdapGateWayApiClientA: new OdapApi(
        new Configuration({ basePath: nodeApiHostA })
      ),
    };
  }

  public async stop(): Promise<void> {
    for (const hook of this.shutdownHooks) {
      await hook(); // FIXME add timeout here so that shutdown does not hang
    }
  }

  public onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  public async startNode(
    httpServerApi: Server,
    httpServerCockpit: Server,
    pluginRegistry: PluginRegistry,
  ): Promise<ApiServer> {
    const addressInfoApi = httpServerApi.address() as AddressInfo;
    const addressInfoCockpit = httpServerCockpit.address() as AddressInfo;

    const configService = new ConfigService();
    const config = configService.getOrCreate();
    const properties = config.getProperties();

    properties.plugins = [];
    properties.configFile = "";
    properties.apiPort = addressInfoApi.port;
    properties.apiHost = addressInfoApi.address;
    properties.cockpitHost = addressInfoCockpit.address;
    properties.cockpitPort = addressInfoCockpit.port;
    properties.logLevel = this.options.logLevel || "INFO";

    const apiServer = new ApiServer({
      config: properties,
      httpServerApi,
      httpServerCockpit,
      pluginRegistry,
    });

    this.onShutdown(() => apiServer.shutdown());

    await apiServer.start();

    return apiServer;
  }
}

export interface IStartInfo {
  readonly apiServerA: ApiServer;
  readonly OdapGateWayApiClientA: OdapApi;
}
