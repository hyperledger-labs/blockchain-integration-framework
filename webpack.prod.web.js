const packageDir = process.cwd();
const pkg = require(`${packageDir}/package.json`);
const TerserPlugin = require("terser-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

const packageNameNoScope = pkg.name.substring(pkg.name.lastIndexOf("/") + 1);
const libraryName = `${packageNameNoScope}`;

/** @type {import("webpack").Configuration} */
module.exports = {
  entry: {
    [pkg.browserMinified]: `${packageDir}/src/main/typescript/index.web.ts`,
  },
  mode: "production",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: "tsconfig.json",
            },
          },
        ],
      },
      {
        test: /\.(js|ts)$/,
        enforce: "pre",
        use: [
          {
            loader: "source-map-loader",
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      buffer: require.resolve("buffer/"),
      stream: require.resolve("stream-browserify"),
    },
  },
  optimization: {
    minimizer: [new TerserPlugin()],
  },
  plugins: [new NodePolyfillPlugin()],
  output: {
    filename: "[name]",
    path: packageDir,
    libraryTarget: "umd",
    library: libraryName,
    umdNamedDefine: true,
    globalObject: "this",
  },
  externals: {
    express: "express",
  },
};
