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

import { K_CACTUS_QUORUM_TOTAL_TX_COUNT } from "../../../../../main/typescript/prometheus-exporter/metrics";

import {
  EthContractInvocationType,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
} from "../../../../../main/typescript/public-api";

import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";

const testCase = "Quorum Ledger Connector Plugin";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "INFO";
const contractName = "HelloWorld";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const containerImageName = "hyperledger/cactus-quorum-all-in-one";
  const containerImageVersion = "2021-05-03-quorum-v21.4.1";
  const ledgerOptions = { containerImageName, containerImageVersion };
  const ledger = new QuorumTestLedger(ledgerOptions);

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  await ledger.start();

  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();
  const quorumGenesisOptions: IQuorumGenesisOptions = await ledger.getGenesisJsObject();
  t.ok(quorumGenesisOptions);
  t.ok(quorumGenesisOptions.alloc);

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

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new QuorumApi(apiConfig);

  await connector.getOrCreateWebServices();
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

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance, "Retrieved balance of test account OK");
  t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");

  let contractAddress: string;

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
    t2.ok(deployOut, "deployContract() output is truthy OK");
    t2.ok(
      deployOut.transactionReceipt,
      "deployContract() output.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOut.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );

    contractAddress = deployOut.transactionReceipt.contractAddress as string;
    t2.ok(
      typeof contractAddress === "string",
      "contractAddress typeof string OK",
    );

    const { callOutput: helloMsg } = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    t2.ok(helloMsg, "sayHello() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "sayHello() output is type of string",
    );
  });

  test("invoke Web3SigningCredentialType.GETHKEYCHAINPASSWORD", async (t2: Test) => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      nonce: 2,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    try {
      const setNameOutInvalid = await connector.invokeContract({
        contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
      });
      t2.ifError(setNameOutInvalid.transactionReceipt);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }

    const getNameOut = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    t2.ok(getNameOut.success, `getName() SEND invocation produced receipt OK`);

    const { callOutput: getNameOut2 } = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    t2.equal(
      getNameOut2,
      newName,
      "setName() invocation #2 output is truthy OK",
    );

    t2.end();
  });

  test("invoke Web3SigningCredentialType.NONE", async (t2: Test) => {
    const testEthAccount2 = web3.eth.accounts.create(uuidV4());

    const { rawTransaction } = await web3.eth.accounts.signTransaction(
      {
        from: testEthAccount.address,
        to: testEthAccount2.address,
        value: 10e6,
        gas: 1000000,
      },
      testEthAccount.privateKey,
    );

    await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    t2.ok(balance2, "Retrieved balance of test account 2 OK");
    t2.equals(parseInt(balance2, 10), 10e6, "Balance of test account2 is OK");
    t2.end();
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async (t2: Test) => {
    const newName = `DrCactus${uuidV4()}`;
    const setNameOut = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      nonce: 1,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    try {
      const setNameOutInvalid = await connector.invokeContract({
        contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        signingCredential: {
          ethAccount: testEthAccount.address,
          secret: testEthAccount.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        nonce: 1,
      });
      t2.ifError(setNameOutInvalid.transactionReceipt);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }
    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    t2.end();
  });

  test("invoke Web3SigningCredentialType.CactusKeychainRef", async (t2: Test) => {
    const newName = `DrCactus${uuidV4()}`;

    const signingCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential,
      nonce: 3,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    try {
      const setNameOutInvalid = await connector.invokeContract({
        contractName,
        contractAbi: HelloWorldContractJson.abi,
        contractAddress,
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 3,
      });
      t2.ifError(setNameOutInvalid.transactionReceipt);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }
    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContract({
      contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    t2.end();
  });

  test("get prometheus exporter metrics", async (t2: Test) => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_QUORUM_TOTAL_TX_COUNT +
      '"} 5';
    t2.ok(res);
    t2.ok(res.data);
    t2.equal(res.status, 200);
    t2.true(
      res.data.includes(promMetricsOutput),
      "Total Transaction Count of 5 recorded as expected. RESULT OK.",
    );
    t2.end();
  });

  t.end();
});
