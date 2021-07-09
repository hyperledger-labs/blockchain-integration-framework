import http from "http";
import type { AddressInfo } from "net";
import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import {
  Configuration,
  DefaultApi as BesuApi,
  IPluginHtlcEthBesuErc20Options,
  PluginFactoryHtlcEthBesuErc20,
  NewContractRequest,
  InitializeRequest,
  RefundRequest,
  WithdrawRequest,
  GetStatusRequest,
  GetSingleStatusRequest,
} from "@hyperledger/cactus-plugin-htlc-eth-besu-erc20";
import {
  EthContractInvocationType,
  PluginFactoryLedgerConnector,
  PluginLedgerConnectorBesu,
  Web3SigningCredential,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
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
import TestTokenJSON from "../../../solidity/token-erc20-contract/Test_Token.json";
import DemoHelperJSON from "../../../solidity/token-erc20-contract/DemoHelpers.json";
import HashTimeLockJSON from "../../../../../../cactus-plugin-htlc-eth-besu-erc20/src/main/solidity/contracts/HashedTimeLockContract.json";

const connectorId = uuidv4();
const logLevel: LogLevelDesc = "INFO";
const expiration = 2147483648;
const secret =
  "0x3853485acd2bfc3c632026ee365279743af107a30492e3ceaa7aefc30c2a048a";
const estimatedGas = 6721975;
const receiver = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
const hashLock =
  "0x3c335ba7f06a8b01d0596589f73c19069e21c81e5013b91f408165d1bf623d32";
const firstHighNetWorthAccount = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const privateKey =
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
const web3SigningCredential: Web3SigningCredential = {
  ethAccount: firstHighNetWorthAccount,
  secret: privateKey,
  type: Web3SigningCredentialType.PrivateKeyHex,
} as Web3SigningCredential;

const testCase = "Test cactus-plugin-htlc-eth-besu-erc20 openapi validation";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  t.comment("Starting Besu Test Ledger");
  const besuTestLedger = new BesuTestLedger({ logLevel });

  test.onFailure(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  test.onFinish(async () => {
    await besuTestLedger.stop();
    await besuTestLedger.destroy();
  });

  await besuTestLedger.start();

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
  keychainPlugin.set(DemoHelperJSON.contractName, DemoHelperJSON);
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
    logLevel,
    instanceId: uuidv4(),
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

  const fInitialize = "initialize";
  const fNew = "newContract";
  const fRefund = "refund";
  const fWithdraw = "withdraw";
  const fStatus = "getStatus";
  const fSingleStatus = "getSingleStatus";

  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  let hashTimeLockAddress: string;
  let timestamp: number;
  let tokenAddress: string;
  let txId: string;

  test(`${testCase} - ${fInitialize} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };

    const res = await api.initialize(parameters);
    t2.ok(res, "initialize called successfully");
    t2.equal(res.status, 200);

    hashTimeLockAddress = res.data.transactionReceipt.contractAddress as string;

    t2.end();
  });

  test(`${testCase} - ${fInitialize} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
    };

    try {
      await api.initialize((parameters as any) as InitializeRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("connectorId"),
        "Rejected because connectorId is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fInitialize} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      connectorId,
      keychainId,
      constructorArgs: [],
      web3SigningCredential,
      gas: estimatedGas,
      fake: 7,
    };

    try {
      await api.initialize((parameters as any) as InitializeRequest);
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

  test(`${testCase} - ${fNew} - ${cOk}`, async (t2: Test) => {
    const deployOutToken = await connector.deployContract({
      contractName: TestTokenJSON.contractName,
      contractAbi: TestTokenJSON.abi,
      bytecode: TestTokenJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: ["100", "token", "2", "TKN"],
      gas: estimatedGas,
    });
    t2.ok(deployOutToken, "deployOutToken is truthy OK");
    t2.ok(
      deployOutToken.transactionReceipt,
      "deployOutToken.transactionReceipt is truthy OK",
    );
    t2.ok(
      deployOutToken.transactionReceipt.contractAddress,
      "deployOutToken.transactionReceipt.contractAddress is truthy OK",
    );
    tokenAddress = deployOutToken.transactionReceipt.contractAddress as string;

    const deployOutDemo = await connector.deployContract({
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: estimatedGas,
    });
    t2.ok(deployOutDemo, "deployOutToken is truthy OK");

    const { success } = await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });
    t2.equal(success, true, "approve() transactionReceipt.status is true OK");

    const { callOutput } = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTimestamp",
      params: [],
    });
    t2.ok(callOutput, "callOutput() output.callOutput is truthy OK");
    timestamp = callOutput as number;
    timestamp = +timestamp + +10;

    t2.comment("Call to newContract endpoint");
    const parameters = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 1,
      expiration: timestamp,
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
    const res = await api.newContract(parameters);
    t2.ok(res, "newContract called successfully");
    t2.equal(res.status, 200, "response status ok");

    t2.end();
  });

  test(`${testCase} - ${fNew} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 1,
      expiration: timestamp,
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
    try {
      await api.newContract((parameters as any) as NewContractRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("contractAddress"),
        "Rejected because contractAddress is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fNew} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      contractAddress: hashTimeLockAddress,
      inputAmount: 10,
      outputAmount: 1,
      expiration: timestamp,
      hashLock,
      tokenAddress,
      receiver,
      outputNetwork: "BTC",
      outputAddress: "1AcVYm7M3kkJQH28FXAvyBFQzFRL6xPKu8",
      connectorId,
      keychainId,
      web3SigningCredential,
      gas: estimatedGas,
      fake: 6,
    };
    try {
      await api.newContract((parameters as any) as NewContractRequest);
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

  test(`${testCase} - ${fRefund} - ${cOk}`, async (t2: Test) => {
    const responseTxId = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        receiver,
        10,
        hashLock,
        timestamp,
        tokenAddress,
      ],
    });
    t2.ok(responseTxId.callOutput, "result is truthy OK");
    txId = responseTxId.callOutput as string;

    await timeout(6000);

    const parameters = {
      id: txId,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.refund(parameters);
    t2.equal(res.status, 200, "response status ok");

    t2.end();
  });

  test(`${testCase} - ${fRefund} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    try {
      await api.refund((parameters as any) as RefundRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fRefund} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 3,
    };
    try {
      await api.refund((parameters as any) as RefundRequest);
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

  test(`${testCase} - ${fWithdraw} - ${cOk}`, async (t2: Test) => {
    const deployOutToken = await connector.deployContract({
      contractName: TestTokenJSON.contractName,
      contractAbi: TestTokenJSON.abi,
      bytecode: TestTokenJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: ["100", "token", "2", "TKN"],
      gas: estimatedGas,
    });
    t2.ok(
      deployOutToken.transactionReceipt.contractAddress,
      "deployContract() output.transactionReceipt.contractAddress is truthy OK",
    );
    const tokenAddress = deployOutToken.transactionReceipt
      .contractAddress as string;

    await connector.deployContract({
      contractName: DemoHelperJSON.contractName,
      contractAbi: DemoHelperJSON.abi,
      bytecode: DemoHelperJSON.bytecode,
      web3SigningCredential,
      keychainId,
      constructorArgs: [],
      gas: estimatedGas,
    });

    await connector.invokeContract({
      contractName: TestTokenJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Send,
      methodName: "approve",
      params: [hashTimeLockAddress, "10"],
      gas: estimatedGas,
    });

    await api.newContract({
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
    });

    const responseTxId = await connector.invokeContract({
      contractName: DemoHelperJSON.contractName,
      keychainId,
      signingCredential: web3SigningCredential,
      invocationType: EthContractInvocationType.Call,
      methodName: "getTxId",
      params: [
        firstHighNetWorthAccount,
        receiver,
        10,
        hashLock,
        expiration,
        tokenAddress,
      ],
    });
    t2.ok(responseTxId.callOutput, "result is truthy OK");
    const id = responseTxId.callOutput as string;

    const withdrawRequest: WithdrawRequest = {
      id,
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const resWithdraw = await api.withdraw(withdrawRequest);
    t2.equal(resWithdraw.status, 200, "response status is 200 OK");

    t2.end();
  });

  test(`${testCase} - ${fWithdraw} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id,
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.withdraw((parameters as any) as WithdrawRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fWithdraw} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      secret,
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 9,
    };

    try {
      await api.withdraw((parameters as any) as WithdrawRequest);
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

  test(`${testCase} - ${fStatus} - ${cOk}`, async (t2: Test) => {
    const ids = [txId as string];

    const parameters = {
      ids,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.getStatus(parameters);
    t2.equal(res.status, 200, "response status ok");

    t2.end();
  });

  test(`${testCase} - ${fStatus} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // ids,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.getStatus((parameters as any) as GetStatusRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("ids"), "Rejected because ids is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fStatus} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      ids: [""],
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 3,
    };

    try {
      await api.getStatus((parameters as any) as GetStatusRequest);
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

  test(`${testCase} - ${fSingleStatus} - ${cOk}`, async (t2: Test) => {
    const parameters = {
      id: txId,
      web3SigningCredential,
      connectorId,
      keychainId,
    };
    const res = await api.getSingleStatus(parameters);
    t2.equal(res.status, 200, "response status ok");

    t2.end();
  });

  test(`${testCase} - ${fSingleStatus} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // id: callOutput,
      web3SigningCredential,
      connectorId,
      keychainId,
    };

    try {
      await api.getSingleStatus((parameters as any) as GetSingleStatusRequest);
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(fields.includes("id"), "Rejected because id is required");
    }

    t2.end();
  });

  test(`${testCase} - ${fSingleStatus} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
      id: "",
      web3SigningCredential,
      connectorId,
      keychainId,
      fake: 8,
    };

    try {
      await api.getSingleStatus((parameters as any) as GetSingleStatusRequest);
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

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
