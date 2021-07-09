import path from "path";
import { spawn } from "child_process";
import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import * as publicApi from "../../../main/typescript/public-api";

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
  test.onFinish(async () => await pruneDockerAllIfGithubAction({ logLevel }));

  const projectRoot = path.join(__dirname, "../../../../../../");

  const child = spawn("npm", ["run", "start:example-supply-chain"], {
    cwd: projectRoot,
  });

  const logs = [];
  for await (const data of child.stdout) {
    console.log(`[child]: ${data}`);
    logs.push(data);
  }

  for await (const data of child.stderr) {
    console.error(`[child]: ${data}`);
    logs.push(data);
  }

  const childProcessPromise = new Promise<void>((resolve, reject) => {
    child.once("exit", (code: number, signal: NodeJS.Signals) => {
      if (code === 0) {
        resolve();
      } else {
        const msg = `Child process crashed. exitCode=${code}, signal=${signal}`;
        reject(new Error(msg));
      }
      t.comment(`EVENT:exit signal=${signal}`);
      t.comment(`EVENT:exit exitCode=${code}`);
    });
    child.on("close", (code: number, signal: NodeJS.Signals) => {
      t.comment(`EVENT:close signal=${signal}`);
      t.comment(`EVENT:close exitCode=${code}`);
    });
    child.on("disconnect", (code: number, signal: NodeJS.Signals) => {
      t.comment(`EVENT:disconnect signal=${signal}`);
      t.comment(`EVENT:disconnect exitCode=${code}`);
    });
    child.on("error", (ex: Error) => {
      t.comment(`EVENT:error ${ex.stack}`);
    });
  });

  await t.doesNotReject(childProcessPromise, "childProcessPromise resolves OK");

  t.end();
});
