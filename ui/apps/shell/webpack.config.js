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
      publicPath: "/",
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
        name: "shell",
        remotes: {
          mfe_auth: `mfe_auth@${process.env.VITE_MFE_AUTH_URL || "http://localhost:3001/remoteEntry.js"}`,
          mfe_projects: `mfe_projects@${process.env.VITE_MFE_PROJECTS_URL || "http://localhost:3002/remoteEntry.js"}`,
          mfe_reports: `mfe_reports@${process.env.VITE_MFE_REPORTS_URL || "http://localhost:3003/remoteEntry.js"}`,
          mfe_canva: `mfe_canva@${process.env.VITE_MFE_CANVA_URL || "http://localhost:3004/remoteEntry.js"}`,
        },
        shared: {
          react: { singleton: true, requiredVersion: deps["react"], eager: true },
          "react-dom": { singleton: true, requiredVersion: deps["react-dom"], eager: true },
          "react-router-dom": { singleton: true, requiredVersion: deps["react-router-dom"], eager: true },
          "@app/auth": { singleton: true, eager: true },
          "@app/api-client": { singleton: true, eager: true },
          "@app/ui": { singleton: true, eager: true },
          "@tanstack/react-query": { singleton: true, requiredVersion: deps["@tanstack/react-query"], eager: true },
        },
      }),
      new HtmlWebpackPlugin({ template: "./index.html" }),
      new DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
        "process.env.GOOGLE_CLIENT_ID": JSON.stringify(process.env.GOOGLE_CLIENT_ID ?? ""),
      }),
    ],
    devServer: {
      port: 3000,
      historyApiFallback: true,
      hot: true,
      static: { directory: path.resolve(__dirname, "public") },
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:3300',
          changeOrigin: true,
          pathRewrite: { '^/api': '' },
        },
      ],
    },
  };
};
