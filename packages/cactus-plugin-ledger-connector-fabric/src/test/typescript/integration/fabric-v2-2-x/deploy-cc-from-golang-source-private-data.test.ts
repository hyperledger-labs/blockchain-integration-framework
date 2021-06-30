import { AddressInfo } from "net";
import http from "http";
import fs from "fs-extra";
import path from "path";

import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";

import express from "express";
import bodyParser from "body-parser";

import {
  Containers,
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import {
  Checks,
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  ChainCodeProgrammingLanguage,
  Configuration,
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
} from "../../../../main/typescript/public-api";

import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";

const testCase = "deploys Fabric 2.x contract from go source";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const channelId = "mychannel";
  const channelName = channelId;

  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    imageName: "ghcr.io/hyperledger/cactus-fabric2-all-in-one",
    imageVersion: "2021-04-20-nodejs",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    logLevel,
  });
  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  await ledger.start();

  const connectionProfile = await ledger.getConnectionProfileOrg1();

  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user1Org1";
  const keychainEntryValue = JSON.stringify(userIdentity);

  const keychainPlugin = new PluginKeychainMemory({
    instanceId: keychainInstanceId,
    keychainId,
    logLevel,
    backend: new Map([
      [keychainEntryKey, keychainEntryValue],
      ["some-other-entry-key", "some-other-entry-value"],
    ]),
  });

  const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

  const discoveryOptions: DiscoveryOptions = {
    enabled: true,
    asLocalhost: true,
  };

  // This is the directory structure of the Fabirc 2.x CLI container (fabric-tools image)
  // const orgCfgDir = "/fabric-samples/test-network/organizations/";
  const orgCfgDir =
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";

  // these below mirror how the fabric-samples sets up the configuration
  const org1Env = {
    CORE_LOGGING_LEVEL: "debug",
    FABRIC_LOGGING_SPEC: "debug",
    CORE_PEER_LOCALMSPID: "Org1MSP",

    ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

    FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
    CORE_PEER_TLS_ENABLED: "true",
    CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
    CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
    CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
    ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
  };

  // these below mirror how the fabric-samples sets up the configuration
  const org2Env = {
    CORE_LOGGING_LEVEL: "debug",
    FABRIC_LOGGING_SPEC: "debug",
    CORE_PEER_LOCALMSPID: "Org2MSP",

    FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
    CORE_PEER_TLS_ENABLED: "true",
    ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

    CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
    CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp`,
    CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`,
    ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    dockerBinary: "/usr/local/bin/docker",
    peerBinary: "/fabric-samples/bin/peer",
    goBinary: "/usr/local/go/bin/go",
    pluginRegistry,
    cliContainerEnv: org1Env,
    sshConfig,
    logLevel,
    connectionProfile,
    discoveryOptions,
    eventHandlerOptions: {
      strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
      commitTimeout: 300,
    },
  };
  const connector = new PluginLedgerConnectorFabric(pluginOptions);

  const expressApp = express();
  expressApp.use(bodyParser.json({ limit: "250mb" }));
  const server = http.createServer(expressApp);
  const listenOptions: IListenOptions = {
    hostname: "localhost",
    port: 0,
    server,
  };
  const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
  const { port } = addressInfo;
  test.onFinish(async () => await Servers.shutdown(server));

  await connector.getOrCreateWebServices();
  await connector.registerWebServices(expressApp);

  const apiUrl = `http://localhost:${port}`;

  const configuration = new Configuration({ basePath: apiUrl });
  const apiClient = new FabricApi(configuration);

  const contractName = "asset-transfer-private-data";

  const contractRelPath =
    "../../fixtures/go/asset-transfer-private-data/chaincode-go";
  const contractDir = path.join(__dirname, contractRelPath);

  const smartContractGoPath = path.join(
    contractDir,
    "./chaincode/",
    "./asset_transfer.go",
  );
  const smartContractGoBuf = await fs.readFile(smartContractGoPath);
  const smartContractGo = {
    body: smartContractGoBuf.toString("base64"),
    filepath: "./chaincode/",
    filename: `asset_transfer.go`,
  };

  const assetTransferGoPath = path.join(contractDir, "./main.go");
  const assetTransferGoBuf = await fs.readFile(assetTransferGoPath);
  const assetTransferGo = {
    body: assetTransferGoBuf.toString("base64"),
    filename: `${contractName}.go`,
  };

  const goModPath = path.join(contractDir, "./go.mod");
  const goModBuf = await fs.readFile(goModPath);
  const goMod = {
    body: goModBuf.toString("base64"),
    filename: "go.mod",
  };

  const goSumPath = path.join(contractDir, "./go.sum");
  const goSumBuf = await fs.readFile(goSumPath);
  const goSum = {
    body: goSumBuf.toString("base64"),
    filename: "go.sum",
  };

  const privateDataCollectionName = "collections_config.json";
  const privateDataCollectionsPath = path.join(
    contractDir,
    "./" + privateDataCollectionName,
  );
  const privateDataCollectionsBuf = await fs.readFile(
    privateDataCollectionsPath,
  );
  const privateDataCollections = {
    body: privateDataCollectionsBuf.toString("base64"),
    filename: privateDataCollectionName,
  };

  const res = await apiClient.deployContractV1({
    channelId,
    ccVersion: "1.0.0",
    sourceFiles: [
      assetTransferGo,
      smartContractGo,
      goMod,
      goSum,
      privateDataCollections,
    ],
    collectionsConfigFile: privateDataCollectionName,
    ccName: contractName,
    targetOrganizations: [org1Env, org2Env],
    caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
    ccLabel: "basic-asset-transfer-2",
    ccLang: ChainCodeProgrammingLanguage.Golang,
    ccSequence: 1,
    orderer: "orderer.example.com:7050",
    ordererTLSHostnameOverride: "orderer.example.com",
    connTimeout: 60,
  });

  const { packageIds, lifecycle, success } = res.data;
  t.equal(res.status, 200, "res.status === 200 OK");
  t.true(success, "res.data.success === true");

  const {
    approveForMyOrgList,
    installList,
    queryInstalledList,
    commit,
    packaging,
    queryCommitted,
  } = lifecycle;

  Checks.truthy(packageIds, `packageIds truthy OK`);
  Checks.truthy(
    Array.isArray(packageIds),
    `Array.isArray(packageIds) truthy OK`,
  );
  Checks.truthy(approveForMyOrgList, `approveForMyOrgList truthy OK`);
  Checks.truthy(
    Array.isArray(approveForMyOrgList),
    `Array.isArray(approveForMyOrgList) truthy OK`,
  );
  Checks.truthy(installList, `installList truthy OK`);
  Checks.truthy(
    Array.isArray(installList),
    `Array.isArray(installList) truthy OK`,
  );
  Checks.truthy(queryInstalledList, `queryInstalledList truthy OK`);
  Checks.truthy(
    Array.isArray(queryInstalledList),
    `Array.isArray(queryInstalledList) truthy OK`,
  );
  Checks.truthy(commit, `commit truthy OK`);
  // Checks.truthy(init, `init truthy OK`);
  Checks.truthy(packaging, `packaging truthy OK`);
  Checks.truthy(queryCommitted, `queryCommitted truthy OK`);

  // FIXME - without this wait it randomly fails with an error claiming that
  // the endorsement was impossible to be obtained. The fabric-samples script
  // does the same thing, it just waits 10 seconds for good measure so there
  // might not be a way for us to avoid doing this, but if there is a way we
  // absolutely should not have timeouts like this, anywhere...
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const assetId = uuidv4();
  const assetType = "asset";

  const assetData = {
    objectType: assetType,
    assetID: assetId,
    color: "gray",
    size: 3,
    appraisedValue: 500,
  };

  //Chaincode-specific method requires attribute asset_properties
  const rawTmpData = {
    asset_properties: assetData,
  };

  // CreateAsset(id string, color string, size int, owner string, appraisedValue int)
  const createRes = await apiClient.runTransactionV1({
    transientData: rawTmpData,
    contractName,
    channelName,
    //objectType, assetID, color, size, appraisedvalue
    params: [],
    methodName: "CreateAsset",
    invocationType: FabricContractInvocationType.Sendprivate,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });
  t.ok(createRes, "setRes truthy OK");
  t.true(createRes.status > 199, "createRes status > 199 OK");
  t.true(createRes.status < 300, "createRes status < 300 OK");
  t.comment(`BassicAssetTransfer.Create(): ${JSON.stringify(createRes.data)}`);

  const getRes = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [assetId],
    methodName: "ReadAsset",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });

  t.ok(getRes, "getRes truthy OK");
  t.ok(getRes.data, "getRes.data truthy OK");
  t.ok(getRes.data.functionOutput, "getRes.data.functionOutput truthy OK");
  t.true(getRes.status > 199 && createRes.status < 300, "getRes status 2xx OK");
  t.comment(`ReadAsset ResponseBody: ${JSON.stringify(getRes.data)}`);

  //TODO FIX:
  //Error: failed to read asset details: GET_STATE failed: transaction ID: 0a41ae425e259ee6c1331d4d3c06bd9fc4727f9961abc0c1a2895c450fc8411a: tx creator does not have read access permission on privatedata in chaincodeName:asset-transfer-private-data collectionName: Org2MSPPrivateCollection
  //This has probably to do with the state database supported by Fabric test ledger
  /*
  const collectionToParse = "Org1MSPPrivateCollection";
  const getResPrivate = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [collectionToParse, assetId],
    methodName: "ReadAssetPrivateDetails",
    invocationType: FabricContractInvocationType.SEND,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });


  */

  const getResQuery = await apiClient.runTransactionV1({
    contractName,
    channelName,
    params: [assetId, assetId + "1"],
    methodName: "GetAssetByRange",
    invocationType: FabricContractInvocationType.Call,
    signingCredential: {
      keychainId,
      keychainRef: keychainEntryKey,
    },
  });

  t.ok(getResQuery, "getResQuery truthy OK");
  t.ok(getResQuery.data, "getResQuery.data truthy OK");
  t.ok(
    getResQuery.data.functionOutput,
    "getResQuery.data.functionOutput truthy OK",
  );
  t.true(
    getResQuery.status > 199 && getResQuery.status < 300,
    "getResQuery status 2xx OK",
  );
  t.comment(
    `GetAssetByRange ResponseBody: ${JSON.stringify(getResQuery.data)}`,
  );

  t.end();
});
