// /* eslint-disable prettier/prettier */
// import { AddressInfo } from "net";
// import { createServer } from "http";
// import fs from "fs-extra";
// import path from "path";

// import test, { Test } from "tape-promise/tape";
// import { v4 as uuidv4 } from "uuid";

// import {
//   Containers,
//   FabricTestLedgerV1,
// } from "@hyperledger/cactus-test-tooling";

// import { LogLevelDesc } from "@hyperledger/cactus-common";
// import { PluginRegistry } from "@hyperledger/cactus-core";

// import {
//   // ChainCodeProgrammingLanguage,
//   DefaultEventHandlerStrategy,
//   DeployContractGoSourceV1Request,
//   // DeployContractV1Request,
//   // FabricContractInvocationType,
//   FileBase64,
//   PluginLedgerConnectorFabric,
//   // RunTransactionRequest,
// } from "../../../../main/typescript/public-api";

// import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

// import { DiscoveryOptions } from "fabric-network";
// import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
// import { Configuration } from "@hyperledger/cactus-core-api";

// import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

// import {
//   ApiServer,
//   AuthorizationProtocol,
//   ConfigService,
// } from "@hyperledger/cactus-cmd-api-server";

// const testCase = "Fabric API";
// // const logLevel: LogLevelDesc = "TRACE";
// const logLevel: LogLevelDesc = "SILENT";

// test(testCase, async (t: Test) => {
//   test.onFailure(async () => {
//     await Containers.logDiagnostics({ logLevel });
//   });

//   // const channelId = "mychannel";
//   // const channelName = channelId;

//   // create the fabric test ledger
//   const fabricTestLedger = new FabricTestLedgerV1({
//     emitContainerLogs: true,
//     publishAllPorts: true,
//     // imageName: "faio2x",
//     // imageVersion: "latest",
//     imageName: "hyperledger/cactus-fabric2-all-in-one",
//     imageVersion: "2021-04-20-nodejs",
//     envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
//   });
//   test.onFinish(async () => {
//     await fabricTestLedger.stop();
//     await fabricTestLedger.destroy();
//   });
//   await fabricTestLedger.start();

//   // A connection profile describes a set of components, including peers, orderers and certificate authorities in a Hyperledger Fabric blockchain network.
//   // It also contains channel and organization information relating to these components
//   const connectionProfile = await fabricTestLedger.getConnectionProfileOrg1();
//   // t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

//   // create an admin user
//   const enrollAdminOut = await fabricTestLedger.enrollAdmin();
//   const adminWallet = enrollAdminOut[1];
//   // add user (with name user2) to admin wallet
//   const [userIdentity] = await fabricTestLedger.enrollUser(adminWallet);
//   // return connection data to the fabric container
//   const sshConfig = await fabricTestLedger.getSshConfig();

//   // create the keychain connector for recently created account
//   const keychainInstanceId = uuidv4();
//   const keychainId = uuidv4();
//   const keychainEntryKey = "user2";
//   const keychainEntryValue = JSON.stringify(userIdentity);
//   const keychainPlugin = new PluginKeychainMemory({
//     instanceId: keychainInstanceId,
//     keychainId,
//     logLevel,
//     backend: new Map([
//       [keychainEntryKey, keychainEntryValue],
//       //["some-other-entry-key", "some-other-entry-value"],
//     ]),
//   });

//   // create a connector registry with the recently created keychain connector
//   const pluginRegistry = new PluginRegistry({ plugins: [keychainPlugin] });

//   const discoveryOptions: DiscoveryOptions = {
//     enabled: true,
//     asLocalhost: true,
//   };

//   // This is the directory structure of the Fabirc 2.x CLI container (fabric-tools image)
//   // const orgCfgDir = "/fabric-samples/test-network/organizations/";
//   const orgCfgDir =
//     "/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/";

//   // these below mirror how the fabric-samples sets up the configuration
//   const org1Env = {
//     CORE_LOGGING_LEVEL: "debug",
//     FABRIC_LOGGING_SPEC: "debug",
//     CORE_PEER_LOCALMSPID: "Org1MSP",

//     ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

//     FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
//     CORE_PEER_TLS_ENABLED: "true",
//     CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
//     CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
//     CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
//     ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
//   };

//   // these below mirror how the fabric-samples sets up the configuration
//   const org2Env = {
//     CORE_LOGGING_LEVEL: "debug",
//     FABRIC_LOGGING_SPEC: "debug",
//     CORE_PEER_LOCALMSPID: "Org2MSP",

//     FABRIC_CFG_PATH: "/etc/hyperledger/fabric",
//     CORE_PEER_TLS_ENABLED: "true",
//     ORDERER_CA: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,

//     CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
//     CORE_PEER_MSPCONFIGPATH: `${orgCfgDir}peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp`,
//     CORE_PEER_TLS_ROOTCERT_FILE: `${orgCfgDir}peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`,
//     ORDERER_TLS_ROOTCERT_FILE: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
//   };

//   // create the connector
//   const connector = new PluginLedgerConnectorFabric({
//     instanceId: uuidv4(),
//     dockerBinary: "/usr/local/bin/docker",
//     peerBinary: "/fabric-samples/bin/peer",
//     goBinary: "/usr/local/go/bin/go",
//     pluginRegistry,
//     cliContainerEnv: org1Env,
//     sshConfig,
//     logLevel,
//     connectionProfile,
//     discoveryOptions,
//     eventHandlerOptions: {
//       strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
//       commitTimeout: 300,
//     },
//   });

//   // register the connector
//   pluginRegistry.add(connector);

//   // create an http server
//   const httpServer = createServer();
//   await new Promise((resolve, reject) => {
//     httpServer.once("error", reject);
//     httpServer.once("listening", resolve);
//     httpServer.listen(0, "127.0.0.1");
//   });
//   const addressInfo = httpServer.address() as AddressInfo;
//   const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;

//   // create configuration for api server
//   const configService = new ConfigService();
//   const apiServerOptions = configService.newExampleConfig();
//   apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
//   apiServerOptions.configFile = "";
//   apiServerOptions.apiCorsDomainCsv = "*";
//   apiServerOptions.apiPort = addressInfo.port;
//   apiServerOptions.cockpitPort = 0;
//   apiServerOptions.apiTlsEnabled = false;
//   const config = configService.newExampleConfigConvict(apiServerOptions);

//   // create an api server on the http server
//   const apiServer = new ApiServer({
//     httpServerApi: httpServer,
//     config: config.getProperties(),
//     pluginRegistry,
//   });

//   // start api server and shutdown when test finish
//   test.onFinish(() => apiServer.shutdown());
//   await apiServer.start();

//   // create the api client and attach it to http server
//   const apiConfig = new Configuration({ basePath: apiHost });
//   const apiClient = new FabricApi(apiConfig);

//   // const contractName = "basic-asset-transfer-2";

//   const contractRelPath =
//     "../../fixtures/go/basic-asset-transfer/chaincode-typescript";
//   const contractDir = path.join(__dirname, contractRelPath);

//   // ├── package.json
//   // ├── src
//   // │   ├── assetTransfer.ts
//   // │   ├── asset.ts
//   // │   └── index.ts
//   // ├── tsconfig.json
//   // └── tslint.json
//   const sourceFiles: FileBase64[] = [];
//   {
//     const filename = "./tslint.json";
//     const relativePath = "./";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }
//   {
//     const filename = "./tsconfig.json";
//     const relativePath = "./";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }
//   {
//     const filename = "./package.json";
//     const relativePath = "./";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }
//   {
//     const filename = "./index.ts";
//     const relativePath = "./src/";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }
//   {
//     const filename = "./asset.ts";
//     const relativePath = "./src/";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }
//   {
//     const filename = "./assetTransfer.ts";
//     const relativePath = "./src/";
//     const filePath = path.join(contractDir, relativePath, filename);
//     const buffer = await fs.readFile(filePath);
//     sourceFiles.push({
//       body: buffer.toString("base64"),
//       filepath: relativePath,
//       filename,
//     });
//   }

//   // const fDeploy = "deployContractV1";
//   const fDeployGo = "deployContractGoSourceV1";
//   // const fRun = "runTransactionV1";

//   const cOk = "without bad request error";
//   // const cWithoutParams = "not sending all required parameters";
//   // const cInvalidParams = "sending parameters that are not valid";

//   // test(`${testCase} - ${fDeploy} - ${cOk}`, async (t2: Test) => {

//   //   const parameters = {
//   //     channelId,
//   //     ccVersion: "1.0.0",
//   //     sourceFiles,
//   //     ccName: contractName,
//   //     targetOrganizations: [org1Env, org2Env],
//   //     caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
//   //     ccLabel: "basic-asset-transfer-2",
//   //     ccLang: ChainCodeProgrammingLanguage.Typescript,
//   //     ccSequence: 1,
//   //     orderer: "orderer.example.com:7050",
//   //     ordererTLSHostnameOverride: "orderer.example.com",
//   //     connTimeout: 60,
//   //   };
//   //   const res = await apiClient.deployContractV1(parameters as DeployContractV1Request);

//   //   t2.ok(res, "Contract deployed successfully");
//   //   t2.ok(res.data);
//   //   t2.equal(
//   //     res.status,
//   //     200,
//   //     `Endpoint ${fDeploy} in test case '${cOk}': status === 200`,
//   //   );

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fDeploy} - ${cWithoutParams}`, async (t2: Test) => {

//   //   try {
//   //     const parameters = {
//   //       channelId,
//   //       ccVersion: "1.0.0",
//   //       sourceFiles,
//   //       ccName: contractName,
//   //       targetOrganizations: [org1Env, org2Env],
//   //       // caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
//   //       ccLabel: "basic-asset-transfer-2",
//   //       ccLang: ChainCodeProgrammingLanguage.Typescript,
//   //       ccSequence: 1,
//   //       orderer: "orderer.example.com:7050",
//   //       ordererTLSHostnameOverride: "orderer.example.com",
//   //       // connTimeout: 60,
//   //     };
//   //     await apiClient.deployContractV1(parameters as any as DeployContractV1Request);
//   //   } catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("caFile"),
//   //       "Rejected because caFile is required",
//   //     );
//   //     t2.notOk(fields.includes("connTimeout"), "connTimeout is not required");
//   //   }

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fDeploy} - ${cInvalidParams}`, async (t2: Test) => {

//   //   try {
//   //     const parameters = {
//   //       channelId,
//   //       ccVersion: "1.0.0",
//   //       sourceFiles,
//   //       ccName: contractName,
//   //       targetOrganizations: [org1Env, org2Env],
//   //       caFile: `${orgCfgDir}ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem`,
//   //       ccLabel: "basic-asset-transfer-2",
//   //       ccLang: ChainCodeProgrammingLanguage.Typescript,
//   //       ccSequence: 1,
//   //       orderer: "orderer.example.com:7050",
//   //       ordererTLSHostnameOverride: "orderer.example.com",
//   //       connTimeout: 60,
//   //       fake: 9,
//   //     };
//   //     await apiClient.deployContractV1(parameters as any as DeployContractV1Request);
//   //   } catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("fake"),
//   //       "Rejected because fake is not a valid parameter",
//   //     );
//   //   }

//   //   t2.end();
//   // });

//   test(`${testCase} - ${fDeployGo} - ${cOk}`, async (t2: Test) => {

//     const parameters = {
//       targetPeerAddresses: ["peer0.org1.example.com:7051"],
//       tlsRootCertFiles:
//         "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
//       policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
//       channelId: "mychannel",
//       chainCodeVersion: "1.0.0",
//       constructorArgs: { Args: ["john", "99"] },
//       goSource: {
//         body: Buffer.from(HELLO_WORLD_CONTRACT_GO_SOURCE).toString("base64"),
//         filename: "hello-world.go",
//       },
//       moduleName: "hello-world",
//       targetOrganizations: [org1Env, org2Env],
//       pinnedDeps: [
//         "github.com/hyperledger/fabric@v1.4.8",
//         "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
//       ],
//     };
//     const res = await apiClient.deployContractGoSourceV1(parameters as DeployContractGoSourceV1Request);

//     t2.ok(res, "Contract from go deployed successfully");
//     t2.ok(res.data);
//     t2.equal(
//       res.status,
//       200,
//       `Endpoint ${fDeployGo} in test case '${cOk}': status === 200`,
//     );

//     t2.end();
//   });

//   // test(`${testCase} - ${fDeployGo} - ${cWithoutParams}`, async (t2: Test) => {
//   //   try {
//   //     const parameters = {
//   //       // targetPeerAddresses: ["peer0.org1.example.com:7051"],
//   //       tlsRootCertFiles:
//   //         "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
//   //       policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
//   //       channelId: "mychannel",
//   //       chainCodeVersion: "1.0.0",
//   //       constructorArgs: { Args: ["john", "99"] },
//   //       goSource: {
//   //         body: Buffer.from(HELLO_WORLD_CONTRACT_GO_SOURCE).toString("base64"),
//   //         filename: "hello-world.go",
//   //       },
//   //       // moduleName: "hello-world",
//   //       targetOrganizations: [org1Env, org2Env],
//   //       pinnedDeps: [
//   //         "github.com/hyperledger/fabric@v1.4.8",
//   //         "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
//   //       ],
//   //     };
//   //     await apiClient.deployContractGoSourceV1(parameters as any as DeployContractGoSourceV1Request);
//   //   }catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("targetPeerAddresses"),
//   //       "Rejected because targetPeerAddresses is required",
//   //     );
//   //     t2.notOk(fields.includes("moduleName"), "moduleName is not required");
//   //   }

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fDeployGo} - ${cInvalidParams}`, async (t2: Test) => {
//   //   try {
//   //     const parameters = {
//   //       targetPeerAddresses: ["peer0.org1.example.com:7051"],
//   //       tlsRootCertFiles:
//   //         "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
//   //       policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
//   //       channelId: "mychannel",
//   //       chainCodeVersion: "1.0.0",
//   //       constructorArgs: { Args: ["john", "99"] },
//   //       goSource: {
//   //         body: Buffer.from(HELLO_WORLD_CONTRACT_GO_SOURCE).toString("base64"),
//   //         filename: "hello-world.go",
//   //       },
//   //       moduleName: "hello-world",
//   //       targetOrganizations: [org1Env, org2Env],
//   //       pinnedDeps: [
//   //         "github.com/hyperledger/fabric@v1.4.8",
//   //         "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
//   //       ],
//   //       fake: 7,
//   //     };
//   //     await apiClient.deployContractGoSourceV1(parameters as DeployContractGoSourceV1Request);
//   //   }catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("fake"),
//   //       "Rejected because fake is not a valid parameter",
//   //     );
//   //   }

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fRun} - ${cOk}`, async (t2: Test) => {
//   //   const assetId = uuidv4();
//   //   const assetOwner = uuidv4();

//   //   const parameters = {
//   //     contractName,
//   //     channelName,
//   //     params: [assetId, "Green", "19", assetOwner, "9999"],
//   //     methodName: "CreateAsset",
//   //     invocationType: FabricContractInvocationType.Send,
//   //     signingCredential: {
//   //       keychainId,
//   //       keychainRef: keychainEntryKey,
//   //     },
//   //   };
//   //   const res = await apiClient.runTransactionV1(parameters as RunTransactionRequest);

//   //   t2.ok(res, "Transaction executed successfully");
//   //   t2.ok(res.data);
//   //   t2.equal(
//   //     res.status,
//   //     200,
//   //     `Endpoint ${fRun} in test case '${cOk}': status === 200`,
//   //   );

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fRun} - ${cWithoutParams}`, async (t2: Test) => {
//   //   const assetId = uuidv4();
//   //   const assetOwner = uuidv4();
//   //   try {
//   //     const parameters = {
//   //       // contractName,
//   //       channelName,
//   //       params: [assetId, "Green", "19", assetOwner, "9999"],
//   //       methodName: "CreateAsset",
//   //       invocationType: FabricContractInvocationType.Send,
//   //       signingCredential: {
//   //         keychainId,
//   //         keychainRef: keychainEntryKey,
//   //       },
//   //     };
//   //     await apiClient.runTransactionV1(parameters as RunTransactionRequest);
//   //   } catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("contractName"),
//   //       "Rejected because contractName is required",
//   //     );
//   //   }

//   //   t2.end();
//   // });

//   // test(`${testCase} - ${fRun} - ${cInvalidParams}`, async (t2: Test) => {
//   //   const assetId = uuidv4();
//   //   const assetOwner = uuidv4();
//   //   try {
//   //     const parameters = {
//   //       contractName,
//   //       channelName,
//   //       params: [assetId, "Green", "19", assetOwner, "9999"],
//   //       methodName: "CreateAsset",
//   //       invocationType: FabricContractInvocationType.Send,
//   //       signingCredential: {
//   //         keychainId,
//   //         keychainRef: keychainEntryKey,
//   //       },
//   //       fake: 3,
//   //     };
//   //     await apiClient.runTransactionV1(parameters as RunTransactionRequest);
//   //   } catch(e) {
//   //     t2.equal(e.response.status, 400, "Bad request");
//   //     const fields = e.response.data.map((param: any) =>
//   //       param.path.replace(".body.", ""),
//   //     );
//   //     t2.ok(
//   //       fields.includes("fake"),
//   //       "Rejected because fake is not a valid parameter",
//   //     );
//   //   }

//   //   t2.end();
//   // });

//   t.end();
// });
