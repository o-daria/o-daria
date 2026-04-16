// @ts-check
const { ModuleFederationPlugin } = require("webpack").container;
const { DefinePlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

const deps = require("./package.json").dependencies;

/** @param {Record<string,string>} _env @param {{ mode?: string }} argv @returns {import("webpack").Configuration} */
module.exports = (_env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: "./src/main.tsx",
    mode: isProd ? "production" : "development",
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    output: {
      path: path.resolve(__dirname, "dist"),
      publicPath: "auto",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "@app/auth": path.resolve(__dirname, "../../packages/@app/auth/src/index.ts"),
        "@app/api-client": path.resolve(__dirname, "../../packages/@app/api-client/src/index.ts"),
        "@app/ui": path.resolve(__dirname, "../../packages/@app/ui/src/index.ts"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [{ loader: "ts-loader", options: { transpileOnly: true } }],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            "css-loader",
            { loader: "postcss-loader", options: { postcssOptions: { config: path.resolve(__dirname, "postcss.config.js") } } },
          ],
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "mfe_auth",
        filename: "remoteEntry.js",
        exposes: {
          "./Module": "./src/Module",
        },
        shared: {
          react: { singleton: true, requiredVersion: deps["react"] },
          "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
          "react-router-dom": { singleton: true, requiredVersion: deps["react-router-dom"] },
          "@app/auth": { singleton: true },
          "@app/ui": { singleton: true },
        },
      }),
      new HtmlWebpackPlugin({ template: "./index.html" }),
      new DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
        "process.env.GOOGLE_CLIENT_ID": JSON.stringify(process.env.GOOGLE_CLIENT_ID ?? ""),
      }),
    ],
    devServer: {
      port: 3001,
      historyApiFallback: true,
      hot: true,
      headers: { "Access-Control-Allow-Origin": "*" },
      static: { directory: path.resolve(__dirname, "public") },
    },
  };
};
