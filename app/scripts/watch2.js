// Modified from https://gist.github.com/gonzofish/fc395f8caa11196b0bcca4411266ccc0
process.env.NODE_ENV = 'development';

const { copySync } = require('fs-extra');
const paths = require('react-app-rewired/scripts/utils/paths');
const overrides = require('react-app-rewired/config-overrides');
const webpack = require('webpack');
//const webpackConfigPath = paths.scriptVersion + '/config/webpack.config.dev';
//const originalConfig = require(webpackConfigPath);
const getReactScriptsWebpackConfig = require("react-scripts/config/webpack.config.js");
const originalConfig = getReactScriptsWebpackConfig("development");
const config = overrides.webpack(
  originalConfig,
  process.env.NODE_ENV
);

const copyPublicFolder = () => {
  copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
  });
};

// config.entry = config.entry.filter(
//   (entry) => !entry.includes('webpackHotDevClient')
// );
//config.output.path = paths.appBuild;
//paths.publicUrl = paths.appBuild + '/';

// Note(Alexey Volkov): Fixing the `publicPath` which does not allow relative URLs when NODE_ENV = "development".
// Quote from `getPublicUrlOrPath`: "In development always will be an absolute path".
config.output.publicPath = process.env.PUBLIC_URL;
console.log("config.output.path", config.output.path);
console.log("paths.appBuild", paths.appBuild);
config.output.path = paths.appBuild;

webpack(config).watch({}, (err) => {
  if (err) {
    console.error(err);
  } else {
    copyPublicFolder();
  }
});
