import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import bodyParser from "body-parser";
import express from "express";
import { AddressInfo } from "net";

import { Containers, CordaTestLedger } from "@hyperledger/cactus-test-tooling";
import {
  LogLevelDesc,
  IListenOptions,
  Servers,
} from "@hyperledger/cactus-common";
import {
  SampleCordappEnum,
  CordaConnectorContainer,
} from "@hyperledger/cactus-test-tooling";

import {
  CordappDeploymentConfig,
  DefaultApi as CordaApi,
  DeployContractJarsV1Request,
  FlowInvocationType,
  InvokeContractV1Request,
  JvmTypeKind,
} from "../../../main/typescript/generated/openapi/typescript-axios/index";
import { Configuration } from "@hyperledger/cactus-core-api";

import {
  IPluginLedgerConnectorCordaOptions,
  PluginLedgerConnectorCorda,
} from "../../../main/typescript/plugin-ledger-connector-corda";
import { K_CACTUS_CORDA_TOTAL_TX_COUNT } from "../../../main/typescript/prometheus-exporter/metrics";

const logLevel: LogLevelDesc = "TRACE";

test("Tests are passing on the JVM side", async (t: Test) => {
  test.onFailure(async () => {
    await Containers.logDiagnostics({ logLevel });
  });

  const ledger = new CordaTestLedger({
    imageName: "ghcr.io/hyperledger/cactus-corda-4-6-all-in-one-obligation",
    imageVersion: "2021-03-19-feat-686",
    // imageName: "caio",
    // imageVersion: "latest",
    logLevel,
  });
  t.ok(ledger, "CordaTestLedger instantaited OK");

  test.onFinish(async () => {
    await ledger.stop();
    await ledger.destroy();
  });
  const ledgerContainer = await ledger.start();
  t.ok(ledgerContainer, "CordaTestLedger container truthy post-start() OK");

  const corDappsDirPartyA = await ledger.getCorDappsDirPartyA();
  const corDappsDirPartyB = await ledger.getCorDappsDirPartyB();
  t.comment(`corDappsDirPartyA=${corDappsDirPartyA}`);
  t.comment(`corDappsDirPartyB=${corDappsDirPartyB}`);

  await ledger.logDebugPorts();
  const partyARpcPort = await ledger.getRpcAPublicPort();
  const partyBRpcPort = await ledger.getRpcBPublicPort();

  const jarFiles = await ledger.pullCordappJars(
    SampleCordappEnum.BASIC_CORDAPP,
  );
  t.comment(`Fetched ${jarFiles.length} cordapp jars OK`);

  const internalIpOrUndefined = await internalIpV4();
  t.ok(internalIpOrUndefined, "Determined LAN IPv4 address successfully OK");
  const internalIp = internalIpOrUndefined as string;
  t.comment(`Internal IP (based on default gateway): ${internalIp}`);

  // TODO: parse the gradle build files to extract the credentials?
  const partyARpcUsername = "user1";
  const partyARpcPassword = "password";
  const partyBRpcUsername = partyARpcUsername;
  const partyBRpcPassword = partyARpcPassword;
  const springAppConfig = {
    logging: {
      level: {
        root: "INFO",
        "net.corda": "INFO",
        "org.hyperledger.cactus": "DEBUG",
      },
    },
    cactus: {
      corda: {
        node: { host: internalIp },
        rpc: {
          port: partyARpcPort,
          username: partyARpcUsername,
          password: partyARpcPassword,
        },
      },
    },
  };
  const springApplicationJson = JSON.stringify(springAppConfig);
  const envVarSpringAppJson = `SPRING_APPLICATION_JSON=${springApplicationJson}`;
  t.comment(envVarSpringAppJson);

  const connector = new CordaConnectorContainer({
    logLevel,
    imageName: "ghcr.io/hyperledger/cactus-connector-corda-server",
    imageVersion: "2021-03-25-feat-622",
    // imageName: "cccs",
    // imageVersion: "latest",
    envVars: [envVarSpringAppJson],
  });
  t.ok(CordaConnectorContainer, "CordaConnectorContainer instantiated OK");

  test.onFinish(async () => {
    try {
      await connector.stop();
    } finally {
      await connector.destroy();
    }
  });

  const connectorContainer = await connector.start();
  t.ok(connectorContainer, "CordaConnectorContainer started OK");

  await connector.logDebugPorts();
  const apiUrl = await connector.getApiLocalhostUrl();

  const config = new Configuration({ basePath: apiUrl });
  const apiClient = new CordaApi(config);

  const flowsRes1 = await apiClient.listFlowsV1();
  t.ok(flowsRes1.status === 200, "flowsRes1.status === 200 OK");
  t.ok(flowsRes1.data, "flowsRes1.data truthy OK");
  t.ok(flowsRes1.data.flowNames, "flowsRes1.data.flowNames truthy OK");
  t.comment(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes1.data)}`);
  const flowNamesPreDeploy = flowsRes1.data.flowNames;

  const sshConfig = await ledger.getSshConfig();
  const hostKeyEntry = "not-used-right-now-so-this-does-not-matter... ;-(";

  const cdcA: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyA,
    cordaNodeStartCmd: "supervisorctl start corda-a",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyARpcPort,
      username: partyARpcUsername,
      password: partyARpcPassword,
    },
    sshCredentials: {
      hostKeyEntry,
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cdcB: CordappDeploymentConfig = {
    cordappDir: corDappsDirPartyB,
    cordaNodeStartCmd: "supervisorctl start corda-b",
    cordaJarPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/corda.jar",
    nodeBaseDirPath:
      "/samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/",
    rpcCredentials: {
      hostname: internalIp,
      port: partyBRpcPort,
      username: partyBRpcUsername,
      password: partyBRpcPassword,
    },
    sshCredentials: {
      hostKeyEntry,
      hostname: internalIp,
      password: "root",
      port: sshConfig.port as number,
      username: sshConfig.username as string,
    },
  };

  const cordappDeploymentConfigs: CordappDeploymentConfig[] = [cdcA, cdcB];
  const depReq: DeployContractJarsV1Request = {
    jarFiles,
    cordappDeploymentConfigs,
  };
  const depRes = await apiClient.deployContractJarsV1(depReq);
  t.ok(depRes, "Jar deployment response truthy OK");
  t.equal(depRes.status, 200, "Jar deployment status code === 200 OK");
  t.ok(depRes.data, "Jar deployment response body truthy OK");
  t.ok(depRes.data.deployedJarFiles, "Jar deployment body deployedJarFiles OK");
  t.equal(
    depRes.data.deployedJarFiles.length,
    jarFiles.length,
    "Deployed jar file count equals count in request OK",
  );

  const flowsRes2 = await apiClient.listFlowsV1();
  t.ok(flowsRes2.status === 200, "flowsRes2.status === 200 OK");
  t.comment(`apiClient.listFlowsV1() => ${JSON.stringify(flowsRes2.data)}`);
  t.ok(flowsRes2.data, "flowsRes2.data truthy OK");
  t.ok(flowsRes2.data.flowNames, "flowsRes2.data.flowNames truthy OK");
  const flowNamesPostDeploy = flowsRes2.data.flowNames;
  t.notDeepLooseEqual(
    flowNamesPostDeploy,
    flowNamesPreDeploy,
    "New flows detected post Cordapp Jar deployment OK",
  );

  // let's see if this makes a difference and if yes, then we know that the issue
  // is a race condition for sure
  // await new Promise((r) => setTimeout(r, 120000));
  t.comment("Fetching network map for Corda network...");
  const networkMapRes = await apiClient.networkMapV1();
  t.ok(networkMapRes, "networkMapRes truthy OK");
  t.ok(networkMapRes.status, "networkMapRes.status truthy OK");
  t.ok(networkMapRes.data, "networkMapRes.data truthy OK");
  t.true(Array.isArray(networkMapRes.data), "networkMapRes.data isArray OK");
  t.true(networkMapRes.data.length > 0, "networkMapRes.data not empty OK");

  // const partyA = networkMapRes.data.find((it) =>
  //   it.legalIdentities.some((it2) => it2.name.organisation === "ParticipantA"),
  // );
  // const partyAPublicKey = partyA?.legalIdentities[0].owningKey;

  const partyB = networkMapRes.data.find((it) =>
    it.legalIdentities.some((it2) => it2.name.organisation === "ParticipantB"),
  );
  const partyBPublicKey = partyB?.legalIdentities[0].owningKey;

  const req: InvokeContractV1Request = ({
    timeoutMs: 60000,
    flowFullClassName: "net.corda.samples.example.flows.ExampleFlow$Initiator",
    flowInvocationType: FlowInvocationType.FlowDynamic,
    params: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.Integer",
        },
        primitiveValue: 42,
      },
      {
        jvmTypeKind: JvmTypeKind.Reference,
        jvmType: {
          fqClassName: "net.corda.core.identity.Party",
        },
        jvmCtorArgs: [
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName: "net.corda.core.identity.CordaX500Name",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "ParticipantB",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "New York",
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: "US",
              },
            ],
          },
          {
            jvmTypeKind: JvmTypeKind.Reference,
            jvmType: {
              fqClassName:
                "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl",
            },
            jvmCtorArgs: [
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: partyBPublicKey?.algorithm,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: partyBPublicKey?.format,
              },
              {
                jvmTypeKind: JvmTypeKind.Primitive,
                jvmType: {
                  fqClassName: "java.lang.String",
                },
                primitiveValue: partyBPublicKey?.encoded,
              },
            ],
          },
        ],
      },
    ],
  } as unknown) as InvokeContractV1Request;

  const res = await apiClient.invokeContractV1(req);
  t.ok(res, "InvokeContractV1Request truthy OK");
  t.equal(res.status, 200, "InvokeContractV1Request status code === 200 OK");

  const pluginOptions: IPluginLedgerConnectorCordaOptions = {
    instanceId: uuidv4(),
    corDappsDir: corDappsDirPartyA,
    sshConfigAdminShell: sshConfig,
  };

  const plugin = new PluginLedgerConnectorCorda(pluginOptions);

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
  t.comment(
    `Metrics URL: ${apiHost}/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-corda/get-prometheus-exporter-metrics`,
  );

  const apiConfig = new Configuration({ basePath: apiHost });
  const apiClient1 = new CordaApi(apiConfig);

  await plugin.getOrCreateWebServices();
  await plugin.registerWebServices(expressApp);

  {
    plugin.transact();
    const promRes = await apiClient1.getPrometheusExporterMetricsV1();
    const promMetricsOutput =
      "# HELP " +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      '"} 1';
    t.ok(promRes);
    t.ok(promRes.data);
    t.equal(promRes.status, 200);
    t.true(
      promRes.data.includes(promMetricsOutput),
      "Total Transaction Count of 1 recorded as expected. RESULT OK",
    );

    // Executing transaction to increment the Total transaction count metrics
    plugin.transact();

    const promRes1 = await apiClient1.getPrometheusExporterMetricsV1();
    const promMetricsOutput1 =
      "# HELP " +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      " Total transactions executed\n" +
      "# TYPE " +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      " gauge\n" +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      '{type="' +
      K_CACTUS_CORDA_TOTAL_TX_COUNT +
      '"} 2';
    t.ok(promRes1);
    t.ok(promRes1.data);
    t.equal(promRes1.status, 200);
    t.true(
      promRes1.data.includes(promMetricsOutput1),
      "Total Transaction Count of 2 recorded as expected. RESULT OK",
    );
  }

  t.end();
});
