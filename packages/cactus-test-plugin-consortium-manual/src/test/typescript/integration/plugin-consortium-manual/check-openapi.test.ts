/* eslint-disable prettier/prettier */
import { createServer } from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape";
import { JWK } from "jose";
import { v4 as uuidV4 } from "uuid";

import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
  DefaultApi,
  Configuration,
} from "@hyperledger/cactus-plugin-consortium-manual";
import {
  CactusNode,
  Consortium,
  ConsortiumDatabase,
  ConsortiumMember,
} from "@hyperledger/cactus-core-api";
import { PluginRegistry, ConsortiumRepository } from "@hyperledger/cactus-core";

const testCase = "cactus-plugin-consortium-manual API";

test(testCase, async (t: Test) => {

  const fGetNodeJwt = "getNodeJws";
  const fGetConsortiumJws = "getConsortiumJws";
  const cOk = "without bad request error";
  const cInvalidParams = "sending invalid parameters";

  let node1Host: string, node2Host: string, node3Host: string;

  test(`${testCase} - Create environment`, async (t2: Test) => {

    const consortiumId = uuidV4();
    const consortiumName = "Example Corp. & Friends Crypto Consortium";

    const memberId1 = uuidV4();
    const memberId2 = uuidV4();
    const memberId3 = uuidV4();

    const httpServer1 = createServer();
    await new Promise((resolve, reject) => {
      httpServer1.once("error", reject);
      httpServer1.once("listening", resolve);
      httpServer1.listen(0, "127.0.0.1");
    });
    const addressInfo1 = httpServer1.address() as AddressInfo;
    node1Host = `http://${addressInfo1.address}:${addressInfo1.port}`;

    const keyPair1 = await JWK.generate("EC", "secp256k1");
    const pubKeyPem1 = keyPair1.toPEM(false);

    const httpServer2 = createServer();
    await new Promise((resolve, reject) => {
      httpServer2.once("error", reject);
      httpServer2.once("listening", resolve);
      httpServer2.listen(0, "127.0.0.1");
    });
    const addressInfo2 = httpServer2.address() as AddressInfo;
    node2Host = `http://${addressInfo2.address}:${addressInfo2.port}`;

    const keyPair2 = await JWK.generate("EC", "secp256k1");
    const pubKeyPem2 = keyPair2.toPEM(false);

    const httpServer3 = createServer();
    await new Promise((resolve, reject) => {
      httpServer3.once("error", reject);
      httpServer3.once("listening", resolve);
      httpServer3.listen(0, "127.0.0.1");
    });
    const addressInfo3 = httpServer3.address() as AddressInfo;
    node3Host = `http://${addressInfo3.address}:${addressInfo3.port}`;

    const keyPair3 = await JWK.generate("EC", "secp256k1");
    const pubKeyPem3 = keyPair3.toPEM(false);

    const node1: CactusNode = {
      consortiumId,
      memberId: memberId1,
      id: "Example_Cactus_Node_1",
      nodeApiHost: node1Host,
      publicKeyPem: pubKeyPem1,
      ledgerIds: [],
      pluginInstanceIds: [],
    };

    const member1: ConsortiumMember = {
      id: memberId1,
      name: "Example Corp 1",
      nodeIds: [node1.id],
    };

    const node2: CactusNode = {
      consortiumId,
      memberId: memberId2,
      id: "Example_Cactus_Node_2",
      nodeApiHost: node2Host,
      publicKeyPem: pubKeyPem2,
      ledgerIds: [],
      pluginInstanceIds: [],
    };

    const member2: ConsortiumMember = {
      id: memberId2,
      name: "Example Corp 2",
      nodeIds: [node2.id],
    };

    const node3: CactusNode = {
      consortiumId,
      memberId: memberId3,
      id: "Example_Cactus_Node_3",
      nodeApiHost: node3Host,
      publicKeyPem: pubKeyPem3,
      ledgerIds: [],
      pluginInstanceIds: [],
    };

    const member3: ConsortiumMember = {
      id: memberId3,
      name: "Example Corp 3",
      nodeIds: [node3.id],
    };

    const consortium: Consortium = {
      id: consortiumId,
      mainApiHost: node1Host,
      name: consortiumName,
      memberIds: [memberId1, memberId2, memberId3],
    };

    const consortiumDatabase: ConsortiumDatabase = {
      cactusNode: [node1, node2, node3],
      consortium: [consortium],
      consortiumMember: [member1, member2, member3],
      ledger: [],
      pluginInstance: [],
    };

    const consortiumRepo = new ConsortiumRepository({ db: consortiumDatabase });
    t2.comment(`Setting up first node...`);
    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });
      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPair1.toPEM(true),
        consortiumDatabase,
        logLevel: "trace",
        consortiumRepo,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);
      const configService = new ConfigService();
      const apiServerOptions = configService.newExampleConfig();
      apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo1.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      const config = configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);

      const apiServer = new ApiServer({
        httpServerApi: httpServer1,
        config: config.getProperties(),
        pluginRegistry,
      });
      test.onFinish(() => apiServer.shutdown());
      await apiServer.start();
    }
    t2.comment(`Set up first node OK`);

    t2.comment(`Setting up second node...`);
    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });

      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPair2.toPEM(true),
        consortiumDatabase,
        logLevel: "trace",
        consortiumRepo,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);
      const configService = new ConfigService();
      const apiServerOptions = configService.newExampleConfig();
      apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo2.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      const config = configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);

      const apiServer = new ApiServer({
        httpServerApi: httpServer2,
        config: config.getProperties(),
        pluginRegistry,
      });
      test.onFinish(() => apiServer.shutdown());
      await apiServer.start();
    }
    t2.comment(`Set up second node OK`);

    t2.comment(`Setting up third node...`);
    {
      const pluginRegistry = new PluginRegistry({ plugins: [] });
      const options: IPluginConsortiumManualOptions = {
        instanceId: uuidV4(),
        pluginRegistry,
        keyPairPem: keyPair3.toPEM(true),
        consortiumDatabase,
        logLevel: "trace",
        consortiumRepo,
      };
      const pluginConsortiumManual = new PluginConsortiumManual(options);

      const configService = new ConfigService();
      const apiServerOptions = configService.newExampleConfig();
      apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
      apiServerOptions.configFile = "";
      apiServerOptions.apiCorsDomainCsv = "*";
      apiServerOptions.apiPort = addressInfo3.port;
      apiServerOptions.cockpitPort = 0;
      apiServerOptions.apiTlsEnabled = false;
      const config = configService.newExampleConfigConvict(apiServerOptions);

      pluginRegistry.add(pluginConsortiumManual);

      const apiServer = new ApiServer({
        httpServerApi: httpServer3,
        config: config.getProperties(),
        pluginRegistry,
      });
      test.onFinish(() => apiServer.shutdown());
      await apiServer.start();
    }
    t2.comment(`Set up third node OK`);

    t2.end();
  });

  test(`${testCase} - ${fGetNodeJwt} - ${cOk}`, async (t2: Test) => {

    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    const res = await api.getNodeJws();
    t2.equal(res.status, 200, "Node JWS response status code is 200");
    t2.ok(res.data, "Node JWS data OK");

    t2.end();
  });

  test(`${testCase} - ${fGetConsortiumJws} - ${cOk}`, async (t2: Test) => {

    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    const res = await api.getConsortiumJws();
    t2.equal(res.status, 200, "Consortium JWS response status code is 200");
    t2.ok(res.data, "Consortium JWS data OK");

    t2.end();
  });

  test(`${testCase} - ${fGetNodeJwt} - ${cInvalidParams}`, async (t2: Test) => {

    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    try {
      await api.getNodeJws({fake:9});
    } catch(e) {
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

  test(`${testCase} - ${fGetConsortiumJws} - ${cInvalidParams}`, async (t2: Test) => {

    const configuration = new Configuration({ basePath: node1Host });
    const api = new DefaultApi(configuration);
    try {
      await api.getConsortiumJws({fake:9});
    } catch(e) {
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