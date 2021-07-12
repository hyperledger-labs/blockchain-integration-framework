import path from "path";
import JSON5 from "json5";
import fs from "fs-extra";
import globby from "globby";
import { RuntimeError } from "run-time-error";
import lernaJson from "../lerna.json";

const main = async (argv: string[], env: NodeJS.ProcessEnv) => {
  if (!argv) {
    throw new RuntimeError(`Process argv cannot be falsy.`);
  }
  if (!env) {
    throw new RuntimeError(`Process env cannot be falsy.`);
  }
  const TS_CONFIG = "tsconfig.json";
  const PACKAGE_JSON = "package.json";
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../");
  console.log(`SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`PROJECT_DIR=${PROJECT_DIR}`);

  const pkgJsonGlobPatterns = lernaJson.packages.map((it) =>
    "./".concat(it).concat(`/${PACKAGE_JSON}`),
  );

  const tsConfigJsonGlobPatterns = lernaJson.packages.map((it) =>
    "./".concat(it).concat(`/${TS_CONFIG}`),
  );
  console.log("Globbing lerna package patterns: ", pkgJsonGlobPatterns);

  const globbyOptions: globby.GlobbyOptions = {
    cwd: PROJECT_DIR,
    absolute: true,
  };
  const pkgJsonPaths = await globby(pkgJsonGlobPatterns, globbyOptions);
  console.log(`Package paths (${pkgJsonPaths.length}): `, pkgJsonPaths);

  const tsConfigPaths = await globby(tsConfigJsonGlobPatterns, globbyOptions);
  console.log(`${TS_CONFIG} paths (${tsConfigPaths.length}): `, tsConfigPaths);

  const pkgNameToPath = new Map();
  const pkgPathToName = new Map();
  tsConfigPaths.forEach((it) => {
    const pkgName = "@hyperledger/".concat(path.basename(path.dirname(it)));
    pkgNameToPath.set(pkgName, it);
    pkgPathToName.set(it, pkgName);
  });
  console.log("=========================");
  console.log(pkgNameToPath);
  console.log("=========================");

  for (const pkgJsonPath of pkgJsonPaths) {
    const pkgDirPath = path.dirname(pkgJsonPath);
    const pkgDirName = path.basename(pkgDirPath);
    const tsConfigPath = pkgJsonPath.replace(PACKAGE_JSON, TS_CONFIG);
    console.log(tsConfigPath);
    const tsConfigBuffer = await fs.readFile(tsConfigPath);
    const tsConfigJson = tsConfigBuffer.toString("utf-8");
    const tsConfig = JSON5.parse(tsConfigJson);
    console.log("Parsed tsconfig: ", tsConfig);

    const pkg = await fs.readJson(pkgJsonPath);

    const deps = Object.keys(pkg.dependencies).filter((it) =>
      it.startsWith("@hyperledger/cactus-"),
    );

    const devDeps = Object.keys(pkg.devDependencies || {}).filter((it) =>
      it.startsWith("@hyperledger/cactus-"),
    );

    const allDepsOfPkg = new Set([...deps, ...devDeps]);
    console.log(`Sibling dependencies of ${pkg.name}:`, allDepsOfPkg);

    tsConfig.compilerOptions.rootDir = "./src";
    tsConfig.compilerOptions.tsBuildInfoFile = `../../.build-cache/${pkgDirName}.tsbuildinfo`;

    tsConfig.references = Array.from(allDepsOfPkg)
      .map((depPkgName) => pkgNameToPath.get(depPkgName))
      .map((depAbsPath) => path.relative(pkgDirPath, depAbsPath))
      .map((path) => ({ path }));

    const newTsConfigJson = JSON.stringify(tsConfig, null, 2);
    console.log(`New tsconfig.json contents for ${tsConfigPath}: `);
    console.log(newTsConfigJson);
    await fs.writeFile(tsConfigPath, newTsConfigJson);
  }
};

main(process.argv, process.env);
