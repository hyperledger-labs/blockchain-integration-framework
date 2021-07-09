import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

import {
  CactusKeychainVaultServer,
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import { Configuration, DefaultApi } from "../../../main/typescript/public-api";

test("NodeJS API client + Rust plugin works together", async (tMain: Test) => {
  const vaultTestContainer = new VaultTestServer({});
  await vaultTestContainer.start();

  const ci = await Containers.getById(vaultTestContainer.containerId);
  const vaultIpAddr = await Containers.getContainerInternalIp(ci);
  tMain.comment(`Container VaultTestServer has IPv4: ${vaultIpAddr}`);

  test.onFinish(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });

  const hostPortVault = await vaultTestContainer.getHostPortHttp();
  tMain.comment(`Container VaultTestServer (Port=${hostPortVault}) started OK`);
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
  tMain.comment(`CactusKeychainVaultServer (Port=${hostPort}) started OK`);

  const configuration = new Configuration({
    basePath: `http://localhost:${hostPort}`,
  });
  const apiClient = new DefaultApi(configuration);

  const key = uuidv4();
  const expected = uuidv4();

  tMain.comment("Calling set keychain entry...");
  await apiClient.setKeychainEntryV1({ key, value: expected });
  const {
    data: { value: actual },
  } = await apiClient.getKeychainEntryV1({ key });

  tMain.equal(actual, expected, "Keychain stored value matches input OK");

  tMain.end();
});
