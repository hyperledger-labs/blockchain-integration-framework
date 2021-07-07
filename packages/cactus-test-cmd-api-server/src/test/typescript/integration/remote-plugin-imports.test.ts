import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  CactusKeychainVaultServer,
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import {
  DefaultApi,
  PluginFactoryKeychain,
} from "@hyperledger/cactus-plugin-keychain-vault";
import {
  Configuration,
  IPluginKeychain,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

test("NodeJS API server + Rust plugin work together", async (t: Test) => {
  const vaultTestContainer = new VaultTestServer({});
  await vaultTestContainer.start();

  const ci = await Containers.getById(vaultTestContainer.containerId);
  const vaultIpAddr = await Containers.getContainerInternalIp(ci);
  t.comment(`Container VaultTestServer has IPv4: ${vaultIpAddr}`);

  test.onFinish(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });

  const hostPortVault = await vaultTestContainer.getHostPortHttp();
  t.comment(`Container VaultTestServer (Port=${hostPortVault}) started OK`);
  const vaultHost = `http://${vaultIpAddr}:${K_DEFAULT_VAULT_HTTP_PORT}`;

  const pluginContainer = new CactusKeychainVaultServer({
    envVars: [
      `VAULT_HOST=${vaultHost}`,
      `VAULT_TOKEN=${K_DEFAULT_VAULT_DEV_ROOT_TOKEN}`,
      "HOST=0.0.0.0:8080",
    ],
  });
  await pluginContainer.start();

  test.onFinish(async () => {
    await pluginContainer.stop();
    await pluginContainer.destroy();
  });

  const hostPort = await pluginContainer.getHostPortHttp();
  t.comment(`CactusKeychainVaultServer (Port=${hostPort}) started OK`);

  const configuration = new Configuration({
    basePath: `http://localhost:${hostPort}`,
  });
  const apiClient = new DefaultApi(configuration);

  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = 0;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  apiServerOptions.plugins = [];
  const config = configService.newExampleConfigConvict(apiServerOptions);

  const factory = new PluginFactoryKeychain({
    pluginImportType: PluginImportType.Remote,
  });

  const plugin: IPluginKeychain = await factory.create({
    keychainId: "_keychainId_",
    instanceId: "_instanceId_",
    remoteConfig: configuration,
  });

  const pluginRegistry = new PluginRegistry({ plugins: [plugin] });

  const apiServer = new ApiServer({
    config: config.getProperties(),
    pluginRegistry,
  });

  await t.doesNotReject(apiServer.start(), "Started API server OK");
  test.onFinish(() => apiServer.shutdown());

  const key = uuidv4();
  const expected = uuidv4();

  await apiClient.setKeychainEntryV1({ key, value: expected });
  const {
    data: { value: actual },
  } = await apiClient.getKeychainEntryV1({ key });

  t.equal(actual, expected, "Keychain stored value matches input OK");

  t.end();
});
