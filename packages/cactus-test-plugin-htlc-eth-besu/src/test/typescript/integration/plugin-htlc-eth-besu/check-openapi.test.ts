/* eslint-disable prettier/prettier */
// import http from "http";
// import type { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
// import express from "express";
// import bodyParser from "body-parser";
import {
  IPluginHtlcEthBesuOptions,
  // PluginFactoryHtlcEthBesu,
  Configuration,
  DefaultApi as BesuApi,
  PluginHtlcEthBesu,
  InitializeRequest,
  NewContractObj,
  // InitializeRequest,
} from "@hyperledger/cactus-plugin-htlc-eth-besu";
import {
  IPluginLedgerConnectorBesuOptions,
  // IPluginLedgerConnectorBesuOptions,
  // PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  IListenOptions,
  LogLevelDesc, Servers,
  // IListenOptions,
  // Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
// import { PluginImportType } from "@hyperledger/cactus-core-api";
import {
  BesuTestLedger,
  // pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { DataTest } from "../data-test";
import DemoHelperJSON from "../../../solidity/contracts/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../cactus-plugin-htlc-eth-besu/src/main/solidity/contracts/HashTimeLock.json";
// import {
//   ApiServer,
//   AuthorizationProtocol,
//   ConfigService,
// } from "@hyperledger/cactus-cmd-api-server";
import { createServer } from "http";
import { AddressInfo } from "net";
import express from "express";
import bodyParser from "body-parser";
// import { BesuApiClientOptions } from "../../../../../main/typescript/api-client/besu-api-client";

const connectorId = uuidv4();
const logLevel: LogLevelDesc = "INFO";
const firstHighNetWorthAccount = "627306090abaB3A6e1400e9345bC60c78a8BEf57";
const privateKey =
  "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";
const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;

const testCase = "HTLC Besu API";

// test("BEFORE " + testCase, async (t: Test) => {
//   const pruning = pruneDockerAllIfGithubAction({ logLevel });
//   await t.doesNotReject(pruning, "Pruning did not throw OK");
//   t.end();
// });

test(testCase, async (t: Test) => {
  // t.comment("Starting Besu Test Ledger");

  // create an http server
  // const httpServer = createServer();
  // await new Promise((resolve, reject) => {
  //   httpServer.once("error", reject);
  //   httpServer.once("listening", resolve);
  //   httpServer.listen(0, "127.0.0.1");
  // });
  // const addressInfo = httpServer.address() as AddressInfo;
  // const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

  // create a test ledger
  const besuTestLedger = new BesuTestLedger({ logLevel });
  // test.onFailure(async () => {
  //   await besuTestLedger.stop();
  //   await besuTestLedger.destroy();
  // });
  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });
  await besuTestLedger.start();

  // retrieve http and ws hosts
  const rpcApiHttpHost = await besuTestLedger.getRpcApiHttpHost();
  const rpcApiWsHost = await besuTestLedger.getRpcApiWsHost();
  
  // create a keychain linked with a contract and add a htlc
  const keychainId = uuidv4();
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidv4(),
    keychainId,
    // pre-provision keychain with mock backend holding the private key of the
    // test account that we'll reference while sending requests with the
    // signing credential pointing to this keychain entry.
    backend: new Map([[DemoHelperJSON.contractName, DemoHelperJSON]]),
    logLevel,
  });
  keychainPlugin.set(HashTimeLockJSON.contractName, HashTimeLockJSON);

  // add the keychain to a plugin registry
  const pluginRegistry = new PluginRegistry({
    plugins: [keychainPlugin],
  });

  // create the connector to besu
  
  // const connectorFactory = new PluginFactoryLedgerConnector({
  //   pluginImportType: PluginImportType.Local,
  // });
  // const connector: PluginLedgerConnectorBesu = await connectorFactory.create({
  //   rpcApiHttpHost,
  //   rpcApiWsHost,
  //   logLevel,
  //   instanceId: connectorId,
  //   pluginRegistry: new PluginRegistry({ plugins: [keychainPlugin] }),
  // });

  const connOptions: IPluginLedgerConnectorBesuOptions = {
    instanceId: connectorId,
    rpcApiHttpHost,
    rpcApiWsHost,
    pluginRegistry,
    logLevel,
  };
  const connector = new PluginLedgerConnectorBesu(connOptions);



  // add the besu connector to the plugin registry
  pluginRegistry.add(connector);

  // create an htlc plugin
  // const factoryHTLC = new PluginFactoryHtlcEthBesu({
  //   pluginImportType: PluginImportType.Local,
  // });
  const pluginOptions: IPluginHtlcEthBesuOptions = {
    logLevel,
    instanceId: uuidv4(),
    pluginRegistry,
  };
  // const pluginHtlc = await factoryHTLC.create(pluginOptions);

  const pluginHtlc = new PluginHtlcEthBesu(pluginOptions);


  // add the htlc plugin to the plugin registry
  pluginRegistry.add(pluginHtlc);

  // // create configuration for api server
  // const configService = new ConfigService();
  // const apiServerOptions = configService.newExampleConfig();
  // apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  // apiServerOptions.configFile = "";
  // apiServerOptions.apiCorsDomainCsv = "*";
  // apiServerOptions.apiPort = addressInfo.port;
  // apiServerOptions.cockpitPort = 0;
  // apiServerOptions.apiTlsEnabled = false;
  // const config = configService.newExampleConfigConvict(apiServerOptions);

  // // create an api server on the http server
  // const apiServer = new ApiServer({
  //   httpServerApi: httpServer,
  //   config: config.getProperties(),
  //   pluginRegistry,
  // });

  // // start api server and shutdown when test finish
  // test.onFinish(() => apiServer.shutdown());
  // await apiServer.start();

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = createServer(expressApp);
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
  const apiClient = new BesuApi(configuration);

  await pluginHtlc.getOrCreateWebServices();
  await pluginHtlc.registerWebServices(expressApp);
  

  // const besuApiClientOptions = new BesuApiClientOptions({
  //   basePath: apiHost,
  // });
  // const apiClient = new BesuApiClient({
  //   basePath: apiHost,
  // });

  // const fInitialize = "initialize";
  const fNewContract = "newContract";
  // const fRefund = "refund";
  // const fWithdraw = "withdraw";
  // const fGetStatus = "getStatus";
  // const fGetSingleStatus = "getSingleStatus";
  const cOk = "without bad request error";
  // const cWithoutParams = "not sending all required parameters";
  // const cInvalidParams = "sending parameters that are not valid";


  // test(`${testCase} - ${fInitialize} - ${cOk}`, async (t2: Test) => {

  //   const parameters = {
  //     connectorId,
  //     keychainId,
  //     constructorArgs: [],
  //     web3SigningCredential,
  //     gas: DataTest.estimated_gas,
  //   };

  //   // const res = await pluginHtlc.initialize(parameters);
  //   // t2.ok(res, "initialize invoked successfully");
  //   // t2.ok(res.transactionReceipt);
  //   // t2.equal(res.transactionReceipt.status, true);

  //   const res = await apiClient.initialize(parameters);
  //   t2.ok(res, "initialize invoked successfully");
  //   t2.equal(res.status, 200);
  //   t2.ok(res.data.transactionReceipt);
    
    
  //   t2.end();
  // });


  test(`${testCase} - ${fNewContract} - ${cOk}`, async (t2: Test) => {

    t2.comment("Deploys HashTimeLock via .json file on initialize function");
  const initRequest: InitializeRequest = {
    connectorId,
    keychainId,
    constructorArgs: [],
    web3SigningCredential,
    gas: DataTest.estimated_gas,
  };
  const deployOut = await pluginHtlc.initialize(initRequest);
  t2.ok(
    deployOut.transactionReceipt,
    "pluginHtlc.initialize() output.transactionReceipt is truthy OK",
  );
  t2.ok(
    deployOut.transactionReceipt.contractAddress,
    "pluginHtlc.initialize() output.transactionReceipt.contractAddress is truthy OK",
  );
  const hashTimeLockAddress = deployOut.transactionReceipt
    .contractAddress as string;

  //Deploy DemoHelpers
  t2.comment("Deploys DemoHelpers via .json file on deployContract function");
  const deployOutDemo = await connector.deployContract({
    contractName: DemoHelperJSON.contractName,
    contractAbi: DemoHelperJSON.abi,
    bytecode: DemoHelperJSON.bytecode,
    web3SigningCredential,
    keychainId,
    constructorArgs: [],
    gas: DataTest.estimated_gas,
  });
  t2.ok(deployOutDemo, "deployContract() output is truthy OK");
  t2.ok(
    deployOutDemo.transactionReceipt,
    "deployContract() output.transactionReceipt is truthy OK",
  );
  t2.ok(
    deployOutDemo.transactionReceipt.contractAddress,
    "deployContract() output.transactionReceipt.contractAddress is truthy OK",
  );

  t2.comment("Create new contract for HTLC");
  const bodyObj: NewContractObj = {
    contractAddress: hashTimeLockAddress,
    inputAmount: 10,
    outputAmount: 0x04,
    expiration: DataTest.expiration,
    hashLock: DataTest.hashLock,
    receiver: DataTest.receiver,
    outputNetwork: "BTC",
    outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
    connectorId: connectorId,
    web3SigningCredential,
    keychainId,
    gas: DataTest.estimated_gas,
  };
  const resp = await apiClient.newContract(bodyObj);
  t2.ok(resp, "response newContract is OK");
  t2.equal(resp.status, 200, "response status newContract is OK");
    
    
    t2.end();
  });


  // test(`${testCase} - ${fInitialize} - ${cWithoutParams}`, async (t2: Test) => {

  //   try {
  //     const parameters = {
  //       connectorId,
  //       keychainId,
  //       constructorArgs: [],
  //       web3SigningCredential,
  //       gas: DataTest.estimated_gas,
  //     };
  
  //     const res = await apiClient.initialize(parameters as any as InitializeRequest);
  //     console.log(res.data);
  //   } catch(e) {

  //     console.log(e);
  //     // t2.equal(e.response.status, 400, "Bad request");
  //     // const fields = e.response.data.map((param: any) =>
  //     //   param.path.replace(".body.", ""),
  //     // );
  //     // console.log(fields);
  //     // t2.ok(
  //     //   fields.includes("connectorId"),
  //     //   "Rejected because connectorId is required",
  //     // );

  //     console.log(e.response.data);
  //   }
    
  //   t2.end();
  // });


  t.end();
});


