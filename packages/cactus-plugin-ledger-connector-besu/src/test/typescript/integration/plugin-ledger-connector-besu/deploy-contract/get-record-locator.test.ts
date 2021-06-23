import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  PluginFactoryLedgerConnector,
  ReceiptType,
  InvokeContractV1Request,
  BesuApiClientOptions,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  GetBesuRecordV1Request,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import Web3 from "web3";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import { createServer } from "http";
import { AddressInfo } from "net";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { Secp256k1Keys, KeyFormat } from "@hyperledger/cactus-common";
import KeyEncoder from "key-encoder";

const testCase = "get record locator";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });
  const addressInfo = httpServer.address() as AddressInfo;
  t.comment(`HttpServer AddressInfo: ${JSON.stringify(addressInfo)}`);
  const nodeHost = `http://${addressInfo.address}:${addressInfo.port}`;
  t.comment(`Cactus Node 1 Host: ${nodeHost}`);
  const configuration = new BesuApiClientOptions({ basePath: nodeHost });
  const api = new BesuApiClient(configuration);

  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  /**
   * Constant defining the standard 'dev' Besu genesis.json contents.
   *
   * @see https://github.com/hyperledger/besu/blob/1.5.1/config/src/main/resources/dev.json
   */
  const firstHighNetWorthAccount = besuTestLedger.getGenesisAccountPubKey();
  const besuKeyPair = {
    privateKey: besuTestLedger.getGenesisAccountPrivKey(),
  };
  ////////////////////////////////////////////////////////////////////
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const keychainId = uuidv4();
  const keychainRef = uuidv4();
  const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
  const keyHex = privateKey.toString("hex");
  const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);
  const keychain = new PluginKeychainMemory({
    backend: new Map([[keychainRef, pem]]),
    keychainId,
    logLevel,
    instanceId: uuidv4(),
  });
  // 2. Instantiate plugin registry which will provide the web service plugin with the key value storage plugin
  const pluginRegistry = new PluginRegistry({ plugins: [keychain] });

  // 3. Instantiate the web service consortium plugin
  const options: IPluginLedgerConnectorBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };
  const pluginValidatorBesu = new PluginLedgerConnectorBesu(options);

  // 4. Create the API Server object that we embed in this test
  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  pluginRegistry.add(pluginValidatorBesu);

  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });

  // 5. make sure the API server is shut down when the testing if finished.
  test.onFinish(() => apiServer.shutdown());

  // 6. Start the API server which is now listening on port A and it's healthcheck works through the main SDK
  await apiServer.start();
  ////////////////////////////////////////////////////////////////////

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

  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel,
    instanceId: uuidv4(),
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  await connector.transact({
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: besuKeyPair.privateKey,
      type: Web3SigningCredentialType.PrivateKeyHex,
    },
    transactionConfig: {
      from: firstHighNetWorthAccount,
      to: testEthAccount.address,
      value: 10e9,
      gas: 1000000,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
    },
  });

  const balance = await web3.eth.getBalance(testEthAccount.address);
  t.ok(balance, "Retrieved balance of test account OK");
  t.equals(parseInt(balance, 10), 10e9, "Balance of test account is OK");

  let contractAddress: string;

  test("deploys contract", async (t2: Test) => {
    const deployOut = await connector.deployContract({
      keychainId: keychainPlugin.getKeychainId(),
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
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
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.ok(helloMsg, "sayHello() output is truthy");
    t2.true(
      typeof helloMsg === "string",
      "sayHello() output is type of string",
    );
  });

  test("getBesuRecord test 1", async (t2: Test) => {
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

    const transactionReceipt = await connector.transact({
      web3SigningCredential: {
        type: Web3SigningCredentialType.None,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
      },
      transactionConfig: {
        rawTransaction,
      },
    });

    const request: GetBesuRecordV1Request = {
      transactionHash: transactionReceipt.transactionReceipt.transactionHash,
    };
    const getInputData = await api.getBesuRecordV1(request);
    t2.ok(getInputData, "API response object is truthy");
    t2.end();
  });

  test("getBesuRecord test 2", async (t2: Test) => {
    const newName = `DrCactus${uuidv4()}`;
    const setNameOut = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
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
        contractName: HelloWorldContractJson.contractName,
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
      t2.ifError(setNameOutInvalid);
    } catch (error) {
      t2.notStrictEqual(
        error,
        "Nonce too low",
        "setName() invocation with invalid nonce",
      );
    }
    const req: InvokeContractV1Request = {
      contractName: HelloWorldContractJson.contractName,
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
    };
    const { callOutput: getNameOut } = await connector.getBesuRecord({
      invokeCall: req,
    });
    t2.equal(getNameOut, newName, `getName() output reflects the update OK`);

    const response = await connector.invokeContract({
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
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

    const req2: InvokeContractV1Request = {
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      contractAddress,
      invocationType: EthContractInvocationType.Call,
      methodName: "getNameByIndex",
      params: [0],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };

    const { callOutput } = await connector.getBesuRecord({ invokeCall: req2 });
    t2.equal(
      callOutput,
      newName,
      `getNameByIndex() output reflects the update OK`,
    );

    t2.end();
  });

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
