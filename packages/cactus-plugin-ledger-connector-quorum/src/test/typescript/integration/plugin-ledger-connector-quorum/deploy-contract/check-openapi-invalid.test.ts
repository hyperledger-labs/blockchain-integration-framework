import test, { Test } from "tape-promise/tape";
import Web3 from "web3";
import { v4 as uuidV4 } from "uuid";

import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";

import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "../../../../../main/typescript/public-api";

import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  // pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";

const testCase = "Quorum Ledger Connector Plugin";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";

const logLevel: LogLevelDesc = "INFO";

test(testCase, async (t: Test) => {
  const containerImageVersion = "2021-01-08-7a055c3"; // Quorum v2.3.0, Tessera v0.10.0
  const containerImageName = "hyperledger/cactus-quorum-all-in-one";
  const ledgerOptions = { containerImageName, containerImageVersion };
  const ledger = new QuorumTestLedger(ledgerOptions);
  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  await ledger.start();

  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
  const quorumGenesisOptions: IQuorumGenesisOptions = await ledger.getGenesisJsObject();

  const highNetWorthAccounts: string[] = Object.keys(
    quorumGenesisOptions.alloc,
  ).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const theBalance = parseInt(anAccount.balance, 10);
    return theBalance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidV4());

  const keychainEntryKey = uuidV4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidV4(),
    keychainId: uuidV4(),
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });
  keychainPlugin.set(
    HelloWorldContractJson.contractName,
    HelloWorldContractJson,
  );
  // Instantiate connector with the keychain plugin that already has the
  // private key we want to use for one of our tests
  const connector: PluginLedgerConnectorQuorum = new PluginLedgerConnectorQuorum(
    {
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
    },
  );

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
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-quorum/get-prometheus-exporter-metrics`,
  );

  await connector.registerWebServices(expressApp);

  await connector.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccount.address,
      value: 10e9,
    },
  });

  test("deploys contract via .json file", async (t2: Test) => {
    const deployOut = await connector.deployContract({
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    });

    console.log("DEPLOYED");
    console.log(deployOut);
    t2.notOk(deployOut, "deployContract() output is not truthy OK"); // should return an error about validation
  });

  t.end();
});
