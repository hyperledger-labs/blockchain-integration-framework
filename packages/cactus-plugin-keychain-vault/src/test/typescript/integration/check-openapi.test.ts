/* eslint-disable prettier/prettier */
import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";

import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

import {
  Containers,
  K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
  K_DEFAULT_VAULT_HTTP_PORT,
  VaultTestServer,
} from "@hyperledger/cactus-test-tooling";

import { v4 as uuidv4 } from "uuid";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import {
  Configuration,
  DeleteKeychainEntryRequestV1,
  GetKeychainEntryRequest,
  HasKeychainEntryRequestV1,
  IPluginKeychainVaultOptions,
  PluginKeychainVault,
  SetKeychainEntryRequest,
} from "../../../main/typescript/public-api";

import { DefaultApi as KeychainVaultApi } from "../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "cactus-plugin-keychain-vault API";

test(`${testCase}`, async (t: Test) => {
  const vaultTestContainer = new VaultTestServer({});
  await vaultTestContainer.start();

  const ci = await Containers.getById(vaultTestContainer.containerId);
  const vaultIpAddr = await internalIpV4();
  const hostPort = await Containers.getPublicPort(
    K_DEFAULT_VAULT_HTTP_PORT,
    ci,
  );
  const vaultHost = `http://${vaultIpAddr}:${hostPort}`;

  test.onFinish(async () => {
    await vaultTestContainer.stop();
    await vaultTestContainer.destroy();
  });

  const options: IPluginKeychainVaultOptions = {
    instanceId: uuidv4(),
    keychainId: uuidv4(),
    endpoint: vaultHost,
    token: K_DEFAULT_VAULT_DEV_ROOT_TOKEN,
    apiVersion: "v1",
    kvSecretsMountPath: "secret/data/",
    logLevel,
  };
  const plugin = new PluginKeychainVault(options);

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

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new KeychainVaultApi(apiConfig);

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  t.equal(plugin.getKeychainId(), options.keychainId, "Keychain ID set OK");
  t.equal(plugin.getInstanceId(), options.instanceId, "Instance ID set OK");

  const key1 = uuidv4();
  const value1 = uuidv4();

  const fSet = "setKeychainEntryV1";
  const fGet = "getKeychainEntryV1";
  const fDelete = "deleteKeychainEntryV1";
  const fHas = "hasKeychainEntryV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fSet} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.setKeychainEntryV1({ key: key1, value: value1 });
    t2.equal(res.status, 200, "Status code 200");
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.hasKeychainEntryV1({ key: key1 });
    t2.equal(res.status, 200, "Status code 200");
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.getKeychainEntryV1({ key: key1 });
    t2.equal(res.status, 200, "Status code 200");
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cOk}`, async (t2: Test) => {
    const res = await apiClient.deleteKeychainEntryV1({ key: key1});
    t2.equal(res.status, 200, "Status code 200");
    t2.end();
  });

  test(`${testCase} - ${fSet} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.setKeychainEntryV1({ value: value1 } as any as SetKeychainEntryRequest);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("key"),
        "Rejected because key is required",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.hasKeychainEntryV1({} as any as HasKeychainEntryRequestV1);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("key"),
        "Rejected because key is required",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.getKeychainEntryV1({} as any as GetKeychainEntryRequest);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("key"),
        "Rejected because key is required",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      await apiClient.deleteKeychainEntryV1({} as any as DeleteKeychainEntryRequestV1);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("key"),
        "Rejected because key is required",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fSet} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.setKeychainEntryV1({ key: key1, value: value1, fake: 6 } as any as SetKeychainEntryRequest);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fHas} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      apiClient.hasKeychainEntryV1({ key: key1, fake: 5 } as any as HasKeychainEntryRequestV1);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fGet} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.getKeychainEntryV1({ key: key1, fake: 9 } as any as GetKeychainEntryRequest);
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });

  test(`${testCase} - ${fDelete} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      await apiClient.deleteKeychainEntryV1({ key: key1});
    } catch(e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("fake"),
        "Rejected because fake is not a valid parameter",
      );
    }
    t2.end();
  });


  t.end();
});

