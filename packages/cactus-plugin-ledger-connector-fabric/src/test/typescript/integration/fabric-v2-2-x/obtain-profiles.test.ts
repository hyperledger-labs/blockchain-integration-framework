import test, { Test } from "tape-promise/tape";

import {
  FabricTestLedgerV1,
  pruneDockerAllIfGithubAction,
} from "@hyperledger/cactus-test-tooling";

import { LogLevelDesc } from "@hyperledger/cactus-common";

const testCase = "obtains configuration profiles from Fabrix 2.x ledger";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didnt throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const ledger = new FabricTestLedgerV1({
    emitContainerLogs: true,
    publishAllPorts: true,
    // imageName: "faio2x",
    // imageVersion: "latest",
    imageName: "hyperledger/cactus-fabric2-all-in-one",
    imageVersion: "2021-04-20-nodejs",
    envVars: new Map([["FABRIC_VERSION", "2.2.0"]]),
  });
  await ledger.start();

  const tearDown = async () => {
    await ledger.stop();
    await ledger.destroy();
  };

  test.onFinish(tearDown);

  const connectionProfile = await ledger.getConnectionProfileOrg1();

  t.ok(connectionProfile, "getConnectionProfileOrg1() out truthy OK");

  const connectionProfileOrg1 = await ledger.getConnectionProfileOrgX("1");
  t.isEquivalent(connectionProfile, connectionProfileOrg1);

  const connectionProfileOrg2 = await ledger.getConnectionProfileOrgX("2");
  t.ok(connectionProfileOrg2, "getConnectionProfileOrg2() out truthy OK");

  t.notDeepEqual(
    connectionProfileOrg1,
    connectionProfileOrg2,
    "connection profiles are different",
  );

  //Should return error, as there is no Org3 in the default deployment of Fabric AIO image
  const error = "/Error.*/";
  await t.rejects(
    async () => await ledger.getConnectionProfileOrgX("3"),
    error,
  );

  t.end();
});

test("AFTER " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didnt throw OK");
  t.end();
});
