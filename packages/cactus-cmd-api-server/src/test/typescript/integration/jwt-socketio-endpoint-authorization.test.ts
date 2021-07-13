import test, { Test } from "tape-promise/tape";
import { v4 as uuidv4 } from "uuid";
import { JWK, JWT } from "jose";
import type { Options as ExpressJwtOptions } from "express-jwt";
import type { AuthorizeOptions as SocketIoJwtOptions } from "@thream/socketio-jwt";

import { Constants } from "@hyperledger/cactus-core-api";
import {
  ApiServer,
  ConfigService,
  HealthCheckResponse,
  isHealthcheckResponse,
} from "../../../main/typescript/public-api";
import { ApiServerApiClient } from "../../../main/typescript/public-api";
import { ApiServerApiClientConfiguration } from "../../../main/typescript/public-api";
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import { AuthorizationProtocol } from "../../../main/typescript/config/authorization-protocol";
import { IAuthorizationConfig } from "../../../main/typescript/authzn/i-authorization-config";

const testCase = "API server enforces authorization for SocketIO endpoints";
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: __filename,
});

test(testCase, async (t: Test) => {
  try {
    const jwtKeyPair = await JWK.generate("RSA", 4096);
    const jwtPublicKey = jwtKeyPair.toPEM(false);
    const expressJwtOptions: ExpressJwtOptions = {
      algorithms: ["RS256"],
      secret: jwtPublicKey,
      audience: uuidv4(),
      issuer: uuidv4(),
    };
    const socketIoJwtOptions: SocketIoJwtOptions = {
      secret: jwtPublicKey,
      algorithms: ["RS256"],
    };
    t.ok(expressJwtOptions, "Express JWT config truthy OK");

    const authorizationConfig: IAuthorizationConfig = {
      unprotectedEndpointExemptions: [],
      expressJwtOptions,
      socketIoJwtOptions,
      socketIoPath: Constants.SocketIoConnectionPathV1,
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
    apiSrvOpts.plugins = [];
    const config = configService.newExampleConfigConvict(apiSrvOpts);

    const apiServer = new ApiServer({
      config: config.getProperties(),
    });
    test.onFinish(async () => await apiServer.shutdown());

    const startResponse = apiServer.start();
    await t.doesNotReject(startResponse, "API server started OK");
    t.ok(startResponse, "API server start response truthy OK");

    const addressInfoApi = (await startResponse).addressInfoApi;
    const protocol = apiSrvOpts.apiTlsEnabled ? "https" : "http";
    const { address, port } = addressInfoApi;
    const apiHost = `${protocol}://${address}:${port}`;

    const jwtPayload = { name: "Peter", location: "Albertirsa" };
    const jwtSignOptions: JWT.SignOptions = {
      algorithm: "RS256",
      issuer: expressJwtOptions.issuer,
      audience: expressJwtOptions.audience,
    };
    const validJwt = JWT.sign(jwtPayload, jwtKeyPair, jwtSignOptions);
    t.ok(validJwt, "JWT signed truthy OK");

    const validBearerToken = `Bearer ${validJwt}`;
    t.ok(validBearerToken, "validBearerToken truthy OK");

    const apiClientBad = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: "Mr. Invalid Token" } },
        logLevel: "TRACE",
      }),
    );

    const apiClientFixable = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: "Mr. Invalid Token" } },
        logLevel: "TRACE",
        tokenProvider: {
          get: () => Promise.resolve(validBearerToken),
        },
      }),
    );

    const apiClientGood = new ApiServerApiClient(
      new ApiServerApiClientConfiguration({
        basePath: apiHost,
        baseOptions: { headers: { Authorization: validBearerToken } },
        logLevel: "TRACE",
        tokenProvider: {
          get: () => Promise.resolve(validBearerToken),
        },
      }),
    );

    {
      const healthchecks = await apiClientBad.watchHealthcheckV1();

      const watchHealthcheckV1WithBadToken = new Promise((resolve, reject) => {
        healthchecks.subscribe({
          next: () => {
            resolve(new Error("Was authorized with an invalid token, bad."));
          },
          error: (ex: Error) => {
            reject(ex);
          },
          complete: () => {
            resolve(new Error("Was authorized with an invalid token, bad."));
          },
        });
      });

      await t.rejects(
        watchHealthcheckV1WithBadToken,
        /Format is Authorization: Bearer \[token\]/,
        "SocketIO connection rejected when JWT is invalid OK",
      );

      const resHc = await apiClientGood.getHealthCheckV1();
      t.ok(resHc, "healthcheck response truthy OK");
      t.equal(resHc.status, 200, "healthcheck response status === 200 OK");
      t.equal(typeof resHc.data, "object", "typeof resHc.data is 'object' OK");
      t.ok(resHc.data.createdAt, "resHc.data.createdAt truthy OK");
      t.ok(resHc.data.memoryUsage, "resHc.data.memoryUsage truthy OK");
      t.ok(resHc.data.memoryUsage.rss, "resHc.data.memoryUsage.rss truthy OK");
      t.ok(resHc.data.success, "resHc.data.success truthy OK");
      t.true(isHealthcheckResponse(resHc.data), "isHealthcheckResponse OK");
    }

    {
      let idx = 0;
      const healthchecks = await apiClientFixable.watchHealthcheckV1();
      const sub = healthchecks.subscribe((next: HealthCheckResponse) => {
        idx++;
        t.ok(next, idx + " next healthcheck truthy OK");
        t.equal(typeof next, "object", idx + "typeof next is 'object' OK");
        t.ok(next.createdAt, idx + " next.createdAt truthy OK");
        t.ok(next.memoryUsage, idx + " next.memoryUsage truthy OK");
        t.ok(next.memoryUsage.rss, idx + " next.memoryUsage.rss truthy OK");
        t.ok(next.success, idx + " next.success truthy OK");
        t.true(isHealthcheckResponse(next), idx + " isHealthcheckResponse OK");
        if (idx > 2) {
          sub.unsubscribe();
        }
      });

      const all = await healthchecks.toPromise();
      t.comment("all=" + JSON.stringify(all));

      const resHc = await apiClientFixable.getHealthCheckV1();
      t.ok(resHc, "healthcheck response truthy OK");
      t.equal(resHc.status, 200, "healthcheck response status === 200 OK");
      t.equal(typeof resHc.data, "object", "typeof resHc.data is 'object' OK");
      t.ok(resHc.data.createdAt, "resHc.data.createdAt truthy OK");
      t.ok(resHc.data.memoryUsage, "resHc.data.memoryUsage truthy OK");
      t.ok(resHc.data.memoryUsage.rss, "resHc.data.memoryUsage.rss truthy OK");
      t.ok(resHc.data.success, "resHc.data.success truthy OK");
      t.true(isHealthcheckResponse(resHc.data), "isHealthcheckResponse OK");
    }
    t.end();
  } catch (ex) {
    log.error(ex);
    t.fail("Exception thrown during test execution, see above for details!");
    throw ex;
  }
});
