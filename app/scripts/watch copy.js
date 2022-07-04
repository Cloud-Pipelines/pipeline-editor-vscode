// https://gist.github.com/int128/e0cdec598c5b3db728ff35758abdbafd?permalink_comment_id=3587179#gistcomment-3587179
//[Ark-kun]: This causes relative PUBLIC_URL to stop working.
//Quote from `getPublicUrlOrPath`: "In development always will be an absolute path"
process.env.NODE_ENV = "development";

const fs = require("fs-extra");
const paths = require("react-scripts/config/paths");
const webpack = require("webpack");
const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const config = require("react-scripts/config/webpack.config.js");
const path = require("path");

const conf = config("development");

//XXX
//console.warn(conf);
console.warn("paths=");
console.warn(JSON.stringify(paths, undefined, 2));
console.warn("conf=");
console.warn(JSON.stringify(conf, undefined, 2));

for (const rule of conf.module.rules) {
  if (!rule.oneOf) continue;

  for (const one of rule.oneOf) {
    if (
      one.loader &&
      one.loader.includes("babel-loader") &&
      one.options &&
      one.options.plugins
    ) {
      //XXX
      //console.warn(
      //  `one.options.plugins before ${JSON.stringify(one.options.plugins)}`
      //);
      console.warn(
        `one.options.plugins[0] before ${JSON.stringify(
          one.options.plugins[0]
        )}`
      );
      one.options.plugins = one.options.plugins.filter(
        (plugin) =>
          !(typeof plugin === "string" && plugin.includes("react-refresh"))
      );
      //XXX
      //console.warn(
      //  `one.options.plugins after ${JSON.stringify(one.options.plugins)}`
      //);
    }
  }
}

conf.plugins = conf.plugins.filter(
  (plugin) =>
    !(
      plugin instanceof webpack.HotModuleReplacementPlugin ||
      plugin instanceof ReactRefreshPlugin
    )
);

// We needed to output to a specific folder for cross-framework interop.
// Make sure to change the output path or to remove this line if the behavior
// of the original gist is sufficient for your needs!
///XXX///conf.output.path = path.join(process.cwd(), './path/to/output');

///XXX/// Will this work?
conf.output.publicPath = process.env.PUBLIC_URL;

webpack(conf).watch({}, (err, stats) => {
  if (err) {
    console.error(err);
  } else {
    //copyPublicFolder();
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
