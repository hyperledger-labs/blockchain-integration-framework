import path from "path";
import type { AddressInfo } from "net";
import tls from "tls";
import { Server, createServer } from "http";
import type { Server as SecureServer } from "https";
import { createServer as createSecureServer } from "https";
import { gte } from "semver";
import npm from "npm";
import expressHttpProxy from "express-http-proxy";
import type {
  Application,
  Request,
  Response,
  RequestHandler,
  NextFunction,
} from "express";
import express from "express";
// import { OpenApiValidator } from "express-openapi-validator";
import * as OpenApiValidator from "express-openapi-validator";
import compression from "compression";
import bodyParser from "body-parser";
import cors from "cors";

import { Server as SocketIoServer } from "socket.io";
import type { ServerOptions as SocketIoServerOptions } from "socket.io";
import type { Socket as SocketIoSocket } from "socket.io";
import { authorize as authorizeSocket } from "@thream/socketio-jwt";

import {
  ICactusPlugin,
  isIPluginWebService,
  IPluginWebService,
  IPluginFactoryOptions,
  PluginFactoryFactory,
  PluginImport,
  Constants,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";

import { Logger, LoggerProvider, Servers } from "@hyperledger/cactus-common";

import { ICactusApiServerOptions } from "./config/config-service";
import OAS from "../json/openapi.json";
import {
  OpenApiRequestHandler,
  OpenAPIV3,
  OpenApiValidatorOpts,
} from "express-openapi-validator/dist/framework/types";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";
import { AuthorizerFactory } from "./authzn/authorizer-factory";
import { WatchHealthcheckV1 } from "./generated/openapi/typescript-axios";
import { WatchHealthcheckV1Endpoint } from "./web-services/watch-healthcheck-v1-endpoint";
export interface IApiServerConstructorOptions {
  pluginRegistry?: PluginRegistry;
  httpServerApi?: Server | SecureServer;
  wsServerApi?: SocketIoServer;
  wsOptions?: SocketIoServerOptions;
  httpServerCockpit?: Server | SecureServer;
  config: ICactusApiServerOptions;
  prometheusExporter?: PrometheusExporter;
}

export class ApiServer {
  public static readonly CLASS_NAME = "ApiServer";
  public static readonly E_POST_CRASH_SHUTDOWN =
    "API server failed to shut itself down, will ignore this because we were already crashing anyway...";
  public static readonly E_NON_EXEMPT_UNPROTECTED_ENDPOINTS =
    `Non-exempt unprotected endpoints found. ` +
    `You can allow them as unprotected via the configuration of the ` +
    `API server by specifying an array of patterns in the property ` +
    `"unprotectedEndpointExemptions" of "authorizationConfigJson". ` +
    `This mechanism is meant to foster DevOps where both dev & ops ` +
    `work together in making secure application deployments a reality. ` +
    `The comma separated list of unprotected endpoints that were not marked as exempt: `;

  private readonly log: Logger;
  private pluginRegistry: PluginRegistry | undefined;
  private readonly httpServerApi: Server | SecureServer;
  private readonly httpServerCockpit: Server | SecureServer;
  private readonly wsApi: SocketIoServer;
  private readonly expressApi: Application;
  private readonly expressCockpit: Application;
  public prometheusExporter: PrometheusExporter;

  public get className(): string {
    return ApiServer.CLASS_NAME;
  }

  constructor(public readonly options: IApiServerConstructorOptions) {
    if (!options) {
      throw new Error(`ApiServer#ctor options was falsy`);
    }
    if (!options.config) {
      throw new Error(`ApiServer#ctor options.config was falsy`);
    }

    LoggerProvider.setLogLevel(options.config.logLevel);

    if (this.options.httpServerApi) {
      this.httpServerApi = this.options.httpServerApi;
    } else if (this.options.config.apiTlsEnabled) {
      this.httpServerApi = createSecureServer({
        key: this.options.config.apiTlsKeyPem,
        cert: this.options.config.apiTlsCertPem,
      });
    } else {
      this.httpServerApi = createServer();
    }

    if (this.options.httpServerCockpit) {
      this.httpServerCockpit = this.options.httpServerCockpit;
    } else if (this.options.config.cockpitTlsEnabled) {
      this.httpServerCockpit = createSecureServer({
        key: this.options.config.cockpitTlsKeyPem,
        cert: this.options.config.cockpitTlsCertPem,
      });
    } else {
      this.httpServerCockpit = createServer();
    }

    this.wsApi = new SocketIoServer();
    this.expressApi = express();
    this.expressCockpit = express();

    if (this.options.prometheusExporter) {
      this.prometheusExporter = this.options.prometheusExporter;
    } else {
      this.prometheusExporter = new PrometheusExporter({
        pollingIntervalInMin: 1,
      });
    }
    this.prometheusExporter.setTotalPluginImports(this.getPluginImportsCount());

    this.log = LoggerProvider.getOrCreate({
      label: "api-server",
      level: options.config.logLevel,
    });
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    this.prometheusExporter.setTotalPluginImports(this.getPluginImportsCount());
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getPluginImportsCount(): number {
    return this.pluginRegistry?.plugins.length || 0;
  }

  async start(): Promise<{
    addressInfoCockpit: AddressInfo;
    addressInfoApi: AddressInfo;
  }> {
    this.checkNodeVersion();
    const tlsMaxVersion = this.options.config.tlsDefaultMaxVersion;
    this.log.info("Setting tls.DEFAULT_MAX_VERSION to %s...", tlsMaxVersion);
    tls.DEFAULT_MAX_VERSION = tlsMaxVersion;

    try {
      const { cockpitTlsEnabled, apiTlsEnabled } = this.options.config;
      const addressInfoCockpit = await this.startCockpitFileServer();
      const addressInfoApi = await this.startApiServer();

      {
        const { apiHost: host } = this.options.config;
        const { port } = addressInfoApi;
        const protocol = apiTlsEnabled ? "https:" : "http:";
        const httpUrl = `${protocol}//${host}:${port}`;
        this.log.info(`Cactus API reachable ${httpUrl}`);
      }

      {
        const { cockpitHost: host } = this.options.config;
        const { port } = addressInfoCockpit;
        const protocol = cockpitTlsEnabled ? "https:" : "http:";
        const httpUrl = `${protocol}//${host}:${port}`;
        this.log.info(`Cactus Cockpit reachable ${httpUrl}`);
      }

      return { addressInfoCockpit, addressInfoApi };
    } catch (ex) {
      const errorMessage = `Failed to start ApiServer: ${ex.stack}`;
      this.log.error(errorMessage);
      this.log.error(`Attempting shutdown...`);
      try {
        await this.shutdown();
        this.log.info(`Server shut down after crash OK`);
      } catch (ex) {
        this.log.error(ApiServer.E_POST_CRASH_SHUTDOWN, ex);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Verifies that the currently running NodeJS process is at least of a certain
   * NodeJS version as specified by the configuration.
   *
   * @throws {Error} if the version contraint is not satisfied by the runtime.
   */
  public checkNodeVersion(currentVersion: string = process.version): void {
    if (gte(this.options.config.minNodeVersion, currentVersion)) {
      const msg =
        `ApiServer#checkNodeVersion() detected NodeJS ` +
        `v${process.version} that is outdated as per the configuration. ` +
        `If you must run on this NodeJS version you can override the minimum ` +
        `acceptable version via config parameters of the API server. ` +
        `Though doing so may lead to vulnerabilities in your deployment. ` +
        `You've been warned.`;
      throw new Error(msg);
    }
  }

  public getHttpServerApi(): Server | SecureServer {
    return this.httpServerApi;
  }

  public getHttpServerCockpit(): Server | SecureServer {
    return this.httpServerCockpit;
  }

  public async getOrInitPluginRegistry(): Promise<PluginRegistry> {
    if (!this.pluginRegistry) {
      if (!this.options.pluginRegistry) {
        this.log.info(`getOrInitPluginRegistry() initializing a new one...`);
        this.pluginRegistry = await this.initPluginRegistry();
      } else {
        this.log.info(`getOrInitPluginRegistry() re-using injected one...`);
        this.pluginRegistry = this.options.pluginRegistry;
      }
    }
    await this.prometheusExporter.setTotalPluginImports(
      await this.getPluginImportsCount(),
    );
    return this.pluginRegistry;
  }

  public async initPluginRegistry(): Promise<PluginRegistry> {
    const registry = new PluginRegistry({ plugins: [] });
    const { plugins } = this.options.config;
    this.log.info(`Instantiated empty registry, invoking plugin factories...`);

    for (const pluginImport of plugins) {
      const plugin = await this.instantiatePlugin(pluginImport, registry);
      registry.add(plugin);
    }

    return registry;
  }

  private async instantiatePlugin(
    pluginImport: PluginImport,
    registry: PluginRegistry,
  ): Promise<ICactusPlugin> {
    const { logLevel } = this.options.config;
    const { packageName, options } = pluginImport;
    this.log.info(`Creating plugin from package: ${packageName}`, options);
    const pluginOptions = { ...options, logLevel, pluginRegistry: registry };

    await this.installPluginPackage(pluginImport);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pluginPackage = require(/* webpackIgnore: true */ packageName);
    const createPluginFactory = pluginPackage.createPluginFactory as PluginFactoryFactory;

    const pluginFactoryOptions: IPluginFactoryOptions = {
      pluginImportType: pluginImport.type,
    };

    const pluginFactory = await createPluginFactory(pluginFactoryOptions);

    const plugin = await pluginFactory.create(pluginOptions);
    return plugin;
  }

  private async installPluginPackage(
    pluginImport: PluginImport,
  ): Promise<void> {
    const fnTag = `ApiServer#installPluginPackage()`;
    const { packageName: pkgName } = pluginImport;

    const npmLogHandler = (message: unknown) => {
      this.log.debug(`${fnTag} [npm-log]:`, message);
    };

    const cleanUpNpmLogHandler = () => {
      npm.off("log", npmLogHandler);
    };

    try {
      this.log.info(`Installing ${pkgName} for plugin import`, pluginImport);
      npm.on("log", npmLogHandler);

      await new Promise<void>((resolve, reject) => {
        npm.load((err?: Error) => {
          if (err) {
            this.log.error(`${fnTag} npm load fail:`, err);
            const { message, stack } = err;
            reject(new Error(`${fnTag} npm load fail: ${message}: ${stack}`));
          } else {
            npm.config.set("save", false);
            npm.config.set("audit", false);
            npm.config.set("progress", false);
            resolve();
          }
        });
      });

      await new Promise<unknown>((resolve, reject) => {
        const npmInstallHandler = (errInstall?: Error, result?: unknown) => {
          if (errInstall) {
            this.log.error(`${fnTag} npm install failed:`, errInstall);
            const { message: m, stack } = errInstall;
            reject(new Error(`${fnTag} npm install fail: ${m}: ${stack}`));
          } else {
            this.log.info(`Installed ${pkgName} OK`, result);
            resolve(result);
          }
        };

        npm.commands.install([pkgName], npmInstallHandler);
      });
    } finally {
      cleanUpNpmLogHandler();
    }
  }

  public async shutdown(): Promise<void> {
    this.log.info(`Shutting down API server ...`);

    const registry = await this.getOrInitPluginRegistry();

    const webServicesShutdown = registry
      .getPlugins()
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map((pluginInstance: ICactusPlugin) => {
        return (pluginInstance as IPluginWebService).shutdown();
      });

    this.log.info(`Stopping ${webServicesShutdown.length} WS plugin(s)...`);
    await Promise.all(webServicesShutdown);
    this.log.info(`Stopped ${webServicesShutdown.length} WS plugin(s) OK`);

    if (this.httpServerApi?.listening) {
      this.log.info(`Closing HTTP server of the API...`);
      await Servers.shutdown(this.httpServerApi);
      this.log.info(`Close HTTP server of the API OK`);
    }

    if (this.httpServerCockpit?.listening) {
      this.log.info(`Closing HTTP server of the cockpit ...`);
      await Servers.shutdown(this.httpServerCockpit);
      this.log.info(`Close HTTP server of the cockpit OK`);
    }
  }

  async startCockpitFileServer(): Promise<AddressInfo> {
    const { expressCockpit: app } = this;
    const cockpitWwwRoot = this.options.config.cockpitWwwRoot;
    this.log.info(`wwwRoot: ${cockpitWwwRoot}`);

    const resolvedWwwRoot = path.resolve(process.cwd(), cockpitWwwRoot);
    this.log.info(`resolvedWwwRoot: ${resolvedWwwRoot}`);

    const resolvedIndexHtml = path.resolve(resolvedWwwRoot + "/index.html");
    this.log.info(`resolvedIndexHtml: ${resolvedIndexHtml}`);

    const cockpitCorsDomainCsv = this.options.config.cockpitCorsDomainCsv;
    const allowedDomains = cockpitCorsDomainCsv.split(",");
    const corsMiddleware = this.createCorsMiddleware(allowedDomains);

    const {
      apiHost,
      apiPort,
      cockpitApiProxyRejectUnauthorized: rejectUnauthorized,
    } = this.options.config;
    const protocol = this.options.config.apiTlsEnabled ? "https:" : "http:";
    const apiHttpUrl = `${protocol}//${apiHost}:${apiPort}`;

    const apiProxyMiddleware = expressHttpProxy(apiHttpUrl, {
      // preserve the path whatever it was. Without this the proxy just uses /
      proxyReqPathResolver: (srcReq) => srcReq.originalUrl,

      proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        const { originalUrl: thePath } = srcReq;
        const srcHost = srcReq.header("host");
        const { host: destHostname, port: destPort } = proxyReqOpts;
        const destHost = `${destHostname}:${destPort}`;
        this.log.debug(`PROXY ${srcHost} => ${destHost} :: ${thePath}`);

        // make sure self signed certs are accepted if it was configured as such by the user
        (proxyReqOpts as any).rejectUnauthorized = rejectUnauthorized;
        return proxyReqOpts;
      },
    });

    app.use("/api/v*", apiProxyMiddleware);
    app.use(compression());
    app.use(corsMiddleware);
    app.use(express.static(resolvedWwwRoot));
    app.get("/*", (_, res) => res.sendFile(resolvedIndexHtml));

    const cockpitPort: number = this.options.config.cockpitPort;
    const cockpitHost: string = this.options.config.cockpitHost;

    if (!this.httpServerCockpit.listening) {
      await new Promise((resolve, reject) => {
        this.httpServerCockpit.once("error", reject);
        this.httpServerCockpit.once("listening", resolve);
        this.httpServerCockpit.listen(cockpitPort, cockpitHost);
      });
    }
    this.httpServerCockpit.on("request", app);

    // the address() method returns a string for unix domain sockets and null
    // if the server is not listening but we don't car about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerCockpit.address() as AddressInfo;
    this.log.info(`Cactus Cockpit net.AddressInfo`, addressInfo);

    return addressInfo;
  }

  /**
   * Installs the own endpoints of the API server such as the ones providing
   * healthcheck and monitoring information.
   * @param app
   */
  async getOrCreateWebServices(app: express.Application): Promise<void> {
    const { log } = this;
    const { logLevel } = this.options.config;

    const healthcheckHandler = (req: Request, res: Response) => {
      res.json({
        success: true,
        createdAt: new Date(),
        memoryUsage: process.memoryUsage(),
      });
    };

    const { "/api/v1/api-server/healthcheck": oasPath } = OAS.paths;
    const { http } = oasPath.get["x-hyperledger-cactus"];
    const { path: httpPath, verbLowerCase: httpVerb } = http;
    (app as any)[httpVerb](httpPath, healthcheckHandler);

    this.wsApi.on("connection", (socket: SocketIoSocket) => {
      const { id } = socket;
      const transport = socket.conn.transport.name; // in most cases, "polling"
      log.debug(`Socket connected. ID=${id} transport=%o`, transport);

      socket.conn.on("upgrade", () => {
        const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
        log.debug(`Socket upgraded ID=${id} transport=%o`, upgradedTransport);
      });

      socket.on(WatchHealthcheckV1.Subscribe, () =>
        new WatchHealthcheckV1Endpoint({
          process,
          socket,
          logLevel,
        }).subscribe(),
      );
    });

    const prometheusExporterHandler = (req: Request, res: Response) => {
      this.getPrometheusExporterMetrics().then((resBody) => {
        res.status(200);
        res.send(resBody);
      });
    };

    const {
      "/api/v1/api-server/get-prometheus-exporter-metrics": oasPathPrometheus,
    } = OAS.paths;
    const { http: httpPrometheus } = oasPathPrometheus.get[
      "x-hyperledger-cactus"
    ];
    const {
      path: httpPathPrometheus,
      verbLowerCase: httpVerbPrometheus,
    } = httpPrometheus;
    (app as any)[httpVerbPrometheus](
      httpPathPrometheus,
      prometheusExporterHandler,
    );
  }

  async startApiServer(): Promise<AddressInfo> {
    const { options, expressApi: app, wsApi } = this;
    const { config } = options;
    const {
      authorizationConfigJson: authzConf,
      authorizationProtocol: authzProtocol,
      logLevel,
    } = config;
    const apiServerOptions = config;

    const pluginRegistry = await this.getOrInitPluginRegistry();

    app.use(compression());

    const apiCorsDomainCsv = this.options.config.apiCorsDomainCsv;
    const allowedDomains = apiCorsDomainCsv.split(",");
    const corsMiddleware = this.createCorsMiddleware(allowedDomains);
    app.use(corsMiddleware);
    app.use(bodyParser.json({ limit: "50mb" }));

    const authzFactoryOptions = { apiServerOptions, pluginRegistry, logLevel };
    const authzFactory = new AuthorizerFactory(authzFactoryOptions);
    await authzFactory.initOnce();
    const authorizerO = await authzFactory.createMiddleware(
      authzProtocol,
      authzConf,
    );
    if (authorizerO.isPresent()) {
      const authorizer = authorizerO.get();
      this.checkNonExemptUnprotectedEps(authzFactory);
      app.use(authorizer);
      this.log.info(`Authorization request handler configured OK.`);
    }

    const openApiValidator = this.createOpenApiValidator();
    app.use(openApiValidator);
    // manage errors caused by api validation
    app.use(
      (
        err: {
          status?: number;
          errors: [
            {
              path: string;
              message: string;
              errorCode: string;
            },
          ];
        },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        if (err) {
          res.status(err.status || 500);
          res.send(err.errors);
        } else {
          next();
        }
      },
    );

    this.getOrCreateWebServices(app); // The API server's own endpoints

    this.log.info(`Starting to install web services...`);

    const webServicesInstalled = pluginRegistry
      .getPlugins()
      .filter((pluginInstance) => isIPluginWebService(pluginInstance))
      .map(async (plugin: ICactusPlugin) => {
        const p = plugin as IPluginWebService;
        await p.getOrCreateWebServices();
        const webSvcs = await p.registerWebServices(app, wsApi);
        return webSvcs;
      });

    const endpoints2D = await Promise.all(webServicesInstalled);
    this.log.info(`Installed ${webServicesInstalled.length} web service(s) OK`);

    const endpoints = endpoints2D.reduce((acc, val) => acc.concat(val), []);
    endpoints.forEach((ep) => this.log.info(`Endpoint={path=${ep.getPath()}}`));

    const apiPort: number = this.options.config.apiPort;
    const apiHost: string = this.options.config.apiHost;

    if (!this.httpServerApi.listening) {
      await new Promise((resolve, reject) => {
        this.httpServerApi.once("error", reject);
        this.httpServerApi.once("listening", resolve);
        this.httpServerApi.listen(apiPort, apiHost);
      });
    }
    this.httpServerApi.on("request", app);

    // the address() method returns a string for unix domain sockets and null
    // if the server is not listening but we don't care about any of those cases
    // so the casting here should be safe. Famous last words... I know.
    const addressInfo = this.httpServerApi.address() as AddressInfo;
    this.log.info(`Cactus API net.AddressInfo`, addressInfo);

    const wsOptions = {
      path: Constants.SocketIoConnectionPathV1,
      serveClient: false,
      ...this.options.wsOptions,
    } as SocketIoServerOptions;

    this.wsApi.attach(this.httpServerApi, wsOptions);

    const socketIoAuthorizer = authorizeSocket({
      ...authzConf.socketIoJwtOptions,
      onAuthentication: (decodedToken) => {
        this.log.debug("Socket authorized OK: %o", decodedToken);
      },
    });

    this.wsApi.use(socketIoAuthorizer);

    return addressInfo;
  }

  private checkNonExemptUnprotectedEps(factory: AuthorizerFactory): void {
    const { config } = this.options;
    const { authorizationConfigJson } = config;
    const { unprotectedEndpointExemptions } = authorizationConfigJson;

    const nonExempts = factory.unprotectedEndpoints.filter(
      (nse) =>
        !unprotectedEndpointExemptions.some((pt) => nse.getPath().match(pt)),
    );
    if (nonExempts.length > 0) {
      const csv = nonExempts.join(", ");
      const { E_NON_EXEMPT_UNPROTECTED_ENDPOINTS } = ApiServer;
      throw new Error(`${E_NON_EXEMPT_UNPROTECTED_ENDPOINTS} ${csv}`);
    }
  }

  createOpenApiValidator(): OpenApiRequestHandler[] {
    const options: OpenApiValidatorOpts = {
      apiSpec: OAS as OpenAPIV3.Document,
      validateRequests: true,
      validateResponses: false,
    };
    return OpenApiValidator.middleware(options);
  }

  createCorsMiddleware(allowedDomains: string[]): RequestHandler {
    const allDomainsOk = allowedDomains.includes("*");

    const corsOptionsDelegate = (req: Request, callback: any) => {
      const origin = req.header("Origin");
      const isDomainOk = origin && allowedDomains.includes(origin);
      // this.log.debug("CORS %j %j %s", allDomainsOk, isDomainOk, req.originalUrl);

      let corsOptions;
      if (allDomainsOk) {
        corsOptions = { origin: "*" }; // reflect (enable) the all origins in the CORS response
      } else if (isDomainOk) {
        corsOptions = { origin }; // reflect (enable) the requested origin in the CORS response
      } else {
        corsOptions = { origin: false }; // disable CORS for this request
      }
      callback(null, corsOptions); // callback expects two parameters: error and options
    };
    return cors(corsOptionsDelegate);
  }
}
