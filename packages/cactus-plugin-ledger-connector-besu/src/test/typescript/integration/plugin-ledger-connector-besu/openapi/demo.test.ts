import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  BesuApiClient,
  DeployContractSolidityBytecodeV1Request,
  IPluginLedgerConnectorBesuOptions,
  SignTransactionRequest,
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
import Web3 from "web3";
import { createServer } from "http";
import { AddressInfo } from "net";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { BesuApiClientOptions } from "../../../../../main/typescript/api-client/besu-api-client";
import EEAClient, { IWeb3InstanceExtended } from "web3-eea";

const logLevel: LogLevelDesc = "TRACE";

const testCase = "Besu API";
test(testCase, async (t: Test) => {
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const keychainIdForSigned = uuidv4();
  const keychainIdForUnsigned = uuidv4();
  const keychainRefForSigned = uuidv4();
  const keychainRefForUnsigned = uuidv4();

  const httpServer1 = createServer();
  await new Promise((resolve, reject) => {
    httpServer1.once("error", reject);
    httpServer1.once("listening", resolve);
    httpServer1.listen(0, "127.0.0.1");
  });
  const addressInfo1 = httpServer1.address() as AddressInfo;
  const node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;

  const besuTestLedger = new BesuTestLedger();
  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });
  await besuTestLedger.start();

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();

  const web3Provider = new Web3.providers.HttpProvider(rpcApiHttpHost);
  const web3 = new Web3(web3Provider);

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
  const testEthAccount = web3.eth.accounts.create(uuidv4());
  const keychainEntryValue = testEthAccount.privateKey;
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
  apiServerOptions.apiPort = addressInfo1.port;
  apiServerOptions.cockpitPort = 0;
  apiServerOptions.apiTlsEnabled = false;
  const config = configService.newExampleConfigConvict(apiServerOptions);

  pluginRegistry.add(connector);

  const apiServer = new ApiServer({
    httpServerApi: httpServer1,
    config: config.getProperties(),
    pluginRegistry,
  });

  test.onFinish(() => apiServer.shutdown());
  await apiServer.start();

  const besuApiClientOptions = new BesuApiClientOptions({
    basePath: node1Host,
  });
  const apiClient = new BesuApiClient(besuApiClientOptions);

  // DEPLOY DOES NOT WORK WHEN I CALL SIGN TRANSACTION BEFORE DEPLOY
  // ALL WORKS WHEN I CALL SIGN TRANSACTION AFTER DEPLOY

  // sign a transaction

  test(`${testCase} - ${fSign} - ${cOk}`, async (t2: Test) => {
    const web3Eea: IWeb3InstanceExtended = EEAClient(web3, 2018);
    const orionKeyPair = await besuTestLedger.getOrionKeyPair();
    const besuKeyPair = await besuTestLedger.getBesuKeyPair();
    const besuPrivateKey = besuKeyPair.privateKey.toLowerCase().startsWith("0x")
      ? besuKeyPair.privateKey.substring(2)
      : besuKeyPair.privateKey; // besu node's private key

    const contractOptions = {
      data: `0x123`,
      privateFrom: orionKeyPair.publicKey,
      privateFor: [orionKeyPair.publicKey],
      privateKey: besuPrivateKey,
    };
    const transactionHash = await web3Eea.eea.sendRawTransaction(
      contractOptions,
    );

    const res = await apiClient.signTransactionV1({
      keychainId: keychainIdForSigned,
      keychainRef: keychainRefForSigned,
      transactionHash,
    });
    if (res.data.signature) {
      console.log(res.data.signature);
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

    const res = await apiClient.apiV1BesuDeployContractSolidityBytecode({
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
    if (res.data.transactionReceipt) {
      console.log(res.data.transactionReceipt);
    }
    t2.end();
  });

  t.end();
});
