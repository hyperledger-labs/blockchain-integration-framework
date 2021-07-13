import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import { AuthorizationProtocol } from "@hyperledger/cactus-cmd-api-server";
import { IAuthorizationConfig } from "@hyperledger/cactus-cmd-api-server";
import { ConfigService } from "@hyperledger/cactus-cmd-api-server";

import * as publicApi from "../../../main/typescript/public-api";
import { ISupplyChainAppOptions } from "../../../main/typescript/public-api";
import { SupplyChainApp } from "../../../main/typescript/public-api";

const testCase =
  "can launch via CLI with generated API server .config.json file";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

test("Supply chain backend API calls can be executed", async (t: Test) => {
  t.ok(publicApi, "Public API of the package imported OK");

  const configService = new ConfigService();
  t.ok(configService, "Instantiated ConfigService truthy OK");

  const exampleConfig = configService.newExampleConfig();
  t.ok(exampleConfig, "configService.newExampleConfig() truthy OK");

  // FIXME - this hack should not be necessary, we need to re-think how we
  // do configuration parsing. The convict library may not be the path forward.
  exampleConfig.authorizationConfigJson = (JSON.stringify(
    exampleConfig.authorizationConfigJson,
  ) as unknown) as IAuthorizationConfig;
  exampleConfig.authorizationProtocol = AuthorizationProtocol.NONE;

  const convictConfig = configService.newExampleConfigConvict(exampleConfig);
  t.ok(convictConfig, "configService.newExampleConfigConvict() truthy OK");

  const env = configService.newExampleConfigEnv(convictConfig.getProperties());

  const config = configService.getOrCreate({ env });
  const apiSrvOpts = config.getProperties();
  const { logLevel } = apiSrvOpts;

  const appOptions: ISupplyChainAppOptions = {
    logLevel,
    disableSignalHandlers: true,
  };
  const app = new SupplyChainApp(appOptions);
  test.onFinish(async () => {
    await app.stop();
    await pruneDockerAllIfGithubAction({ logLevel });
  });

  // Node A => Besu
  // Node B => Quorum
  // Node C => Fabric 1.4.x
  const startResult = await app.start();
  const { apiServerA, apiServerB, apiServerC } = startResult;
  t.ok(apiServerA, "ApiServerA truthy OK");
  t.ok(apiServerB, "ApiServerB truthy OK");
  t.ok(apiServerC, "ApiServerC truthy OK");

  const httpSrvApiA = apiServerA.getHttpServerApi();
  t.ok(httpSrvApiA, "httpSrvApiA truthy OK");
  const httpSrvApiB = apiServerB.getHttpServerApi();
  t.ok(httpSrvApiB, "httpSrvApiB truthy OK");
  const httpSrvApiC = apiServerC.getHttpServerApi();
  t.ok(httpSrvApiC, "httpSrvApiC truthy OK");

  t.true(httpSrvApiA.listening, "httpSrvApiA.listening true OK");
  t.true(httpSrvApiB.listening, "httpSrvApiB.listening true OK");
  t.true(httpSrvApiC.listening, "httpSrvApiC.listening true OK");

  const { besuApiClient, fabricApiClient, quorumApiClient } = startResult;

  const metricsResB = await besuApiClient.getPrometheusMetricsV1();
  t.ok(metricsResB, "besu metrics res truthy OK");
  t.true(metricsResB.status > 199, "metricsResB.status > 199 true OK");
  t.true(metricsResB.status < 300, "metricsResB.status < 300 true OK");

  const metricsResF = await fabricApiClient.getPrometheusMetricsV1();
  t.ok(metricsResF, "fabric metrics res truthy OK");
  t.true(metricsResF.status > 199, "metricsResF.status > 199 true OK");
  t.true(metricsResF.status < 300, "metricsResF.status < 300 true OK");

  const metricsResQ = await quorumApiClient.getPrometheusMetricsV1();
  t.ok(metricsResQ, "quorum metrics res truthy OK");
  t.true(metricsResQ.status > 199, "metricsResQ.status > 199 true OK");
  t.true(metricsResQ.status < 300, "metricsResQ.status < 300 true OK");

  const {
    supplyChainApiClientA,
    supplyChainApiClientB,
    supplyChainApiClientC,
  } = startResult;

  const listBambooHarvestRes = await supplyChainApiClientA.listBambooHarvestV1();
  t.ok(listBambooHarvestRes, "listBambooHarvestRes truthy OK");
  t.true(
    listBambooHarvestRes.status > 199,
    "listBambooHarvestRes status > 199 truthy OK",
  );
  t.true(
    listBambooHarvestRes.status < 300,
    "listBambooHarvestRes status < 300 truthy OK",
  );

  const listBookshelfRes = await supplyChainApiClientB.listBookshelfV1();
  t.ok(listBookshelfRes, "listBookshelfRes truthy OK");
  t.true(
    listBookshelfRes.status > 199,
    "listBookshelfRes status > 199 truthy OK",
  );
  t.true(
    listBookshelfRes.status < 300,
    "listBookshelfRes status < 300 truthy OK",
  );

  const listShipmentRes = await supplyChainApiClientC.listShipmentV1();
  t.ok(listShipmentRes, "listShipmentRes truthy OK");
  t.true(
    listShipmentRes.status > 199,
    "listShipmentRes status > 199 truthy OK",
  );
  t.true(
    listShipmentRes.status < 300,
    "listShipmentRes status < 300 truthy OK",
  );

  t.end();
});
