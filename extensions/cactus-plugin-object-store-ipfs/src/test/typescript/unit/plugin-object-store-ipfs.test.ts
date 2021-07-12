import type { AddressInfo } from "net";
import http from "http";
import test, { Test } from "tape-promise/tape";

import { v4 as uuidv4 } from "uuid";
import { create } from "ipfs-http-client";
import express from "express";
import bodyParser from "body-parser";

import { Servers } from "@hyperledger/cactus-common";
import type { IListenOptions, LogLevelDesc } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";

import { PluginObjectStoreIpfs } from "../../../main/typescript";
import type { IPluginObjectStoreIpfsOptions } from "../../../main/typescript";

import { DefaultApi as ObjectStoreIpfsApi } from "../../../main/typescript/public-api";
import { IpfsHttpClientMock } from "../fixtures/mock/ipfs/ipfs-http-client-mock";

test("PluginObjectStoreIpfs", (t1: Test) => {
  const logLevel: LogLevelDesc = "TRACE";
  const ipfsClientOrOptions = create();
  t1.doesNotThrow(
    () =>
      new PluginObjectStoreIpfs({
        instanceId: "a",
        ipfsClientOrOptions,
        parentDir: "/" + uuidv4(),
      }),
  );

  test("Validates constructor arg instanceId", (t: Test) => {
    t.throws(
      () =>
        new PluginObjectStoreIpfs({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          instanceId: null as any,
          ipfsClientOrOptions,
          parentDir: "/" + uuidv4(),
        }),
    );
    t.throws(
      () =>
        new PluginObjectStoreIpfs({
          instanceId: "",
          ipfsClientOrOptions,
          parentDir: "/" + uuidv4(),
        }),
    );
    t.end();
  });

  test("get,set,has,delete alters state as expected", async (t: Test) => {
    const options: IPluginObjectStoreIpfsOptions = {
      ipfsClientOrOptions: new IpfsHttpClientMock({ logLevel }),
      instanceId: uuidv4(),
      parentDir: "/" + uuidv4(),
      logLevel,
    };
    const plugin = new PluginObjectStoreIpfs(options);

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

    const config = new Configuration({ basePath: apiHost });
    const apiClient = new ObjectStoreIpfsApi(config);
    t.ok(apiClient, "ObjectStoreIpfsApi truthy OK");

    await plugin.getOrCreateWebServices();
    t.pass("plugin.getOrCreateWebServices() OK");
    await plugin.registerWebServices(expressApp);
    t.pass("plugin.registerWebServices() OK");

    t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

    const key1 = uuidv4();
    const value1 = Buffer.from(uuidv4()).toString("base64");

    const res1 = await apiClient.hasObjectV1({ key: key1 });
    t.ok(res1, "res1 truthy OK");
    t.ok(res1.status, "res1.status truthy OK");
    t.true(res1.status > 199, "res1.status > 199 true OK");
    t.true(res1.status < 300, "res1.status < 300 true OK");
    t.ok(res1.data, "res1.data truthy OK");
    t.ok(res1.data.key, "res1.data.key truthy OK");
    t.equal(res1.data.key, key1, "equal res1.data.key, key1 OK");
    t.equal(res1.data.isPresent, false, "equal res1.data.isPresent, false OK");

    const res2 = await apiClient.setObjectV1({ key: key1, value: value1 });
    t.ok(res2, "res2 truthy OK");
    t.ok(res2.status, "res2.status truthy OK");
    t.true(res2.status > 199, "res2.status > 199 true OK");
    t.true(res2.status < 300, "res2.status < 300 true OK");
    t.ok(res2.data, "res2.data truthy OK");
    t.ok(res2.data.key, "res2.data.key truthy OK");
    t.equal(res2.data.key, key1, "equal res2.data.key, key1 OK");

    const res3 = await apiClient.hasObjectV1({ key: key1 });
    t.ok(res3, "res3 truthy OK");
    t.ok(res3.status, "res3.status truthy OK");
    t.true(res3.status > 199, "res3.status > 199 true OK");
    t.true(res3.status < 300, "res3.status < 300 true OK");
    t.ok(res3.data, "res3.data truthy OK");
    t.ok(res3.data.key, "res3.data.key truthy OK");
    t.equal(res3.data.key, key1, "equal res3.data.key, key1 OK");
    t.equal(res3.data.isPresent, true, "equal res3.data.isPresent, true OK");

    const res4 = await apiClient.getObjectV1({ key: key1 });
    t.ok(res4, "res4 truthy OK");
    t.ok(res4.status, "res4.status truthy OK");
    t.true(res4.status > 199, "res4.status > 199 true OK");
    t.true(res4.status < 300, "res4.status < 300 true OK");
    t.ok(res4.data, "res4.data truthy OK");
    t.ok(res4.data.key, "res4.data.key truthy OK");
    t.equal(res4.data.key, key1, "equal res4.data.key, key1 OK");
    t.equal(res4.data.value, value1, "equal res4.data.value, value1 OK");

    const key2 = uuidv4();
    const value2 = Buffer.from(uuidv4()).toString("base64");

    const res5 = await apiClient.setObjectV1({ key: key2, value: value2 });
    t.ok(res5, "res5 truthy OK");
    t.ok(res5.status, "res5.status truthy OK");
    t.true(res5.status > 199, "res5.status > 199 true OK");
    t.true(res5.status < 300, "res5.status < 300 true OK");
    t.ok(res5.data, "res5.data truthy OK");
    t.ok(res5.data.key, "res5.data.key truthy OK");
    t.equal(res5.data.key, key2, "equal res5.data.key, key2 OK");

    const res6 = await apiClient.hasObjectV1({ key: key2 });
    t.ok(res6, "res6 truthy OK");
    t.ok(res6.status, "res6.status truthy OK");
    t.true(res6.status > 199, "res6.status > 199 true OK");
    t.true(res6.status < 300, "res6.status < 300 true OK");
    t.ok(res6.data, "res6.data truthy OK");
    t.ok(res6.data.key, "res6.data.key truthy OK");
    t.equal(res6.data.key, key2, "equal res6.data.key, key2 OK");
    t.true(res6.data.isPresent, "true res6.data.isPresent, true OK");

    const res7 = await apiClient.getObjectV1({ key: key2 });
    t.ok(res7, "res7 truthy OK");
    t.ok(res7.status, "res7.status truthy OK");
    t.true(res7.status > 199, "res7.status > 199 true OK");
    t.true(res7.status < 300, "res7.status < 300 true OK");
    t.ok(res7.data, "res7.data truthy OK");
    t.ok(res7.data.key, "res7.data.key truthy OK");
    t.equal(res7.data.key, key2, "equal res7.data.key, key2 OK");
    t.equal(res7.data.value, value2, "equal res7.data.value, value2 OK");

    t.end();
  });

  t1.end();
});
