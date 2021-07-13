import test, { Test } from "tape-promise/tape";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { LogLevelDesc } from "@hyperledger/cactus-common";
import path from "path";
import { STATE_DATABASE } from "@hyperledger/cactus-test-tooling";
import { LedgerStartOptions } from "../../../../../../cactus-test-tooling/dist/types/main/typescript/fabric/fabric-test-ledger-v1";

const testCase = "adds org4 to the network";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
const addOrgXPath = path.join(__dirname, "../../../resources/fixtures/addOrgX");

const extraOrg = {
  path: addOrgXPath,
  orgName: "org4",
  orgChannel: "mychannel",
  certificateAuthority: false,
  stateDatabase: STATE_DATABASE.COUCH_DB,
  port: "11071",
};

test(testCase, async (t: Test) => {
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    logLevel: "debug",
    // imageName: "faio2x",sshConfig
    // imageVersion: "latest",
    imageName: "hyperledger/cactus-fabric2-all-in-one",
    imageVersion: "2021-04-20-nodejs",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
    extraOrgs: [extraOrg],
  });

  const startOps: LedgerStartOptions = {
    omitPull: false,
    setContainer: false,
  };

  // Recover running ledger
  /*const startOpsContainerRunning: LedgerStartOptions = {
    omitPull: true,
    setContainer: true,
    containerID:
      "723c265262d7f5ff71b67862d4b8b3b4c09b31da528ea7ba01cda03c13fdcd5d",
  };

  const results = await ledger.start(startOpsContainerRunning);
  */

  await ledger.start(startOps);
  const connectionProfile = await ledger.getConnectionProfileOrg1();

  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("org1");
  t.isEquivalent(connectionProfile, connectionProfileOrg1);

  const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("org2");
  t.ok(connectionProfileOrg2, "getConnectionProfileOrg2() out truthy OK");

  // Do not use org3, as its files are used as templates
  const connectionProfileOrg4 = await ledger.getConnectionProfileOrgX("org4");
  t.ok(connectionProfileOrg4, "getConnectionProfileOrg4() out truthy OK");

  t.ok(
    connectionProfileOrg1 !== connectionProfileOrg2,
    "connection profile from org1 is different from the one from org2 OK",
  );

  //Should return error, as there is no org101 in the default deployment of Fabric AIO image nor it was added
  const error = "/Error.*/";

  await t.rejects(
    async () => await ledger.getConnectionProfileOrgX("org101"),
    error,
  );

  //Let us add org 3 and retrieve the connection profile

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});
