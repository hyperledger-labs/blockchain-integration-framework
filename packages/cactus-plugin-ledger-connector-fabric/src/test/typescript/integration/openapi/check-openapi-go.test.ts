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
  PluginLedgerConnectorFabric,
  DeployContractGoSourceV1Request,
} from "../../../../main/typescript/public-api";

import { HELLO_WORLD_CONTRACT_GO_SOURCE } from "../../fixtures/go/hello-world-contract-fabric-v14/hello-world-contract-go-source";

import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";

import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";

import { DiscoveryOptions } from "fabric-network";
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { Configuration } from "@hyperledger/cactus-core-api";

const testCase = "check openapi validation in fabric endpoints";
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
    imageName: "ghcr.io/hyperledger/cactus-fabric-all-in-one",
    imageVersion: "2021-04-21-2016750",
  });

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  await ledger.start();
  const connectionProfile = await ledger.getConnectionProfileOrg1();
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

  const fDeployGo = "deployContractGoSourceV1";
  const cOk = "without bad request error";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  test(`${testCase} - ${fDeployGo} - ${cOk}`, async (t2: Test) => {
    const parameters = {
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
    };

    const res = await apiClient.deployContractGoSourceV1(parameters);

    t2.equal(res.status, 200, "deployContractGoSourceV1 res.status === 200 OK");
    t2.true(
      res.data.success,
      "deployContractGoSourceV1 res.data.success === true",
    );

    t2.end();
  });

  test(`${testCase} - ${fDeployGo} - ${cWithoutParams}`, async (t2: Test) => {
    const parameters = {
      // targetPeerAddresses: ["peer0.org1.example.com:7051"],
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
    };

    try {
      await apiClient.deployContractGoSourceV1(
        (parameters as any) as DeployContractGoSourceV1Request,
      );
    } catch (e) {
      t2.equal(e.response.status, 400, "Bad request");
      const fields = e.response.data.map((param: any) =>
        param.path.replace(".body.", ""),
      );
      t2.ok(
        fields.includes("targetPeerAddresses"),
        "Rejected because targetPeerAddresses is required",
      );
    }

    t2.end();
  });

  test(`${testCase} - ${fDeployGo} - ${cInvalidParams}`, async (t2: Test) => {
    const parameters = {
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
      fake: 8,
    };

    try {
      await apiClient.deployContractGoSourceV1(
        (parameters as any) as DeployContractGoSourceV1Request,
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

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});
