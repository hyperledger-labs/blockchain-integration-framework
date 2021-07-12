import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorXdai,
  DefaultApi as XdaiApi,
  ReceiptType,
  DeployContractV1Request,
  InvokeContractV1Request,
  RunTransactionV1Request,
} from "../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  Containers,
  K_DEV_WHALE_ACCOUNT_PRIVATE_KEY,
  K_DEV_WHALE_ACCOUNT_PUBLIC_KEY,
  OpenEthereumTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
import { PluginRegistry } from "@hyperledger/cactus-core";
import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";

const testCase = "xDai API";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  // create a test ledger
  const xdaiTestLedger = new OpenEthereumTestLedger({ logLevel });
  test.onFinish(async () => {
    await xdaiTestLedger.stop();
    await xdaiTestLedger.destroy();
  });
  await xdaiTestLedger.start();

  // get host to which connector will attack
  const rpcApiHttpHost = await xdaiTestLedger.getRpcApiHttpHost();

  // obtain public and private keys from an account
  const whalePubKey = K_DEV_WHALE_ACCOUNT_PUBLIC_KEY;
  const whalePrivKey = K_DEV_WHALE_ACCOUNT_PRIVATE_KEY;

  // create an ethereum account
  const testEthAccount = await xdaiTestLedger.createEthTestAccount();

  // create a keychain for this account
  const keychainId = uuidv4();
  const keychainEntryKey = uuidv4();
  const keychainEntryValue = testEthAccount.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
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

  // add keychain plugin to plugin registry
  const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

  // create the connector
  const connector: PluginLedgerConnectorXdai = new PluginLedgerConnectorXdai({
    instanceId: uuidv4(),
    rpcApiHttpHost,
    logLevel,
    pluginRegistry,
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

  const fDeploy = "apiV1QuorumDeployContractSolidityBytecode";
  const fInvoke = "apiV1QuorumInvokeContract";
  const fRun = "apiV1QuorumRunTransaction";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
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
    };
    const res = await apiClient.deployContractV1(parameters);
    t2.ok(res, "Contract deployed successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fDeploy} in test case '${cOk}': status === 200`,
    );

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
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
      };
      await apiClient.deployContractV1(
        (parameters as any) as DeployContractV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("keychainId"),
        "Rejected because keychainId is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
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
        fake: 4,
      };
      await apiClient.deployContractV1(
        (parameters as any) as DeployContractV1Request,
      );
    } catch (e) {
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

  test(`${testCase} - ${fInvoke} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };
    const res = await apiClient.invokeContractV1(parameters);
    t2.ok(res, "Contract invoked successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fInvoke} in test case '${cOk}': status === 200`,
    );

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        signingCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      };
      await apiClient.invokeContractV1(
        (parameters as any) as InvokeContractV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractName"),
        "Rejected because contractName is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        signingCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        fake: 6,
      };
      await apiClient.invokeContractV1(
        (parameters as any) as InvokeContractV1Request,
      );
    } catch (e) {
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

  test(`${testCase} - ${fRun} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      web3SigningCredential: {
        ethAccount: whalePubKey,
        secret: whalePrivKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: whalePubKey,
        to: testEthAccount.address,
        value: 10e7,
        gas: 22000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    };
    const res = await apiClient.runTransactionV1(parameters);
    t2.ok(res, "Transaction ran successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fInvoke} in test case '${cOk}': status === 200`,
    );

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        transactionConfig: {
          from: whalePubKey,
          to: testEthAccount.address,
          value: 10e7,
          gas: 22000,
        },
      };
      await apiClient.runTransactionV1(
        (parameters as any) as RunTransactionV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("consistencyStrategy"),
        "Rejected because consistencyStrategy is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        web3SigningCredential: {
          ethAccount: whalePubKey,
          secret: whalePrivKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        transactionConfig: {
          from: whalePubKey,
          to: testEthAccount.address,
          value: 10e7,
          gas: 22000,
        },
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
          timeoutMs: 60000,
        },
        fake: 9,
      };
      await apiClient.runTransactionV1(
        (parameters as any) as RunTransactionV1Request,
      );
    } catch (e) {
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

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
