/* eslint-disable prettier/prettier */
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
} from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../solidity/hello-world-contract/HelloWorld.json";
// import Web3 from "web3";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { createServer } from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

const testCase = "xDai API";
const logLevel: LogLevelDesc = "TRACE";
// const contractName = "HelloWorld";

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

  // register the connector
  pluginRegistry.add(connector);

  // create an http server
  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });
  const addressInfo = httpServer.address() as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  // create configuration for api server
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  // create an api server on the http server
  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });

  // start api server and shutdown when test finish
  test.onFinish(() => apiServer.shutdown());
  await apiServer.start();

  // create the api client and attach it to http server
  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient = new XdaiApi(apiConfig);

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
      await apiClient.deployContractV1(parameters as any as DeployContractV1Request);
    } catch(e) {
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
      await apiClient.deployContractV1(parameters as any as DeployContractV1Request);
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
      await apiClient.invokeContractV1(parameters as any as InvokeContractV1Request);
    } catch(e) {
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
      await apiClient.invokeContractV1(parameters as any as InvokeContractV1Request);
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
      await apiClient.runTransactionV1(parameters as any as RunTransactionV1Request);
    } catch(e) {
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
      await apiClient.runTransactionV1(parameters as any as RunTransactionV1Request);
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
