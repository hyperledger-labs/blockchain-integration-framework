import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { JWK, JWT } from "jose";
import expressJwt from "express-jwt";

import {
  ApiServer,
  ConfigService,
  isHealthcheckResponse,
} from "../../../main/typescript/public-api";
import { DefaultApi as ApiServerApi } from "../../../main/typescript/public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  Configuration,
  ConsortiumDatabase,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { IAuthorizationConfig } from "../../../main/typescript/authzn/i-authorization-config";

const testCase = "API server enforces authorization rules when configured";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

test(testCase, async (t: Test) => {
  try {
    const keyPair = await JWK.generate("EC", "secp256k1", { use: "sig" }, true);
    const keyPairPem = keyPair.toPEM(true);
    const db: ConsortiumDatabase = {
      cactusNode: [],
      consortium: [],
      consortiumMember: [],
      ledger: [],
      pluginInstance: [],
    };

    const jwtKeyPair = await JWK.generate("RSA", 4096);
    const jwtPublicKey = jwtKeyPair.toPEM(false);
    const expressJwtOptions: expressJwt.Options = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    t.ok(expressJwtOptions, "Express JWT config truthy OK");

    const jwtPayload = { name: "Peter", location: "London" };
    const jwtSignOptions: JWT.SignOptions = {
      algorithm: "RS256",
      issuer: expressJwtOptions.issuer,
      audience: expressJwtOptions.audience,
    };
    const tokenGood = JWT.sign(jwtPayload, jwtKeyPair, jwtSignOptions);
    // const tokenBad = JWT.sign(jwtPayload, jwtKeyPair);

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions: {
        secret: jwtPublicKey,
      },
    };

    const configService = new ConfigService();
    const apiSrvOpts = configService.newExampleConfig();
    apiSrvOpts.authorizationProtocol = AuthorizationProtocol.JSON_WEB_TOKEN;
    apiSrvOpts.authorizationConfigJson = authorizationConfig;
    apiSrvOpts.configFile = "";
    apiSrvOpts.apiCorsDomainCsv = "*";
    apiSrvOpts.apiPort = 0;
    apiSrvOpts.cockpitPort = 0;
    apiSrvOpts.apiTlsEnabled = false;
    apiSrvOpts.plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        options: {
          instanceId: uuidv4(),
          keychainId: uuidv4(),
          logLevel,
        },
      },
      {
        packageName: "@hyperledger/cactus-plugin-consortium-manual",
        type: PluginImportType.Local,
        options: {
          instanceId: uuidv4(),
          keyPairPem: keyPairPem,
          consortiumDatabase: db,
        },
      },
    ];
    const config = configService.newExampleConfigConvict(apiSrvOpts);

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });
    test.onFinish(async () => await apiServer.shutdown());

    const startResponse = apiServer.start();
    await t.doesNotReject(
      startResponse,
      "failed to start API server with dynamic plugin imports configured for it...",
    );
    t.ok(startResponse, "startResponse truthy OK");

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    const baseOptions = { headers: { Authorization: `Bearer ${tokenGood}` } };
    const conf = new Configuration({ basePath: apiHost, baseOptions });
    const apiClient = new ApiServerApi(conf);
    const resHc = await apiClient.getHealthCheckV1();
    t.ok(resHc, "healthcheck response truthy OK");
    t.equal(resHc.status, 200, "healthcheck response status === 200 OK");
    t.equal(typeof resHc.data, "object", "typeof resHc.data is 'object' OK");
    t.ok(resHc.data.createdAt, "resHc.data.createdAt truthy OK");
    t.ok(resHc.data.memoryUsage, "resHc.data.memoryUsage truthy OK");
    t.ok(resHc.data.memoryUsage.rss, "resHc.data.memoryUsage.rss truthy OK");
    t.ok(resHc.data.success, "resHc.data.success truthy OK");
    t.true(isHealthcheckResponse(resHc.data), "isHealthcheckResponse OK");
    t.end();
  } catch (ex) {
    log.error(ex);
    t.fail("Exception thrown during test execution, see above for details!");
    throw ex;
  }
});
