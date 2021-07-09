import test, { Test } from "tape-promise/tape";
import { v4 as uuidV4 } from "uuid";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import {
  EthContractInvocationType,
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
  DefaultApi as QuorumApi,
  DeployContractSolidityBytecodeV1Request,
  InvokeContractV1Request,
  RunTransactionRequest,
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
  // create an http server
  const httpServer = createServer();
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.once("listening", resolve);
    httpServer.listen(0, "127.0.0.1");
  });
  const addressInfo = httpServer.address() as AddressInfo;
  const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

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

  // create a new account
  const testEthAccount = await quorumTestLedger.createEthTestAccount();

  // create the keychain plugin for recently created account
  const keychainEntryKey = uuidV4();
  const keychainId = uuidV4();
  const keychainEntryValue = testEthAccount.privateKey;
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

  // register the connector
  pluginRegistry.add(connector);

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

  const fDeploy = "apiV1QuorumDeployContractSolidityBytecode";
  const fInvoke = "apiV1QuorumInvokeContract";
  const fRun = "apiV1QuorumRunTransaction";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      contractName: HelloWorldContractJson.contractName,
      keychainId: keychainPlugin.getKeychainId(),
      web3SigningCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    };
    const res = await apiClient.apiV1QuorumDeployContractSolidityBytecode(
      parameters as DeployContractSolidityBytecodeV1Request,
    );
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
        keychainId: keychainPlugin.getKeychainId(),
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      };
      await apiClient.apiV1QuorumDeployContractSolidityBytecode(
        parameters as DeployContractSolidityBytecodeV1Request,
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
      t2.ok(
        fields.includes("bytecode"),
        "Rejected because bytecode is required",
      );
      t2.notOk(fields.includes("gas"), "gas is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
        fake: 98,
      };
      await apiClient.apiV1QuorumDeployContractSolidityBytecode(
        parameters as DeployContractSolidityBytecodeV1Request,
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
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [`DrCactus${uuidV4()}`],
      gas: 1000000,
      signingCredential: {
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      nonce: 2,
    };
    const res = await apiClient.apiV1QuorumInvokeContract(
      parameters as InvokeContractV1Request,
    );
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
        invocationType: EthContractInvocationType.Send,
        params: [`DrCactus${uuidV4()}`],
        gas: 1000000,
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      };
      await apiClient.apiV1QuorumInvokeContract(
        parameters as InvokeContractV1Request,
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
      t2.ok(
        fields.includes("methodName"),
        "Rejected because methodName is required",
      );
      t2.notOk(fields.includes("nonce"), "nonce is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractName: HelloWorldContractJson.contractName,
        keychainId: keychainPlugin.getKeychainId(),
        invocationType: EthContractInvocationType.Send,
        methodName: "setName",
        params: [`DrCactus${uuidV4()}`],
        gas: 1000000,
        signingCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
        nonce: 2,
        fake: 98,
      };
      await apiClient.apiV1QuorumInvokeContract(
        parameters as InvokeContractV1Request,
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
        ethAccount: firstHighNetWorthAccount,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
      transactionConfig: {
        from: firstHighNetWorthAccount,
        to: testEthAccount.address,
        value: 10e9,
      },
    };
    const res = await apiClient.apiV1QuorumRunTransaction(
      parameters as RunTransactionRequest,
    );
    t2.ok(res, "Transaction executed successfully");
    t2.ok(res.data);
    t2.equal(
      res.status,
      200,
      `Endpoint ${fRun} in test case '${cOk}': status === 200`,
    );

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        web3SigningCredential: {
          ethAccount: firstHighNetWorthAccount,
          secret: "",
          type: Web3SigningCredentialType.GethKeychainPassword,
        },
      };
      await apiClient.apiV1QuorumRunTransaction(
        parameters as RunTransactionRequest,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("transactionConfig"),
        "Rejected because transactionConfig is required",
      );
      t2.notOk(fields.includes("timeoutMs"), "timeoutMs is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
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
        fake: 34,
      };
      await apiClient.apiV1QuorumRunTransaction(
        parameters as RunTransactionRequest,
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
