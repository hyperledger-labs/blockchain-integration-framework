import test, { Test } from "tape-promise/tape";

import { create } from "ipfs-http-client";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import type { AddressInfo } from "net";

import { v4 as uuidv4 } from "uuid";

import { IListenOptions, Servers } from "@hyperledger/cactus-common";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import { Configuration } from "@hyperledger/cactus-core-api";
import { GoIpfsTestContainer } from "@hyperledger/cactus-test-tooling";
import { Containers } from "@hyperledger/cactus-test-tooling";

import { PluginObjectStoreIpfs } from "../../../main/typescript";

import { DefaultApi as ObjectStoreIpfsApi } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "can work with go-ipfs container get/set/has operations";

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });
  test.onFinish(async () => {
    await ipfsContainer.stop();
    await ipfsContainer.destroy();
  });
  const ipfsContainer = new GoIpfsTestContainer({ logLevel });
  t.ok(ipfsContainer, "GoIpfsTestContainer instance truthy OK");

  const container = await ipfsContainer.start();
  t.ok(container, "Container returned by start() truthy OK");
  t.ok(container, "Started GoIpfsTestContainer OK");

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

  const ipfsApiUrl = await ipfsContainer.getApiUrl();
  const ipfsGatewayUrl = await ipfsContainer.getWebGatewayUrl();
  t.comment(`Go IPFS Test Container API URL: ${ipfsApiUrl}`);
  t.comment(`Go IPFS Test Container Gateway URL: ${ipfsGatewayUrl}`);

  const ipfsClientOrOptions = create({
    url: ipfsApiUrl,
  });
  const instanceId = uuidv4();
  const plugin = new PluginObjectStoreIpfs({
    parentDir: `/${uuidv4()}/${uuidv4()}/`,
    logLevel,
    instanceId,
    ipfsClientOrOptions,
  });

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  const packageName = plugin.getPackageName();
  t.ok(packageName, "packageName truthy OK");

  const theInstanceId = plugin.getInstanceId();
  t.ok(theInstanceId, "theInstanceId truthy OK");
  t.equal(theInstanceId, instanceId, "instanceId === theInstanceId OK");

  const key1 = uuidv4();
  const value1 = Buffer.from(uuidv4()).toString("base64");
  const value2 = Buffer.from(uuidv4()).toString("base64");

  const res1 = await apiClient.setObjectV1({ key: key1, value: value1 });
  t.ok(res1, "res1 truthy OK");
  t.ok(res1.status, "res1.status truthy OK");
  t.true(res1.status > 199, "res1.status > 199 true OK");
  t.true(res1.status < 300, "res1.status < 300 true OK");
  t.ok(res1.data, "res1.data truthy OK");
  t.ok(res1.data.key, "res1.data.key truthy OK");
  t.equal(res1.data.key, key1, "equal res1.data.key, key1 OK");

  const res2 = await apiClient.getObjectV1({ key: key1 });
  t.ok(res2, "res2 truthy OK");
  t.ok(res2.status, "res2.status truthy OK");
  t.true(res2.status > 199, "res2.status > 199 true OK");
  t.true(res2.status < 300, "res2.status < 300 true OK");
  t.ok(res2.data, "res2.data truthy OK");
  t.ok(res2.data.key, "res2.data.key truthy OK");
  t.equal(res2.data.key, key1, "equal res2.data.key, key1 OK");
  t.equal(res2.data.value, value1, "equal res2.data.value, value1 OK");

  const res3 = await apiClient.hasObjectV1({ key: key1 });
  t.ok(res3, "res3 truthy OK");
  t.ok(res3.status, "res3.status truthy OK");
  t.true(res3.status > 199, "res3.status > 199 true OK");
  t.true(res3.status < 300, "res3.status < 300 true OK");
  t.ok(res3.data, "res3.data truthy OK");
  t.ok(res3.data.key, "res3.data.key truthy OK");
  t.equal(res3.data.key, key1, "equal res3.data.key, key1 OK");
  t.equal(res3.data.isPresent, true, "equal res3.data.isPresent, true OK");

  const res4 = await apiClient.setObjectV1({ key: key1, value: value1 });
  t.ok(res4, "res4 truthy OK");
  t.ok(res4.status, "res4.status truthy OK");
  t.true(res4.status > 199, "res4.status > 199 true OK");
  t.true(res4.status < 300, "res4.status < 300 true OK");
  t.ok(res4.data, "res4.data truthy OK");
  t.ok(res4.data.key, "res4.data.key truthy OK");
  t.equal(res4.data.key, key1, "equal res4.data.key, key1 OK");

  // Verify that overwriting the same key works by setting and then getting it.
  const res5 = await apiClient.setObjectV1({ key: key1, value: value2 });
  t.ok(res5, "res5 truthy OK");
  t.ok(res5.status, "res5.status truthy OK");
  t.true(res5.status > 199, "res5.status > 199 true OK");
  t.true(res5.status < 300, "res5.status < 300 true OK");
  t.ok(res5.data, "res5.data truthy OK");
  t.ok(res5.data.key, "res5.data.key truthy OK");
  t.equal(res5.data.key, key1, "equal res5.data.key, key1 OK");

  const res6 = await apiClient.getObjectV1({ key: key1 });
  t.ok(res6, "res6 truthy OK");
  t.ok(res6.status, "res6.status truthy OK");
  t.true(res6.status > 199, "res6.status > 199 true OK");
  t.true(res6.status < 300, "res6.status < 300 true OK");
  t.ok(res6.data, "res6.data truthy OK");
  t.ok(res6.data.key, "res6.data.key truthy OK");
  t.equal(res6.data.key, key1, "equal res6.data.key, key1 OK");
  t.equal(res6.data.value, value2, "equal res6.data.value, value2 OK");

  const key3 = uuidv4();
  const res7 = await apiClient.hasObjectV1({ key: key3 });
  t.ok(res7, "res7 truthy OK");
  t.ok(res7.status, "res7.status truthy OK");
  t.true(res7.status > 199, "res7.status > 199 true OK");
  t.true(res7.status < 300, "res7.status < 300 true OK");
  t.ok(res7.data, "res7.data truthy OK");
  t.ok(res7.data.key, "res7.data.key truthy OK");
  t.equal(res7.data.key, key3, "equal res7.data.key, key3 OK");
  t.false(res7.data.isPresent, "false res7.data.isPresent OK");

  t.end();
});
