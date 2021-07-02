import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  ReceiptType,
} from "../../../../../main/typescript/public-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";
import KeyEncoder from "key-encoder";
import {
  KeyFormat,
  LogLevelDesc,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import { createServer } from "http";
import { AddressInfo } from "net";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { BesuApiClientOptions } from "../../../../../main/typescript/api-client/besu-api-client";

const logLevel: LogLevelDesc = "TRACE";

const testCase = "Besu API";
test(testCase, async (t: Test) => {
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const keychainIdForSigned = uuidv4();
  const keychainIdForUnsigned = uuidv4();
  const keychainRefForSigned = uuidv4();
  const keychainRefForUnsigned = uuidv4();

  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });
  const addressInfo = httpServer.address() as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  const besuTestLedger = new BesuTestLedger();
  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });
  await besuTestLedger.start();

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
  const testEthAccount1 = await besuTestLedger.createEthTestAccount();
  const testEthAccount2 = await besuTestLedger.createEthTestAccount();

  const fDeploy = "apiV1BesuDeployContractSolidityBytecode";
  const fSign = "signTransactionV1";
  const cOk = "without bad request error";

  // keychainPlugin for signed transactions
  const { privateKey } = Secp256k1Keys.generateKeyPairsBuffer();
  const keyHex = privateKey.toString("hex");
  const pem = keyEncoder.encodePrivate(keyHex, KeyFormat.Raw, KeyFormat.PEM);
  const signedKeychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: keychainIdForSigned,
    backend: new Map([[keychainRefForSigned, pem]]),
    logLevel,
  });

  // keychainPlugin for unsigned transactions
  const keychainEntryValue = testEthAccount1.privateKey;
  const unsignedKeychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId: keychainIdForUnsigned,
    backend: new Map([[keychainRefForUnsigned, keychainEntryValue]]),
    logLevel,
  });
  unsignedKeychainPlugin.set(
    HelloWorldContractJson.contractName,
    HelloWorldContractJson,
  );

  const pluginRegistry = new PluginRegistry({
    plugins: [signedKeychainPlugin, unsignedKeychainPlugin],
  });

  const options: IPluginLedgerConnectorBesuOptions = {
    instanceId: uuidv4(),
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };
  const connector = new PluginLedgerConnectorBesu(options);

  const configService = new ConfigService();
  const apiServerOptions = configService.newExampleConfig();
  apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  apiServerOptions.configFile = "";
  apiServerOptions.apiCorsDomainCsv = "*";
  apiServerOptions.apiPort = addressInfo.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  pluginRegistry.add(connector);

  const apiServer = new ApiServer({
    httpServerApi: httpServer,
    config: config.getProperties(),
    pluginRegistry,
  });

  test.onFinish(() => apiServer.shutdown());
  await apiServer.start();

  const besuApiClientOptions = new BesuApiClientOptions({
    basePath: apiHost,
  });
  const apiClient = new BesuApiClient(besuApiClientOptions);

  // sign a transaction

  test(`${testCase} - ${fSign} - ${cOk}`, async (t2: Test) => {
    const runTxRes = await apiClient.apiV1BesuRunTransaction({
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.LedgerBlockAck,
        timeoutMs: 120000,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 1,
        gas: 10000000,
      },
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    });
    t2.ok(runTxRes, "runTxRes truthy OK");
    t2.ok(runTxRes.status, "runTxRes.status truthy OK");
    t2.equal(runTxRes.status, 200, "runTxRes.status === 200 OK");
    t2.ok(runTxRes.data, "runTxRes.data truthy OK");
    t2.ok(
      runTxRes.data.transactionReceipt,
      "runTxRes.data.transactionReceipt truthy OK",
    );

    const signTxRes = await apiClient.signTransactionV1({
      keychainId: keychainIdForSigned,
      keychainRef: keychainRefForSigned,
      transactionHash: runTxRes.data.transactionReceipt.transactionHash,
    });

    t2.ok(signTxRes, "signTxRes truthy OK");
    t2.ok(signTxRes.status, "signTxRes.status truthy OK");
    t2.equal(signTxRes.status, 200, "signTxRes.status === 200 OK");
    t2.ok(signTxRes.data, "signTxRes.data truthy OK");
    t2.ok(signTxRes.data.signature, "signTxRes.data.signature truthy OK");

    if (signTxRes.data.signature) {
      console.log(signTxRes.data.signature);
    }

    t2.end();
  });

  // deploy a contract

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";
    const besuKeyPair = {
      privateKey:
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",
    };

    const deployRes = await apiClient.apiV1BesuDeployContractSolidityBytecode({
      keychainId: keychainIdForUnsigned,
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

    t2.ok(deployRes, "deployRes truthy OK");
    t2.ok(deployRes.status, "deployRes.status truthy OK");
    t2.equal(deployRes.status, 200, "deployRes.status === 200 OK");
    t2.ok(deployRes.data, "deployRes.data truthy OK");
    t2.ok(
      deployRes.data.transactionReceipt,
      "deployRes.data.transactionReceipt truthy OK",
    );

    if (deployRes.data.transactionReceipt) {
      console.log(deployRes.data.transactionReceipt);
    }
    t2.end();
  });

  t.end();
});
