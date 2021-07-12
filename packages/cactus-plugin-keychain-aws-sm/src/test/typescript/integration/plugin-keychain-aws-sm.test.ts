import test, { Test } from "tape-promise/tape";
import { v4 as internalIpV4 } from "internal-ip";

import {
  Containers,
  LocalStackContainer,
  K_DEFAULT_LOCALSTACK_HTTP_PORT,
} from "@hyperledger/cactus-test-tooling";

import { v4 as uuidv4 } from "uuid";

import { LogLevelDesc } from "@hyperledger/cactus-common";

import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
  AwsCredentialType,
} from "../../../main/typescript/public-api";

import fs from "fs";
import path from "path";
import os from "os";

const logLevel: LogLevelDesc = "TRACE";

test("get,set,has,delete alters state as expected", async (t: Test) => {
  const localStackContainer = new LocalStackContainer({
    logLevel: logLevel,
  });
  await localStackContainer.start();

  const ci = await Containers.getById(localStackContainer.containerId);
  const localstackIpAddr = await internalIpV4();
  const hostPort = await Containers.getPublicPort(
    K_DEFAULT_LOCALSTACK_HTTP_PORT,
    ci,
  );
  const localstackHost = `http://${localstackIpAddr}:${hostPort}`;

  test.onFinish(async () => {
    await localStackContainer.stop();
    await localStackContainer.destroy();
  });

  // Using awsCredentialType: AwsCredentialType.FromAwsCredentialFile
  {
    // Create aws credential file in a local directory
    let tmpDirPath = "tmpDirPath";
    tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cactus-"));
    await fs.promises.writeFile(
      `${tmpDirPath}/credentials`,
      "[default]\naws_secret_access_key = test\naws_access_key_id = test",
      "utf-8",
    );

    const options1: IPluginKeychainAwsSmOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      awsEndpoint: localstackHost,
      awsRegion: "us-east-1",
      awsProfile: "default",
      awsCredentialType: AwsCredentialType.LocalFile,
      awsCredentialFilePath: `${tmpDirPath}/credentials`,
      logLevel: logLevel,
    };
    const plugin1 = new PluginKeychainAwsSm(options1);

    t.equal(plugin1.getKeychainId(), options1.keychainId, "Keychain ID set OK");
    t.equal(plugin1.getInstanceId(), options1.instanceId, "Instance ID set OK");

    const key1 = uuidv4();
    const value1 = uuidv4();

    const hasPrior1 = await plugin1.has(key1);

    t.false(hasPrior1, "hasPrior1 === false OK");

    await plugin1.set(key1, value1);

    const hasAfter1 = await plugin1.has(key1);
    t.true(hasAfter1, "hasAfter1 === true OK");

    const valueAfter1 = await plugin1.get(key1);
    t.ok(valueAfter1, "valueAfter1 truthy OK");
    t.equal(valueAfter1, value1, "valueAfter1 === value OK");

    await plugin1.delete(key1);

    const hasAfterDelete1 = await plugin1.has(key1);
    t.false(hasAfterDelete1, "hasAfterDelete1 === false OK");

    const valueAfterDelete1 = await plugin1.get(key1);
    t.notok(valueAfterDelete1, "valueAfterDelete1 falsy OK");

    await (async () => {
      await fs.promises.unlink(`${tmpDirPath}/credentials`);
      await fs.promises.rmdir(`${tmpDirPath}`);
    })();
  }

  // Using awsCredentialType: AwsCredentialType.FromCodeVariable
  // Test for AWS access credentials cannot be performed over Localstack, as the opensourced version of it
  // doesn't support AWS IAM authentication.
  {
    const options2: IPluginKeychainAwsSmOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      awsEndpoint: localstackHost,
      awsRegion: "us-east-1",
      awsProfile: "default",
      awsCredentialType: AwsCredentialType.InMemory,
      awsAccessKeyId: "fake",
      awsSecretAccessKey: "fake",
      logLevel: logLevel,
    };
    const plugin2 = new PluginKeychainAwsSm(options2);

    t.equal(plugin2.getKeychainId(), options2.keychainId, "Keychain ID set OK");
    t.equal(plugin2.getInstanceId(), options2.instanceId, "Instance ID set OK");

    const key2 = uuidv4();
    const value2 = uuidv4();

    const hasPrior2 = await plugin2.has(key2);

    t.false(hasPrior2, "hasPrior2 === false OK");

    await plugin2.set(key2, value2);

    const hasAfter2 = await plugin2.has(key2);
    t.true(hasAfter2, "hasAfter2 === true OK");

    const valueAfter2 = await plugin2.get(key2);
    t.ok(valueAfter2, "valueAfter2 truthy OK");
    t.equal(valueAfter2, value2, "valueAfter2 === value OK");

    await plugin2.delete(key2);

    const hasAfterDelete2 = await plugin2.has(key2);
    t.false(hasAfterDelete2, "hasAfterDelete2 === false OK");

    const valueAfterDelete2 = await plugin2.get(key2);
    t.notok(valueAfterDelete2, "valueAfterDelete2 falsy OK");
  }

  t.end();
});
