import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  PluginFactoryLedgerConnector,
  Web3SigningCredentialCactusKeychainRef,
  ReceiptType,
  DefaultApi as XdaiApi,
} from "../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  Containers,
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
  K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { Configuration, PluginImportType } from "@hyperledger/cactus-core-api";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { K_CACTUS_XDAI_TOTAL_TX_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

const testCase = "deploys contract via .json file";
const logLevel: LogLevelDesc = "TRACE";
const contractName = "HelloWorld";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new OpenEthereumTestLedger({ logLevel });

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });
  await ledger.start();

  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();

  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;

  const web3 = new Web3(rpcApiHttpHost);
  const testEthAccount = web3.eth.accounts.create(uuidv4());

  const keychainEntryKey = uuidv4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: uuidv4(),
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
  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });
  const connector: PluginLedgerConnectorXdai = await factory.create({
    rpcApiHttpHost,
    logLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

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
  const apiClient = new XdaiApi(config);

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  await connector.transact({
    web3SigningCredential: {
      ethAccount: whalePubKey,
      secret: whalePrivKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    transactionConfig: {
      from: whalePubKey,
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
      timeoutMs: 60000,
    },
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance, "Retrieved balance of test account OK");
  t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");

  let contractAddress: string;

  test("deploys contract via .json file", async (t2: Test) => {
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
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
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.ok(helloMsg, "sayHello() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "sayHello() output is type of string",
    );
  });

  test("invoke Web3SigningCredentialType.None", async (t2: Test) => {
    const testEthAccount2 = web3.eth.accounts.create(uuidv4());

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
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    });

    const balance2 = await web3.eth.getBalance(testEthAccount2.address);
    t2.ok(balance2, "Retrieved balance of test account 2 OK");
    t2.equals(parseInt(balance2, 10), 10e6, "Balance of test account2 is OK");
    t2.end();
  });

  test("invoke Web3SigningCredentialType.PrivateKeyHex", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
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
        keychainId: keychainPlugin.getKeychainId(),
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
      t2.ifError(setNameOutInvalid);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }
    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
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
      keychainId: keychainPlugin.getKeychainId(),
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

    const response = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      value: 10,
    });
    t2.ok(response, "deposit() payable invocation output is truthy OK");

    const { callOutput } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [0],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.equal(
      callOutput,
      newName,
      `getNameByIndex() output reflects the update OK`,
    );

    t2.end();
  });

  test("invoke Web3SigningCredentialType.CACTUSKEYCHAINREF", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;

    const signingCredential: Web3SigningCredentialCactusKeychainRef = {
      ethAccount: testEthAccount.address,
      keychainEntryKey,
      keychainId: keychainPlugin.getKeychainId(),
      type: Web3SigningCredentialType.CactusKeychainRef,
    };

    const setNameOut = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential,
      nonce: 4,
    });
    t2.ok(setNameOut, "setName() invocation #1 output is truthy OK");

    try {
      const setNameOutInvalid = await connector.invokeContract({
        contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [newName],
        gas: 1000000,
        signingCredential,
        nonce: 4,
      });
      t2.ifError(setNameOutInvalid);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }

    const { callOutput: getNameOut } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const getNameOut2 = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential,
    });
    t2.ok(getNameOut2, "getName() invocation #2 output is truthy OK");

    const response = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Send,
      methodName: "deposit",
      params: [],
      gas: 1000000,
      signingCredential,
      value: 10,
    });
    t2.ok(response, "deposit() payable invocation output is truthy OK");

    const { callOutput } = await connector.invokeContract({
      contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [1],
      gas: 1000000,
      signingCredential,
    });
    t2.equal(
      callOutput,
      newName,
      `getNameByIndex() output reflects the update OK`,
    );

    t2.end();
  });

  test("get prometheus exporter metrics", async (t2: Test) => {
    const res = await apiClient.getPrometheusMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_XDAI_TOTAL_TX_COUNT +
      '"} 9';
    t2.ok(res);
    t2.ok(res.data);
    t2.equal(res.status, 200);
    t2.true(
      res.data.includes(promMetricsOutput),
      "Total Transaction Count of 9 recorded as expected. RESULT OK.",
    );
    t2.end();
  });

  t.end();
});
