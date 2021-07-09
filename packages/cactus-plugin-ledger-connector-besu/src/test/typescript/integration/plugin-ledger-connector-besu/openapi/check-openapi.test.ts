import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  Web3SigningCredentialType,
  PluginLedgerConnectorBesu,
  BesuApiClient,
  IPluginLedgerConnectorBesuOptions,
  ReceiptType,
  RunTransactionRequest,
  InvokeContractV1Request,
  EthContractInvocationType,
  DeployContractSolidityBytecodeV1Request,
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

  const fDeploy = "apiV1BesuDeployContractSolidityBytecode";
  const fInvoke = "apiV1BesuInvokeContract";
  const fRun = "apiV1BesuRunTransaction";
  const fSign = "signTransactionV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      keychainId: keychainIdForUnsigned,
      contractName: HelloWorldContractJson.contractName,
      contractAbi: HelloWorldContractJson.abi,
      constructorArgs: [],
      web3SigningCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      bytecode: HelloWorldContractJson.bytecode,
      gas: 1000000,
    };
    const res = await apiClient.apiV1BesuDeployContractSolidityBytecode(
      parameters as DeployContractSolidityBytecodeV1Request,
    );
    t2.ok(res, "Contract deployed successfully");
    t2.ok(res.data);
    t2.equal(res.status, 200);

    t2.end();
  });

  test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        keychainId: keychainIdForUnsigned,
        contractAbi: HelloWorldContractJson.abi,
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      };
      await apiClient.apiV1BesuDeployContractSolidityBytecode(
        (parameters as any) as DeployContractSolidityBytecodeV1Request,
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
        keychainId: keychainIdForUnsigned,
        contractName: HelloWorldContractJson.contractName,
        contractAbi: HelloWorldContractJson.abi,
        constructorArgs: [],
        web3SigningCredential: {
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        bytecode: HelloWorldContractJson.bytecode,
        gas: 1000000,
        fake: 5,
      };
      await apiClient.apiV1BesuDeployContractSolidityBytecode(
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
      contractName: "HelloWorld",
      keychainId: keychainIdForUnsigned,
      invocationType: EthContractInvocationType.Call,
      methodName: "sayHello",
      params: [],
      signingCredential: {
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
    };
    const res = await apiClient.apiV1BesuInvokeContract(
      parameters as InvokeContractV1Request,
    );
    t2.ok(res, "Contract deployed successfully");
    t2.ok(res.data);
    t2.equal(res.status, 200);

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        keychainId: keychainIdForUnsigned,
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        signingCredential: {
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
      };
      await apiClient.apiV1BesuInvokeContract(
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
      t2.notOk(fields.includes("gas"), "gas is not required");
    }

    t2.end();
  });

  test(`${testCase} - ${fInvoke} - ${cInvalidParams}`, async (t2: Test) => {
    try {
      const parameters = {
        contractName: "HelloWorld",
        keychainId: keychainIdForUnsigned,
        invocationType: EthContractInvocationType.Call,
        methodName: "sayHello",
        params: [],
        signingCredential: {
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        fake: 8,
      };
      await apiClient.apiV1BesuInvokeContract(
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
        ethAccount: testEthAccount1.address,
        secret: testEthAccount1.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      transactionConfig: {
        from: testEthAccount1.address,
        to: testEthAccount2.address,
        value: 10e7,
        gas: 1000000,
      },
      consistencyStrategy: {
        blockConfirmations: 0,
        receiptType: ReceiptType.NodeTxPoolAck,
        timeoutMs: 60000,
      },
    };
    const res = await apiClient.apiV1BesuRunTransaction(
      parameters as RunTransactionRequest,
    );
    t2.ok(res, "Transaction runned successfully");
    t2.ok(res.data);
    t2.equal(res.status, 200);

    t2.end();
  });

  test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
    try {
      const parameters = {
        web3SigningCredential: {
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        transactionConfig: {
          from: testEthAccount1.address,
          to: testEthAccount2.address,
          value: 10e7,
          gas: 1000000,
        },
      };
      await apiClient.apiV1BesuRunTransaction(
        parameters as RunTransactionRequest,
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
          ethAccount: testEthAccount1.address,
          secret: testEthAccount1.privateKey,
          type: Web3SigningCredentialType.PrivateKeyHex,
        },
        transactionConfig: {
          from: testEthAccount1.address,
          to: testEthAccount2.address,
          value: 10e7,
          gas: 1000000,
        },
        consistencyStrategy: {
          blockConfirmations: 0,
          receiptType: ReceiptType.NodeTxPoolAck,
          timeoutMs: 60000,
        },
        fake: 34,
      };
      await apiClient.apiV1BesuRunTransaction(
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

    const parameters = {
      keychainId: keychainIdForSigned,
      keychainRef: keychainRefForSigned,
      transactionHash: runTxRes.data.transactionReceipt.transactionHash,
    };

    const res = await apiClient.signTransactionV1(
      parameters as SignTransactionRequest,
    );

    t2.ok(res, "Transaction signed successfully");
    t2.ok(res.data);
    t2.equal(res.status, 200);

    t2.end();
  });

  test(`${testCase} - ${fSign} - ${cWithoutParams}`, async (t2: Test) => {
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

    try {
      const parameters = {
        keychainRef: keychainRefForSigned,
        transactionHash: runTxRes.data.transactionReceipt.transactionHash,
      };

      await apiClient.signTransactionV1(parameters as SignTransactionRequest);
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

  test(`${testCase} - ${fSign} - ${cInvalidParams}`, async (t2: Test) => {
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

    try {
      const parameters = {
        keychainId: keychainIdForSigned,
        keychainRef: keychainRefForSigned,
        transactionHash: runTxRes.data.transactionReceipt.transactionHash,
        fake: 6,
      };

      await apiClient.signTransactionV1(parameters as SignTransactionRequest);
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
