/* eslint-disable prettier/prettier */
import test, { Test } from "tape-promise/tape";
import { v4 as uuidV4 } from "uuid";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
  DeployContractSolidityBytecodeV1Request,
  // RunTransactionRequest,
  // RunTransactionRequest,
  // EthContractInvocationType,
  // InvokeContractV1Request,
} from "../../../../../main/typescript/public-api";
import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
} from "@hyperledger/cactus-test-tooling";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { createServer } from "http";
import { AddressInfo } from "net";
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "INFO";
const testCase = "Quorum API";
test(testCase, async (t: Test) => {
  // create the test quorumTestLedger
  const containerImageVersion = "2021-01-08-7a055c3"; // Quorum v2.3.0, Tessera v0.10.0
  const containerImageName = "hyperledger/cactus-quorum-all-in-one";
  const ledgerOptions = { containerImageName, containerImageVersion };
  const quorumTestLedger = new QuorumTestLedger(ledgerOptions);
  test.onFinish(async () => {
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();
  });
  await quorumTestLedger.start();

  // retrieve host to which connector will attack
  const rpcApiHttpHost = await quorumTestLedger.getRpcApiHttpHost();

  // obtain accounts from genesis
  const quorumGenesisOptions: IQuorumGenesisOptions = await quorumTestLedger.getGenesisJsObject();
  const highNetWorthAccounts: string[] = Object.keys(
    quorumGenesisOptions.alloc,
  ).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const theBalance = parseInt(anAccount.balance, 10);
    return theBalance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  // create a new account with few founds (10e8)
  const testEthAccount1 = await quorumTestLedger.createEthTestAccount();
  const testEthAccount2 = await quorumTestLedger.createEthTestAccount();

  // create the keychain plugin for recently created account
  const keychainEntryKey = uuidV4();
  const keychainId = uuidV4();
  const keychainEntryValue = testEthAccount1.privateKey;
  const keychainPlugin = new PluginKeychainMemory({
    instanceId: uuidV4(),
    keychainId,
    backend: new Map([[keychainEntryKey, keychainEntryValue]]),
    logLevel,
  });
  keychainPlugin.set(
    HelloWorldContractJson.contractName,
    HelloWorldContractJson,
  );

  // create a plugin registry with the recently created keychain plugin
  const pluginRegistry = new PluginRegistry({
    plugins: [keychainPlugin],
  });

  // create the connector including test ledger host and plugin registry
  const connector: PluginLedgerConnectorQuorum = new PluginLedgerConnectorQuorum(
    {
      instanceId: uuidV4(),
      rpcApiHttpHost,
      logLevel,
      pluginRegistry,
    },
  );

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
  const apiClient = new QuorumApi(apiConfig);


  
  const credentials = {

    // testEthAccount1 created from quorumTestLedger
    // testEthAccount1 added to keychainPlugin
    cactusCredential: {
      type: Web3SigningCredentialType.CactusKeychainRef,
      ethAccount: testEthAccount1.address,
      keychainEntryKey,
      keychainId,
    },

    // firstHighNetWorthAccount recovered from genesis
    gethCredential: {
      type: Web3SigningCredentialType.GethKeychainPassword,
      ethAccount: firstHighNetWorthAccount,
      secret: "",
    },

    // testEthAccount2 created from quorumTestLedger
    // testEthAccount2 NOT added to keychainPlugin
    privateKeyCredential: {
      type: Web3SigningCredentialType.PrivateKeyHex,
      ethAccount: testEthAccount2.address,
      secret: testEthAccount2.privateKey,
    },

    // it is able to call deploy without credentials?
    noneCredential: {
      type: Web3SigningCredentialType.None,
    },
  };

  try {



    test("Quorum Test", async (t2: Test) => {

      const parameters = {
        contractName: HelloWorldContractJson.contractName,
        keychainId,
        web3SigningCredential: credentials.gethCredential,
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
      };
      const res = await apiClient.apiV1QuorumDeployContractSolidityBytecode(
        parameters as DeployContractSolidityBytecodeV1Request,
      );

      console.log(res.data.transactionReceipt);

      // console.log(`credentials.cactusCredential.ethAccount: ${credentials.cactusCredential.ethAccount}`);
      // console.log(`credentials.privateKeyCredential.ethAccount acc: ${credentials.privateKeyCredential.ethAccount}`);
      // console.log(`credentials.gethCredential.ethAccount: ${credentials.gethCredential.ethAccount}`);
      // console.log(`from acc: ${res.data.transactionReceipt.from}`);

      t2.end();
    });



    // from field must be the account of the credential
    // if from field is a geth account, it does not need gas
    // gethCredential does not need gas field (is set by default somewhere)
    // cactusCredential and privateKeyCredential accounts have only an amount of 10e8 and need at least a gas limit of 21000
    // test(`test`, async (t2: Test) => {
    //   const parameters = {
    //     web3SigningCredential: credentials.privateKeyCredential,
    //     transactionConfig: {
    //       from: credentials.gethCredential.ethAccount,
    //       to: credentials.privateKeyCredential.ethAccount,
    //       value: 10e7,
    //       gas: 22000,
    //     },
    //   };
    //   const res = await apiClient.apiV1QuorumRunTransaction(
    //     parameters as RunTransactionRequest,
    //   );

    //   console.log(res.data);

    //   t2.end();
    // });



    // test(`test quorum`, async (t2: Test) => {
    //   const parameters = {
    //     contractName: HelloWorldContractJson.contractName,
    //     keychainId: keychainPlugin.getKeychainId(),
    //     invocationType: EthContractInvocationType.Send,
    //     methodName: "setName",
    //     params: [`DrCactus${uuidV4()}`],
    //     gas: 1000000,
    //     signingCredential: credentials.cactusCredential,
    //     nonce: 2,
    //   };
    //   const res = await apiClient.apiV1QuorumInvokeContract(
    //     parameters as InvokeContractV1Request,
    //   );
      
    //   console.log(res);

    //   t2.end();
    // });

    // test(`${testCase} - ${fRun} - ${cOk}`, async (t2: Test) => {
    //     const parameters = {
    //     web3SigningCredential: {
    //         ethAccount: firstHighNetWorthAccount,
    //         secret: "",
    //         type: Web3SigningCredentialType.GethKeychainPassword,
    //     },
    //     transactionConfig: {
    //         from: firstHighNetWorthAccount,
    //         to: testEthAccount1.address,
    //         value: 10e9,
    //     },
    //     };
    //     const res = await apiClient.apiV1QuorumRunTransaction(
    //     parameters as RunTransactionRequest,
    //     );
    //     t2.ok(res, "Transaction runned successfully");
    //     t2.ok(res.data);
    //     t2.equal(res.status, 200);

    //     t2.end();
    // });
  } catch (e) {
    console.log(e);
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();

    apiServer.shutdown();
  } /*finally {
    await quorumTestLedger.stop();
    await quorumTestLedger.destroy();

    apiServer.shutdown();
  }*/

  t.end();
});
