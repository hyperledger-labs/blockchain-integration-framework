const tap = require("tap");
import { AxiosResponse } from "axios";
import { Server } from "http";
import { v4 as uuidV4 } from "uuid";
import { JWK } from "jose";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  CactusNode,
  ConsortiumMember,
  Consortium,
  ConsortiumDatabase,
} from "@hyperledger/cactus-core-api";
import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  DefaultApi as DefaultApiPlugin,
  Configuration as ConfigurationPlugin,
  PluginConsortiumManual,
  IPluginConsortiumManualOptions,
} from "@hyperledger/cactus-plugin-consortium-manual";

LoggerProvider.setLogLevel("TRACE");
const log: Logger = LoggerProvider.getOrCreate({
  label: "security-isolation-via-api-server-ports",
});

tap.test(
  "pulls up API server with consortium web service on different port",
  async (assert: any) => {
    // 1. Instantiate a key value storage plugin that works in memory (good here because we don't need persistence)
    const opts = {
      backend: new Map(),
      instanceId: uuidV4(),
      keychainId: uuidV4(),
    };
    const kvStoragePlugin = new PluginKeychainMemory(opts);

    // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
    const pluginRegistry = new PluginRegistry({ plugins: [kvStoragePlugin] });

    const keyPair = await JWK.generate("EC", "secp256k1");
    const keyPairPem = keyPair.toPEM(true);

    const consortiumName = "Example Corp. & Friends Crypto Consortium";
    const consortiumId = uuidV4();
    const memberId = uuidV4();
    const nodeId = uuidV4();

    const cactusNode: CactusNode = {
      nodeApiHost: "127.0.0.1:4000",
      memberId,
      publicKeyPem: keyPair.toPEM(false),
      consortiumId,
      id: nodeId,
      pluginInstanceIds: [],
      ledgerIds: [],
    };

    const member: ConsortiumMember = {
      id: memberId,
      nodeIds: [cactusNode.id],
      name: "Example Corp",
    };

    const consortium: Consortium = {
      id: consortiumId,
      name: consortiumName,
      mainApiHost: "http://127.0.0.1:80",
      memberIds: [member.id],
    };

    const consortiumDatabase: ConsortiumDatabase = {
      cactusNode: [cactusNode],
      consortiumMember: [member],
      ledger: [],
      pluginInstance: [],
      consortium: [consortium],
    };

    const consortiumRepo = new ConsortiumRepository({ db: consortiumDatabase });

    // 3. Instantiate the web service consortium plugin which will host itself on a new TCP port for isolation/security
    // Note that if we omitted the `webAppOptions` object that the web service plugin would default to installing itself
    // on the default port of the API server. This allows for flexibility in deployments.
    const options: IPluginConsortiumManualOptions = {
      instanceId: uuidV4(),
      pluginRegistry,
      keyPairPem,
      consortiumDatabase,
      logLevel: "trace",
      webAppOptions: {
        hostname: "127.0.0.1",
        port: 0,
      },
      consortiumRepo,
    };
    const pluginConsortiumManual = new PluginConsortiumManual(options);

    // 4. Create the API Server object that we embed in this test
    const configService = new ConfigService();
    const apiServerOptions = configService.newExampleConfig();
    apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
    apiServerOptions.configFile = "";
    apiServerOptions.apiCorsDomainCsv = "*";
    apiServerOptions.apiPort = 0;
    apiServerOptions.apiTlsEnabled = false;
    const config = configService.newExampleConfigConvict(apiServerOptions);

    pluginRegistry.add(pluginConsortiumManual);

    const apiServer = new ApiServer({
      config: config.getProperties(),
      pluginRegistry,
    });
    assert.tearDown(() => apiServer.shutdown());

    // 5. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
    await apiServer.start();

    // 6. Instantiate the main SDK dynamically with whatever port the API server ended up bound to (port 0)
    const httpServer = apiServer.getHttpServerApi();
    const addressInfo: any = httpServer?.address();
    log.debug(`AddressInfo: `, addressInfo);

    // 8. Get the dedicated HTTP server of the web service plugin
    const httpServerConsortium: Server = pluginConsortiumManual
      .getHttpServer()
      .orElseThrow(
        () => new Error("PluginConsortiumManual HTTP server is not present"),
      );
    assert.ok(httpServerConsortium, "Get the plugin specific HTTP server");
    const addressInfoConsortium: any = httpServerConsortium.address();
    assert.ok(
      addressInfoConsortium,
      "Get the plugin specific AddressInfo object",
    );
    assert.ok(
      addressInfoConsortium.port,
      "plugin specific web app address info has a port",
    );
    assert.ok(
      addressInfoConsortium.address,
      "plugin specific web app address info has an address (host)",
    );

    // 9. Verify that the web service plugin is on a different port for security isolation
    assert.ok(
      addressInfoConsortium.port !== addressInfo.port,
      "plugin specific and API server base port are different",
    );

    const CACTUS_API_HOST2 = `http://${addressInfoConsortium.address}:${addressInfoConsortium.port}`;
    const configuration2 = new ConfigurationPlugin({
      basePath: CACTUS_API_HOST2,
      baseOptions: { timeout: 2000 },
    });
    const api2 = new DefaultApiPlugin(configuration2);

    const response: AxiosResponse = await api2.getNodeJwsV1();
    assert.ok(response, "response object is truthy");
    assert.ok(response.status === 200, "HTTP status code to equal 200");

    assert.end();
  },
);
