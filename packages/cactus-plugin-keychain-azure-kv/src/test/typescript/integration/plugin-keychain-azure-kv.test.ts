import test, { Test } from "tape-promise/tape";

import { v4 as uuidv4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
} from "../../../main/typescript/public-api";

import { SecretClientMock } from "../mock/plugin-keychain-azure-kv-mock";

const logLevel: LogLevelDesc = "TRACE";

test("get,set,has,delete alters state as expected for AzureCredentialType.InMemory", async (t: Test) => {
  const options: IPluginKeychainAzureKvOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    logLevel: logLevel,
    azureEndpoint: "testEndpoint",
    backend: new SecretClientMock({
      azureKvUrl: "testUrl",
      logLevel: logLevel,
    }),
  };
  const plugin = new PluginKeychainAzureKv(options);

  t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
  t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

  const key = uuidv4();
  const value = uuidv4();

  const hasPrior = await plugin.has(key);

  t.false(hasPrior, "hasPrior === false OK");

  await plugin.set(key, value);

  const hasAfter = await plugin.has(key);
  t.true(hasAfter, "hasAfter === true OK");

  const valueAfter = await plugin.get(key);
  t.ok(valueAfter, "valueAfter truthy OK");
  t.equal(valueAfter, value, "valueAfter === value OK");

  await plugin.delete(key);

  const hasAfterDelete = await plugin.has(key);
  t.false(hasAfterDelete, "hasAfterDelete === false OK");

  const valueAfterDelete = plugin.get(key);
  const regExp = new RegExp(/secret not found*/);
  const rejectMsg = "valueAfterDelete === throws OK";
  await t.rejects(valueAfterDelete, regExp, rejectMsg);

  t.end();
});
