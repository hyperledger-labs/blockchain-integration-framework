module.exports = (_, options) => {
  const { env, target: targets } = options;
  const { dev } = env;
  const buildEnv = dev === true ? "dev" : "prod";
  const [target] = targets;
  const configPath = `./webpack.${buildEnv}.${target}.js`;
  return require(configPath);
};
