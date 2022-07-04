var path = require("path");
var fs = require("fs");
const {
  override,
  //addDecoratorsLegacy,
  babelInclude,
  //disableEsLint,
} = require("customize-cra");

module.exports = function (config, env) {
  return Object.assign(
    config,
    override(
      //disableEsLint(),
      //addDecoratorsLegacy(),
      babelInclude([
        path.resolve("src"),
        // We need to resolve the symlink, otherwise Webpack does not match the path properly.
        // See https://github.com/webpack/webpack/issues/1643#issuecomment-1092522733
        fs.realpathSync("node_modules/pipeline-editor/src"),
      ])
    )(config, env)
  );
};
