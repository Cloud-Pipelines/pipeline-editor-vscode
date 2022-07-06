// https://gist.github.com/int128/e0cdec598c5b3db728ff35758abdbafd?permalink_comment_id=3587179#gistcomment-3587179
//[Ark-kun]: This causes relative PUBLIC_URL to stop working.
//Quote from `getPublicUrlOrPath`: "In development always will be an absolute path"
process.env.NODE_ENV = "development";

const webpack = require("webpack");
const config = require("react-scripts/config/webpack.config.js");

const conf = config("development");

// We need to disable the
// It looks like the rule and the plugin can be disabled by the following flag:
// const shouldUseReactRefresh = env.raw.FAST_REFRESH;
// TODO: Just use FAST_REFRESH=false

process.env.FAST_REFRESH = false;

/*
const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

// Remove the `react-refresh` plugin from `babel-loader`
// Note(Alexey Volkov): Seems to work without this
for (const rule of conf.module.rules) {
  if (!rule.oneOf) continue;

  for (const one of rule.oneOf) {
    if (
      one.loader &&
      one.loader.includes("babel-loader") &&
      one.options &&
      one.options.plugins
    ) {
      one.options.plugins = one.options.plugins.filter(
        (plugin) =>
          !(typeof plugin === "string" && plugin.includes("react-refresh"))
      );
    }
  }
}

// Remove the refresh plugins plugin from the webpack config
// Removing the react-refresh filter from the babel-loader rule (above) seems to be enough, so removing the plugins might be redundant.
// Removing the plugin but keeping the rules causes: Uncaught ReferenceError: $RefreshReg$ is not defined
conf.plugins = conf.plugins.filter(
  (plugin) =>
    !(
      plugin instanceof webpack.HotModuleReplacementPlugin || // This plugin does not seem to be used
      plugin instanceof ReactRefreshPlugin
    )
);
*/

// Note(Alexey Volkov): Fixing the `publicPath` which does not allow relative URLs when NODE_ENV = "development".
// Quote from `getPublicUrlOrPath`: "In development always will be an absolute path".
conf.output.publicPath = process.env.PUBLIC_URL;

webpack(conf).watch({}, (err, stats) => {
  if (err) {
    console.error(err);
  } else {
    // Note(Alexey Volkov): The public folder seems to be copied without this call.
    //copyPublicFolder();
  }
  console.error(
    stats.toString({
      chunks: false,
      colors: true,
    })
  );
});

/*
const fs = require("fs-extra");
const paths = require("react-scripts/config/paths");

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
  });
}
*/