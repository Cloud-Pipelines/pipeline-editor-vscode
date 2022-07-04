import { getLoader, loaderByName } from "@craco/craco";

// see: https://webpack.js.org/configuration/module/#condition
export type Condition =
  | string
  | RegExp
  | Array<Condition>
  | ((arg: any) => boolean)
  | {
      test?: Condition;
      include?: Condition;
      exclude?: Condition;
      and?: Array<Condition>;
      or?: Array<Condition>;
      not?: Array<Condition>;
    };

export type LoaderRule = {
  include?: Condition;
  exclude?: Condition;
};

const getArray = (source?: Condition): Array<Condition> => {
  if (!source) {
    return [];
  }

  return Array.isArray(source) ? source : [source];
};

const include = (babel_loader: LoaderRule, ...includes: Array<Condition>) => {
  const include_config = getArray(babel_loader.include);

  const newIncludes = includes.reduce((accumulator, include) => {
    if (Array.isArray(accumulator)) {
      if (Array.isArray(include)) {
        return accumulator.concat(include);
      }

      accumulator.push(include);
    }
    return accumulator;
  }, include_config);

  babel_loader.include = newIncludes;
};

const exclude = (babel_loader: LoaderRule, ...excludes: Array<Condition>) => {
  const exclude_config = getArray(babel_loader.exclude);
  const newExcludes = excludes.reduce((accumulator, exclude) => {
    if (Array.isArray(accumulator)) {
      if (Array.isArray(exclude)) {
        return accumulator.concat(exclude);
      }

      accumulator.push(exclude);
    }
    return accumulator;
  }, exclude_config);

  babel_loader.exclude = newExcludes;
};

type LoaderResult =
  | { isFound: false; match: undefined }
  | { isFound: true; match: { loader: LoaderRule } };

export type OverrideWebpackConfigParams = {
  webpackConfig: any;
  pluginOptions: {
    includes?: LoaderRule[];
    excludes?: LoaderRule[];
  };
};

export const overrideWebpackConfig = ({
  webpackConfig,
  pluginOptions: { includes = [], excludes = [] },
}: OverrideWebpackConfigParams): any => {
  const result = getLoader(
    webpackConfig,
    loaderByName("babel-loader")
  ) as LoaderResult;
  const { isFound, match } = result;
  //console.log("webpackConfig", webpackConfig);
  //console.log("match", match);
  console.log("match?.loader.include", match?.loader.include)
  if (isFound) {
    includes.forEach((path) => include(match?.loader, path));
    excludes.forEach((path) => exclude(match?.loader, path));
  }
  console.log("match?.loader.include", match?.loader.include)
  return webpackConfig;
};

//---
const path = require("path");
const fs = require("fs");

//const rewireBabelLoader = require("craco-babel-loader");
const rewireBabelLoader = {overrideWebpackConfig: overrideWebpackConfig};

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);

console.log(resolveApp("./node_modules/pipeline-editor/"));

module.exports = {
  plugins: [
    //This is a CRACO plugin: https://github.com/sharegate/craco/blob/master/packages/craco/README.md#configuration-overview
    {
      plugin: rewireBabelLoader,
      options: {
        includes: [resolveApp("./node_modules/pipeline-editor/src")], //put things you want to include in array here
        //excludes: [/(node_modules|bower_components)/],
      },
    },
  ],
};
