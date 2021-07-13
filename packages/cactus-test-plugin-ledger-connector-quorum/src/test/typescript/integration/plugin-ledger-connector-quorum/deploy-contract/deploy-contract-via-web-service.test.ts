import test, { Test } from "tape-promise/tape";
import Web3 from "web3";
import { v4 as uuidV4 } from "uuid";
import {
  QuorumTestLedger,
  IQuorumGenesisOptions,
  IAccount,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";
import HelloWorldContractJson from "../../../../solidity/hello-world-contract/HelloWorld.json";
import {
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  PluginLedgerConnectorQuorum,
  DefaultApi,
  Web3SigningCredentialType,
  DeployContractSolidityBytecodeV1Request,
  EthContractInvocationType,
  Configuration,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
  ICactusApiServerOptions,
} from "@hyperledger/cactus-cmd-api-server";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { ICactusPlugin } from "@hyperledger/cactus-core-api";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { AddressInfo } from "net";

const logLevel: LogLevelDesc = "TRACE";
const testCase = "deploys contract via REST API";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-deploy-contract-via-web-service",
  level: logLevel,
});

const contractName = "HelloWorld";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  // 1. Instantiate a ledger object
  const ledger = new QuorumTestLedger();

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  // 2. Start the actual ledger
  await ledger.start();

  // 3. Gather parameteres needed to run an embedded ApiServer which can connect to/interact with said ledger
  const rpcApiHttpHost = await ledger.getRpcApiHttpHost();

  const configService = new ConfigService();
  const cactusApiServerOptions: ICactusApiServerOptions = configService.newExampleConfig();
  cactusApiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
  cactusApiServerOptions.configFile = "";
  cactusApiServerOptions.apiCorsDomainCsv = "*";
  cactusApiServerOptions.apiTlsEnabled = false;
  cactusApiServerOptions.apiPort = 0;
  const config = configService.newExampleConfigConvict(cactusApiServerOptions);
  const plugins: ICactusPlugin[] = [];

  const kvStoragePlugin = new PluginKeychainMemory({
    backend: new Map(),
    instanceId: uuidV4(),
    keychainId: uuidV4(),
  });
  kvStoragePlugin.set(
    HelloWorldContractJson.contractName,
    HelloWorldContractJson,
  );
  plugins.push(kvStoragePlugin);

  const ledgerConnectorQuorum = new PluginLedgerConnectorQuorum({
    instanceId: uuidV4(),
    rpcApiHttpHost,
    pluginRegistry: new PluginRegistry({ plugins: [kvStoragePlugin] }),
  });
  plugins.push(ledgerConnectorQuorum);
  const pluginRegistry = new PluginRegistry({ plugins });

  const apiServer = new ApiServer({
    config: config.getProperties(),
    pluginRegistry,
  });
  test.onFinish(() => apiServer.shutdown());

  // 4. Start the API server which now is connected to the quorum ledger
  const apiServerStartOut = await apiServer.start();
  log.debug(`ApiServer.started OK:`, apiServerStartOut);

  // 5. Find a high net worth account in the genesis object of the quorum ledger
  const quorumGenesisOptions: IQuorumGenesisOptions = await ledger.getGenesisJsObject();
  t.ok(quorumGenesisOptions);
  t.ok(quorumGenesisOptions.alloc);

  const highNetWorthAccounts: string[] = Object.keys(
    quorumGenesisOptions.alloc,
  ).filter((address: string) => {
    const anAccount: IAccount = quorumGenesisOptions.alloc[address];
    const balance: number = parseInt(anAccount.balance, 10);
    return balance > 10e7;
  });
  const [firstHighNetWorthAccount] = highNetWorthAccounts;

  // 6. Instantiate the SDK dynamically with whatever port the API server ended up bound to (port 0)
  const httpServer = apiServer.getHttpServerApi();
  const addressInfo = httpServer?.address() as AddressInfo;
  log.debug(`AddressInfo: `, addressInfo);
  const protocol = config.get("apiTlsEnabled") ? "https:" : "http:";
  const basePath = `${protocol}//${addressInfo.address}:${addressInfo.port}`;
  log.debug(`SDK base path: %s`, basePath);

  const configuration = new Configuration({ basePath });
  const client = new DefaultApi(configuration);

  // 7. Assemble request to invoke the deploy contract method of the quorum ledger connector plugin via the REST API
  const req: DeployContractSolidityBytecodeV1Request = {
    contractName: HelloWorldContractJson.contractName,
    bytecode: HelloWorldContractJson.bytecode,
    web3SigningCredential: {
      ethAccount: firstHighNetWorthAccount,
      secret: "",
      type: Web3SigningCredentialType.GethKeychainPassword,
    },
    keychainId: kvStoragePlugin.getKeychainId(),
    gas: 1000000,
  };

  // 8. Deploy smart contract by issuing REST API call
  const res = await client.deployContractSolBytecodeV1(req);

  t.ok(res, "Response for contract deployment is truthy");
  t.ok(res.status > 199, "Response status code for contract deployment > 199");
  t.ok(res.status < 300, "Response status code for contract deployment < 300");

  test("Invoke contract via SDK ApiClient object", async (t2: Test) => {
    const web3 = new Web3(rpcApiHttpHost);
    const testEthAccount = web3.eth.accounts.create(uuidV4());

    const res1 = await client.runTransactionV1({
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
    });
    t2.ok(res1, "Funds transfer HTTP response #1 via SDK OK");
    t2.ok(res1.status > 199, "Response status for Funds transfer #1 > 199");
    t2.ok(res1.status < 300, "Response status for Funds transfer #1 < 300");

    const balance = await web3.eth.getBalance(testEthAccount.address);
    t2.ok(balance, "Retrieved balance of test account OK");
    t2.equals(parseInt(balance, 10), 10e9, "Balance of test account OK");

    const sayHelloRes = await client.invokeContractV1({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        type: Web3SigningCredentialType.None,
      },
      keychainId: kvStoragePlugin.getKeychainId(),
    });
    t2.ok(sayHelloRes, "sayHello() response is truthy");
    t2.ok(sayHelloRes.status > 199, "Status for sayHello() res > 199");
    t2.ok(sayHelloRes.status < 300, "Status for sayHello() res < 300");
    t2.ok(sayHelloRes.data, "sayHello() response.data is truthy");
    t2.ok(sayHelloRes.data.callOutput, "sayHello() callOutput truthy OK");
    t2.ok(
      typeof sayHelloRes.data.callOutput === "string",
      "sayHello() callOutput is string type OK",
    );
    t2.ok(
      sayHelloRes.data.callOutput === "Hello World!",
      `sayHello() callOutput is "Hello World!" OK`,
    );

    const newName = `DrCactus${uuidV4()}`;
    const setName1Res = await client.invokeContractV1({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "setName",
      params: [newName],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: kvStoragePlugin.getKeychainId(),
    });
    t2.ok(setName1Res, "setName1Res truthy OK");
    t2.ok(setName1Res, "setName1Res truthy OK");
    t2.ok(setName1Res.status > 199, "Status for setName1Res > 199 OK");
    t2.ok(setName1Res.status < 300, "Status for setName1Res < 300 OK");
    t2.ok(setName1Res.data, "setName1Res.data is truthy OK");

    const getName1Res = await client.invokeContractV1({
      contractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: kvStoragePlugin.getKeychainId(),
    });
    t2.ok(getName1Res, `getName1Res truthy OK`);
    t2.true(getName1Res.status > 199, `getName1Res.status > 199 OK`);
    t2.true(getName1Res.status < 300, `getName1Res.status < 300 OK`);
    t2.ok(getName1Res.data, `getName1Res.data truthy OK`);
    t2.ok(getName1Res.data.callOutput, `getName1Res.data.callOutput truthy OK`);
    t2.equal(
      typeof getName1Res.data.callOutput,
      "string",
      `getName1Res.data.callOutput typeof string OK`,
    );
    t2.equal(getName1Res.data.callOutput, newName, `getName1Res truthy OK`);

    const getName2Res = await client.invokeContractV1({
      contractName,
      invocationType: EthContractInvocationType.Send,
      methodName: "getName",
      params: [],
      gas: 1000000,
      signingCredential: {
        ethAccount: testEthAccount.address,
        secret: testEthAccount.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      keychainId: kvStoragePlugin.getKeychainId(),
    });

    t2.ok(getName2Res, `getName2Res truthy OK`);
    t2.true(getName2Res.status > 199, `getName2Res.status > 199 OK`);
    t2.true(getName2Res.status < 300, `getName2Res.status < 300 OK`);
    t2.ok(getName2Res.data, `getName2Res.data truthy OK`);
    t2.notok(
      getName2Res.data.callOutput,
      `getName2Res.data.callOutput falsy OK`,
    );
  });

  t.end();
});
