import test, { Test } from "tape-promise/tape";

import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";

import { v4 as uuidv4 } from "uuid";
import {
  IPluginKeychainMemoryOptions,
  PluginKeychainMemory,
} from "../../../main/typescript";

import { K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

import { DefaultApi as KeychainMemoryApi } from "../../../main/typescript/public-api";
import { Configuration } from "@hyperledger/cactus-core-api";

test("PluginKeychainMemory", (t1: Test) => {
  t1.doesNotThrow(
    () => new PluginKeychainMemory({ instanceId: "a", keychainId: "a" }),
  );

  test("Validates constructor arg instanceId", (t: Test) => {
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: null as any,
          keychainId: "valid-value",
        }),
    );
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "",
          keychainId: "valid-value",
        }),
    );
    t.end();
  });

  test("Validates constructor arg keychainId", (t: Test) => {
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: null as any,
        }),
    );
    t.throws(
      () =>
        new PluginKeychainMemory({
          instanceId: "valid-value",
          keychainId: "",
        }),
    );
    t.end();
  });

  test("get,set,has,delete alters state as expected", async (t: Test) => {
    const options: IPluginKeychainMemoryOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
    };
    const plugin = new PluginKeychainMemory(options);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    const server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "0.0.0.0",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    test.onFinish(async () => await Servers.shutdown(server));
    const { address, port } = addressInfo;
    const apiHost = `http://${address}:${port}`;
    t.comment(
      `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-keychain-memory/get-prometheus-exporter-metrics`,
    );

    const config = new Configuration({ basePath: apiHost });
    const apiClient = new KeychainMemoryApi(config);

    await plugin.getOrCreateWebServices(expressApp);

    t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
    t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

    const key1 = uuidv4();
    const value1 = uuidv4();

    const hasPrior = await plugin.has(key1);
    t.false(hasPrior, "hasPrior === false OK");

    await plugin.set(key1, value1);

    const hasAfter1 = await plugin.has(key1);
    t.true(hasAfter1, "hasAfter === true OK");

    const valueAfter1 = await plugin.get(key1);
    t.ok(valueAfter1, "valueAfter truthy OK");
    t.equal(valueAfter1, value1, "valueAfter === value OK");

    await plugin.delete(key1);

    const hasAfterDelete1 = await plugin.has(key1);
    t.false(hasAfterDelete1, "hasAfterDelete === false OK");

    const valueAfterDelete1 = await plugin.get(key1);
    t.notok(valueAfterDelete1, "valueAfterDelete falsy OK");
    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " Total keys present in memory\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '"} 0';
      t.ok(res);
      t.ok(res.data);
      t.equal(res.status, 200);
      t.true(
        res.data.includes(promMetricsOutput),
        "Total Key Count 0 recorded as expected. RESULT OK",
      );
    }

    const key2 = uuidv4();
    const value2 = uuidv4();

    await plugin.set(key2, value2);

    const hasAfter = await plugin.has(key2);
    t.true(hasAfter, "hasAfter === true OK");

    const valueAfter2 = await plugin.get(key2);
    t.ok(valueAfter2, "valueAfter truthy OK");
    t.equal(valueAfter2, value2, "valueAfter === value OK");
    {
      const res = await apiClient.getPrometheusMetricsV1();
      const promMetricsOutput =
        "# HELP " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " Total keys present in memory\n" +
        "# TYPE " +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        " gauge\n" +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '{type="' +
        K_CACTUS_KEYCHAIN_MEMORY_TOTAL_KEY_COUNT +
        '"} 1';
      t.ok(res);
      t.ok(res.data);
      t.equal(res.status, 200);
      t.true(
        res.data.includes(promMetricsOutput),
        "Total Key Count 1 recorded as expected. RESULT OK",
      );
    }

    t.end();
  });

  t1.end();
});
