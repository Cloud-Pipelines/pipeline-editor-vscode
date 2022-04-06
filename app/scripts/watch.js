// Based on https://gist.github.com/int128/e0cdec598c5b3db728ff35758abdbafd?permalink_comment_id=3587179#gistcomment-3587179
process.env.NODE_ENV = "development";

const fs = require("fs-extra");
const paths = require("react-scripts/config/paths");
const webpack = require("webpack");
const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const config = require("react-scripts/config/webpack.config.js");

const conf = config("development");

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
// Note(Alexey Volkov): Seems to work without this
conf.plugins = conf.plugins.filter(
  (plugin) =>
    !(
      plugin instanceof webpack.HotModuleReplacementPlugin ||
      plugin instanceof ReactRefreshPlugin
    )
);

// Note(Alexey Volkov): Fixing the `publicPath` which does not allow relative URLs when NODE_ENV = "development".
// Quote from `getPublicUrlOrPath`: "In development always will be an absolute path".
conf.output.publicPath = process.env.PUBLIC_URL;

webpack(conf).watch({}, (err, stats) => {
  if (err) {
    console.error(err);
  } else {
    // Note(Alexey Volkov): Seems to work without this
    copyPublicFolder();
  }
  console.error(
    stats.toString({
      chunks: false,
      colors: true,
    })
  );
});

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
  });
}
