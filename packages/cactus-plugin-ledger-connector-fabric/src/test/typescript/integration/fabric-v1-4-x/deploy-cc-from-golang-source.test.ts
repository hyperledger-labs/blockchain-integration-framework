import { AddressInfo } from "net";
import http from "http";

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
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";

import {
  DefaultEventHandlerStrategy,
  FabricContractInvocationType,
  PluginLedgerConnectorFabric,
  SSHExecCommandResponse,
} from "../../../../main/typescript/public-api";

import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

import {
  DefaultApi as FabricApi,
  FabricSigningCredential,
} from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "deploys contract from go source";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    logLevel,
    publishAllPorts: true,
    // imageName: "faio14x",
    // imageVersion: "latest",
    imageName: "ghcr.io/hyperledger/cactus-fabric-all-in-one",
    imageVersion: "2021-04-21-2016750",
  });

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);

  await ledger.start();
  t.doesNotThrow(() => ledger.getContainer(), "Container is set OK");
  const ledgerContainer = ledger.getContainer();
  t.ok(ledgerContainer, "ledgerContainer truthy OK");
  t.ok(ledgerContainer.id, "ledgerContainer.id truthy OK");

  const connectionProfile = await ledger.getConnectionProfileOrg1();
  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const enrollAdminOut = await ledger.enrollAdmin();
  const adminWallet = enrollAdminOut[1];
  const [userIdentity] = await ledger.enrollUser(adminWallet);
  const sshConfig = await ledger.getSshConfig();

  const keychainInstanceId = uuidv4();
  const keychainId = uuidv4();
  const keychainEntryKey = "user2";
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

  // these below mirror how the fabric-samples sets up the configuration
  const org1Env = {
    CORE_PEER_LOCALMSPID: "Org1MSP",
    CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  // these below mirror how the fabric-samples sets up the configuration
  const org2Env = {
    CORE_PEER_LOCALMSPID: "Org2MSP",
    CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  const pluginOptions: IPluginLedgerConnectorFabricOptions = {
    instanceId: uuidv4(),
    dockerBinary: "/usr/local/bin/docker",
    pluginRegistry,
    peerBinary: "/fabric-samples/bin/peer",
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
  const plugin = new PluginLedgerConnectorFabric(pluginOptions);

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

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);
  const apiUrl = `http://localhost:${port}`;

  const config = new Configuration({ basePath: apiUrl });
  const apiClient = new FabricApi(config);
  const res = await apiClient.deployContractGoSourceV1({
    targetPeerAddresses: ["peer0.org1.example.com:7051"],
    tlsRootCertFiles:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
    channelId: "mychannel",
    chainCodeVersion: "1.0.0",
    constructorArgs: { Args: ["john", "99"] },
    goSource: {
      body: Buffer.from(HELLO_WORLD_CONTRACT_GO_SOURCE).toString("base64"),
      filename: "hello-world.go",
    },
    moduleName: "hello-world",
    targetOrganizations: [org1Env, org2Env],
    pinnedDeps: [
      "github.com/Knetic/govaluate@v3.0.0+incompatible",
      "github.com/Shopify/sarama@v1.27.0",
      "github.com/fsouza/go-dockerclient@v1.6.5",
      "github.com/grpc-ecosystem/go-grpc-middleware@v1.2.1",
      "github.com/hashicorp/go-version@v1.2.1",
      "github.com/hyperledger/fabric@v1.4.8",
      "github.com/hyperledger/fabric-amcl@v0.0.0-20200424173818-327c9e2cf77a",
      "github.com/miekg/pkcs11@v1.0.3",
      "github.com/mitchellh/mapstructure@v1.3.3",
      "github.com/onsi/ginkgo@v1.14.1",
      "github.com/onsi/gomega@v1.10.2",
      "github.com/op/go-logging@v0.0.0-20160315200505-970db520ece7",
      "github.com/pkg/errors@v0.9.1",
      "github.com/spf13/viper@v1.7.1",
      "github.com/stretchr/testify@v1.6.1",
      "github.com/sykesm/zap-logfmt@v0.0.3",
      "go.uber.org/zap@v1.16.0",
      "golang.org/x/crypto@v0.0.0-20200820211705-5c72a883971a",
      "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
      "google.golang.org/grpc@v1.31.1",
    ],
  });

  const {
    installationCommandResponses: installations,
    instantiationCommandResponse: instantiation,
    success,
  } = res.data;

  installations.forEach((icr: SSHExecCommandResponse, idx: number) => {
    t.comment(`CC installation ${idx} out: ${icr.stdout}`);
    t.comment(`CC installation ${idx} err: ${icr.stderr}`);
  });

  t.comment(`CC instantiation out: ${instantiation.stdout}`);
  t.comment(`CC instantiation err: ${instantiation.stderr}`);

  t.equal(res.status, 200, "deployContractGoSourceV1 res.status === 200 OK");
  t.true(success, "deployContractGoSourceV1 res.data.success === true");

  // FIXME - without this wait it randomly fails with an error claiming that
  // the endorsement was impossible to be obtained. The fabric-samples script
  // does the same thing, it just waits 10 seconds for good measure so there
  // might not be a way for us to avoid doing this, but if there is a way we
  // absolutely should not have timeouts like this, anywhere...
  await new Promise((resolve) => setTimeout(resolve, 20000));

  const testKey = uuidv4();
  const testValue = uuidv4();
  const signingCredential: FabricSigningCredential = {
    keychainId,
    keychainRef: keychainEntryKey,
  };

  const setRes = await apiClient.runTransactionV1({
    contractName: "hello-world",
    channelName: "mychannel",
    params: [testKey, testValue],
    methodName: "set",
    invocationType: FabricContractInvocationType.Send,
    signingCredential,
  });
  t.ok(setRes, "setRes truthy OK");
  t.true(setRes.status > 199 && setRes.status < 300, "setRes status 2xx OK");
  t.comment(`HelloWorld.set() ResponseBody: ${JSON.stringify(setRes.data)}`);

  const getRes = await apiClient.runTransactionV1({
    contractName: "hello-world",
    channelName: "mychannel",
    params: [testKey],
    methodName: "get",
    invocationType: FabricContractInvocationType.Call,
    signingCredential,
  });
  t.ok(getRes, "getRes truthy OK");
  t.true(getRes.status > 199 && setRes.status < 300, "getRes status 2xx OK");
  t.comment(`HelloWorld.get() ResponseBody: ${JSON.stringify(getRes.data)}`);
  t.equal(getRes.data.functionOutput, testValue, "get returns UUID OK");
  t.end();
});
