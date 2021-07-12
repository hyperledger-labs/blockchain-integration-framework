import path from "path";
import test, { Test } from "tape-promise/tape";
import temp from "temp";
import esm from "esm";
import fs from "fs-extra";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import {
  Containers,
  RustcBuildCmd,
  RustcContainer,
} from "../../../../main/typescript/public-api";

const logLevel: LogLevelDesc = "TRACE";

type HelloWorldExports = {
  hello_world: () => string;
  say_hello: (name: string) => string;
};

test("compiles Rust code to bundler targeted .wasm", async (t: Test) => {
  const tmpDirAffix = "cactus-test-tooling-rustc-container-test";
  temp.track();
  test.onFinish(async () => await temp.cleanup());
  const hostSourceDir = await temp.mkdir(tmpDirAffix);

  const srcDir = path.join(hostSourceDir, "./src/");
  await fs.mkdir(srcDir);

  const rustcContainer = new RustcContainer({ logLevel });
  t.ok(rustcContainer, "RustcContainer instance truthy OK");

  test.onFinish(async () => {
    await rustcContainer.stop();
  });

  const dockerodeContainer = await rustcContainer.start();
  t.ok(dockerodeContainer, "dockerodeContainer truthy OK");

  const containerPkDir = path.join(rustcContainer.cwd, "./pkg/");

  const cargoTomlHostDir = path.join(
    __dirname,
    "../../../rust/fixtures/wasm-hello-world/",
  );
  const putCargoTomlRes = await Containers.putFile({
    containerOrId: dockerodeContainer,
    dstFileDir: rustcContainer.cwd,
    dstFileName: "Cargo.toml",
    srcFileDir: cargoTomlHostDir,
    srcFileName: "Cargo.toml",
  });
  t.ok(putCargoTomlRes, "putCargoTomlRes truthy OK");
  t.ok(putCargoTomlRes.statusCode, "putCargoTomlRes.statusCode truthy OK");
  t.equal(putCargoTomlRes.statusCode, 200, "putCargoTomlRes.statusCode 200 OK");

  const containerSrcDir = path.join(rustcContainer.cwd, "./src/");
  await Containers.exec(dockerodeContainer, ["mkdir", containerSrcDir]);

  const libRsHostDir = path.join(
    __dirname,
    "../../../rust/fixtures/wasm-hello-world/src/",
  );
  const putLibRsRes = await Containers.putFile({
    containerOrId: dockerodeContainer,
    dstFileDir: containerSrcDir,
    dstFileName: "lib.rs",
    srcFileDir: libRsHostDir,
    srcFileName: "lib.rs",
  });
  t.ok(putLibRsRes, "putLibRsRes truthy OK");
  t.ok(putLibRsRes.statusCode, "putLibRsRes.statusCode truthy OK");
  t.equal(putLibRsRes.statusCode, 200, "putLibRsRes.statusCode 200 OK");

  const wasmPackBuildOut = await Containers.exec(
    dockerodeContainer,
    RustcBuildCmd.WASM_PACK_BUILD_BUNDLER,
    300000,
    "TRACE",
  );
  t.ok(wasmPackBuildOut, "wasmPackBuildOut truthy OK");

  // The list of files the wasm-pack bundler target produces
  const expectedFiles = [
    ".gitignore",
    "hello_world.d.ts",
    "hello_world.js",
    "hello_world_bg.js",
    "hello_world_bg.wasm",
    "hello_world_bg.wasm.d.ts",
    "package.json",
  ];

  const filesOnFs = await Containers.ls(dockerodeContainer, containerPkDir);
  t.ok(filesOnFs, "filesOnFs truthy OK");
  t.true(Array.isArray(filesOnFs), "Array.isArray(filesOnFs) OK");
  t.comment(`filesOnFs: ${JSON.stringify(filesOnFs)}`);
  t.deepEqual(filesOnFs, expectedFiles, "deepEqual filesOnFs, fileNames OK");

  const fileChecks = filesOnFs.map(async (fileName) => {
    const containerFilePath = path.join(containerPkDir, fileName);
    const hostFilePath = path.join(hostSourceDir, fileName);
    const contentsBuffer = await Containers.pullBinaryFile(
      dockerodeContainer,
      containerFilePath,
    );
    t.ok(contentsBuffer, `contents buffer truthy OK: ${containerFilePath}`);
    t.true(contentsBuffer.length > 0, `size > 0 OK: ${containerFilePath}`);
    await fs.writeFile(hostFilePath, contentsBuffer);
    const { isFile, size } = await fs.stat(hostFilePath);
    t.true(isFile, `isFile===true OK: ${hostFilePath}`);
    t.true(size > 0, `size > 0 OK: ${hostFilePath}`);
  });

  await t.doesNotReject(Promise.all(fileChecks), "All WASM build files OK");

  const wasmHostPath = path.join(hostSourceDir, "./hello_world.js");
  const esmRequire = esm(module, { wasm: true });
  const wasmModule = esmRequire(wasmHostPath) as HelloWorldExports;
  const helloWorldOut = wasmModule.hello_world();
  t.ok(helloWorldOut, "helloWorldOut truthy OK");
  t.equal(helloWorldOut, "Hello World!", "helloWorldOut EQ Hello World! OK");

  const greeting = wasmModule.say_hello("Peter");
  t.ok(greeting, "greeting truthy OK");
  t.equal(greeting, "Hello Peter!", "greeting EQ Hello Peter! OK");

  t.end();
});
