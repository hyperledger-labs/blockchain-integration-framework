import http from "http";
import type { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import {
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
  NewContractRequest,
  InitializeRequest,
  Web3SigningCredential,
  Configuration,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  BesuTestLedger,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import HashTimeLockJSON from "../../../../../../cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";
import TestTokenJSON from "../../../solidity/token-erc20-contract/Test_Token.json";

const logLevel: LogLevelDesc = "INFO";
const estimatedGas = 6721975;
const expiration = 2147483648;
const besuTestLedger = new BesuTestLedger({ logLevel });
const receiver = "0x" + besuTestLedger.getGenesisAccountPubKey();
const hashLock =
  "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32";
const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const privateKey =
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
const connectorId = uuidv4();
const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;

const testCase = "Test new valid contract";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
  const keychainId = uuidv4();
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[TestTokenJSON.contractName, TestTokenJSON]]),
    logLevel,
  });
  keychainPlugin.set(HashTimeLockJSON.contractName, HashTimeLockJSON);

  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const pluginRegistry = new PluginRegistry({});
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel,
    instanceId: connectorId,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  pluginRegistry.add(connector);
  const pluginOptions: IPluginHtlcEthBesuErc20Options = {
    instanceId: uuidv4(),
    logLevel,
    pluginRegistry,
  };

  const factoryHTLC = new PluginFactoryHtlcEthBesuErc20({
    pluginImportType: PluginImportType.Local,
  });
  const pluginHtlc = await factoryHTLC.create(pluginOptions);
  pluginRegistry.add(pluginHtlc);

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

  const configuration = new Configuration({ basePath: apiHost });
  const api = new BesuApi(configuration);

  await pluginHtlc.getOrCreateWebServices();
  await pluginHtlc.registerWebServices(expressApp);

  t.comment("Deploys HashTimeLock via .json file on initialize function");
  const initRequest: InitializeRequest = {
    connectorId,
    keychainId,
    constructorArgs: [],
    web3SigningCredential,
    gas: estimatedGas,
  };
  const deployOut = await pluginHtlc.initialize(initRequest);
  t.ok(deployOut, "pluginHtlc.initialize() output is truthy OK");
  t.ok(
    deployOut.transactionReceipt,
    "pluginHtlc.initialize() output.transactionReceipt is truthy OK",
  );
  t.ok(
    deployOut.transactionReceipt.contractAddress,
    "pluginHtlc.initialize() output.transactionReceipt.contractAddress is truthy OK",
  );
  const hashTimeLockAddress = deployOut.transactionReceipt
    .contractAddress as string;

  t.comment("Deploys TestToken via .json file on deployContract function");
  const deployOutToken = await connector.deployContract({
    contractName: TestTokenJSON.contractName,
    contractAbi: TestTokenJSON.abi,
    bytecode: TestTokenJSON.bytecode,
    web3SigningCredential,
    keychainId,
    constructorArgs: ["100", "token", "2", "TKN"],
    gas: estimatedGas,
  });
  t.ok(deployOutToken, "deployContract() output is truthy OK");
  t.ok(
    deployOutToken.transactionReceipt,
    "deployContract() output.transactionReceipt is truthy OK",
  );
  t.ok(
    deployOutToken.transactionReceipt.contractAddress,
    "deployContract() output.transactionReceipt.contractAddress is truthy OK",
  );
  const tokenAddress = deployOutToken.transactionReceipt
    .contractAddress as string;

  t.comment("Approve 10 Tokens to HashTimeLockAddress");
  const { success } = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [hashTimeLockAddress, "10"],
    gas: estimatedGas,
  });
  t.equal(success, true, "approve() transactionReceipt.status is true OK");

  t.comment("Get account balance");
  const responseBalance = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "balanceOf",
    params: [firstHighNetWorthAccount],
  });
  t.equal(responseBalance.callOutput, "100", "balance of account is 100 OK");

  t.comment("Get HashTimeLock contract and account allowance");
  const { callOutput } = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "allowance",
    params: [firstHighNetWorthAccount, hashTimeLockAddress],
  });
  t.equal(callOutput, "10", "callOutput() is 10 OK");

  t.comment("Create new contract for HTLC");
  const request: NewContractRequest = {
    contractAddress: hashTimeLockAddress,
    inputAmount: 10,
    outputAmount: 1,
    expiration,
    hashLock,
    tokenAddress,
    receiver,
    outputNetwork: "BTC",
    outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
    connectorId,
    keychainId,
    web3SigningCredential,
    gas: estimatedGas,
  };
  const res = await api.newContractV1(request);
  t.equal(res.status, 200, "response status is 200 OK");
  t.end();
});

test("Test new invalid contract with 0 inputAmount token for HTLC", async (t: Test) => {
  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger();
  await besuTestLedger.start();

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
  const keychainId = uuidv4();
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[TestTokenJSON.contractName, TestTokenJSON]]),
    logLevel,
  });
  keychainPlugin.set(HashTimeLockJSON.contractName, HashTimeLockJSON);

  const factory = new PluginFactoryLedgerConnector({
    pluginImportType: PluginImportType.Local,
  });

  const pluginRegistry = new PluginRegistry({});
  const connector: PluginLedgerConnectorBesu = await factory.create({
    rpcApiHttpHost,
    rpcApiWsHost,
    logLevel,
    instanceId: connectorId,
    pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  });

  pluginRegistry.add(connector);
  const pluginOptions: IPluginHtlcEthBesuErc20Options = {
    instanceId: uuidv4(),
    logLevel,
    pluginRegistry,
  };

  const factoryHTLC = new PluginFactoryHtlcEthBesuErc20({
    pluginImportType: PluginImportType.Local,
  });
  const pluginHtlc = await factoryHTLC.create(pluginOptions);
  pluginRegistry.add(pluginHtlc);

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

  const configuration = new Configuration({ basePath: apiHost });
  const api = new BesuApi(configuration);

  await pluginHtlc.getOrCreateWebServices();
  await pluginHtlc.registerWebServices(expressApp);

  t.comment("Deploys HashTimeLock via .json file on initialize function");
  const initRequest: InitializeRequest = {
    connectorId,
    keychainId,
    constructorArgs: [],
    web3SigningCredential,
    gas: estimatedGas,
  };
  const deployOut = await pluginHtlc.initialize(initRequest);

  t.ok(deployOut, "pluginHtlc.initialize() output is truthy OK");
  t.ok(
    deployOut.transactionReceipt,
    "pluginHtlc.initialize() output.transactionReceipt is truthy OK",
  );
  t.ok(
    deployOut.transactionReceipt.contractAddress,
    "pluginHtlc.initialize() output.transactionReceipt.contractAddress is truthy OK",
  );
  const hashTimeLockAddress = deployOut.transactionReceipt
    .contractAddress as string;

  t.comment("Deploys TestToken via .json file on deployContract function");
  const deployOutToken = await connector.deployContract({
    contractName: TestTokenJSON.contractName,
    contractAbi: TestTokenJSON.abi,
    bytecode: TestTokenJSON.bytecode,
    web3SigningCredential,
    keychainId,
    constructorArgs: ["100", "token", "2", "TKN"],
    gas: estimatedGas,
  });
  t.ok(deployOutToken, "deployContract() output is truthy OK");
  t.ok(
    deployOutToken.transactionReceipt,
    "deployContract() output.transactionReceipt is truthy OK",
  );
  t.ok(
    deployOutToken.transactionReceipt.contractAddress,
    "deployContract() output.transactionReceipt.contractAddress is truthy OK",
  );
  const tokenAddress = deployOutToken.transactionReceipt
    .contractAddress as string;

  t.comment("Approve 10 Tokens to HashTimeLockAddress");
  const { success } = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Send,
    methodName: "approve",
    params: [hashTimeLockAddress, "10"],
    gas: estimatedGas,
  });
  t.equal(success, true, "approve() transactionReceipt.status is true OK");

  t.comment("Get balance of account");
  const responseBalance = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "balanceOf",
    params: [firstHighNetWorthAccount],
  });
  t.equal(responseBalance.callOutput, "100", "balance of account is 100 OK");

  t.comment("Get HashTimeLock contract and account allowance");
  const { callOutput } = await connector.invokeContract({
    contractName: TestTokenJSON.contractName,
    keychainId,
    signingCredential: web3SigningCredential,
    invocationType: EthContractInvocationType.Call,
    methodName: "allowance",
    params: [firstHighNetWorthAccount, hashTimeLockAddress],
  });
  t.equal(callOutput, "10", "callOutput() is 10 OK");

  t.comment("Create new invalid contract with 0 inputAmount token for HTLC");
  try {
    const request: NewContractRequest = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 0,
      outputAmount: 0,
      expiration,
      hashLock,
      tokenAddress,
      receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId,
      keychainId,
      web3SigningCredential,
      gas: estimatedGas,
    };
    const res = await api.newContractV1(request);
    t.equal(res.status, 400, "response status is 400");
  } catch (error) {
    t.equal(error.response.status, 400, "response status is 400");
  }
  t.end();
});
