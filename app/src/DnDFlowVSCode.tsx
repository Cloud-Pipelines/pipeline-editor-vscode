/**
 * @license
 * Copyright 2021 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2021 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  //Node,
  useStoreState,
} from "react-flow-renderer";
//import yaml from "js-yaml";

import { ComponentSpec } from "./pipeline-editor/src/componentSpec";
// import {
//   componentSpecToYaml,
//   loadComponentAsRefFromText,
// } from "../componentStore";
import GraphComponentSpecFlow, {
  augmentComponentSpec,
} from "./pipeline-editor/src/DragNDrop/GraphComponentSpecFlow";
// import Sidebar from './Sidebar';
import Sidebar from './SidebarVSCode';
import { AppSettings } from './appSettingsVSCode';
// import { loadComponentFromUrl } from "./samplePipelines";

import "./pipeline-editor/src/DragNDrop/dnd.css";
//import { CompareArrowsOutlined } from "@material-ui/icons";
// import { preloadComponentReferences } from "./samplePipelines";
import VSCodeDocumentConnector from "./VSCodeDocumentConnector";
import { callVSCodeRpc, downloadDataWithVSCodeCache } from "./cacheUtilsVSCode";

const GRID_SIZE = 10;
// const SAVED_COMPONENT_SPEC_KEY = "autosaved.component.yaml";

// const saveComponentSpec = (componentSpec: ComponentSpec, nodes?: Node[]) => {
//   try {
//     if (nodes !== undefined) {
//       if (nodes.length === 0) {
//         console.warn("saveComponentSpec: nodes.length === 0");
//       }
//       componentSpec = augmentComponentSpec(componentSpec, nodes, true, true);
//     }
//     const componentText = componentSpecToYaml(componentSpec);
//     window.sessionStorage.setItem(SAVED_COMPONENT_SPEC_KEY, componentText);
//   } catch(err: any) {
//     // TODO: Find a way to avoid the React/Redux race conditions causing this error.
//     if (err?.message?.startsWith("The nodes array does not") !== true) {
//       console.error(err);
//     }
//   }
// }

// const loadComponentSpec = () => {
//   try {
//     const componentText = window.sessionStorage.getItem(SAVED_COMPONENT_SPEC_KEY);
//     if (componentText !== null) {
//       const loadedYaml = yaml.load(componentText);
//       if (loadedYaml !== null && typeof loadedYaml === "object") {
//         //TODO: Validate that the spec is valid
//         const savedComponentSpec = loadedYaml as ComponentSpec;
//         return savedComponentSpec;
//       }
//     }
//   } catch(err) {
//     console.error(err);
//   }
//   return undefined;
// }

// // Auto-saver is extracted to its own child component since useStoreState in the parent causes infinite re-rendering
// // (each render of GraphComponentSpecFlow seems to change the Redux store).
// // This component seems to be triggered for every node movement, so even pure layout changes are saved.
// const ComponentSpecAutoSaver = ({
//   componentSpec,
// }: {
//   componentSpec: ComponentSpec;
// }) => {
//   const nodes = useStoreState((store) => store.nodes);
//   // Fixing issue where a React error would cause all node positions to be recorded as undefined (`!<tag:yaml.org,2002:js/undefined>`)
//   // nodes should never be undefined in normal situation.
//   if (nodes !== undefined && nodes.length > 0) {
//     saveComponentSpec(componentSpec, nodes);
//   }
//   return null;
// };

const isAppleOS = () =>
  window.navigator.platform.startsWith("Mac") ||
  window.navigator.platform.startsWith("iPhone") ||
  window.navigator.platform.startsWith("iPad") ||
  window.navigator.platform.startsWith("iPod");

const EMPTY_GRAPH_COMPONENT_SPEC: ComponentSpec = {
  implementation: {
    graph: {
      tasks: {},
    },
  },
};

type ComponentSpecPositionAugmenterProps = {
  componentSpec: ComponentSpec;
  setAugmentedComponentSpec: (componentSpec: ComponentSpec) => void;
};

const ComponentSpecPositionAugmenter = ({
  componentSpec,
  setAugmentedComponentSpec,
}: ComponentSpecPositionAugmenterProps) => {
  const nodes = useStoreState((store) => store.nodes);
  try {
    const includeComponentSpecs = false;
    const augmentedComponentSpec = augmentComponentSpec(
      componentSpec,
      nodes,
      includeComponentSpecs,
      true
    );
    setAugmentedComponentSpec(augmentedComponentSpec);
    //    const componentText = componentSpecToYaml(graphComponent);
  } catch (err: any) {
    // TODO: Find a way to avoid the React/Redux race conditions causing this error.
    if (err?.message?.startsWith("The nodes array does not") !== true) {
      console.error(err);
    }
  }
  return null;
};

const DnDFlow = () => {
  const [componentSpec, setComponentSpec] = useState<
    ComponentSpec | undefined
  >();
  const [appSettings, setAppSettings] = useState<
    AppSettings | undefined
  >();
  console.debug("DnDFlow. Render");
  useEffect(() => {
    console.debug("DnDFlow. First time render");
  }, []);

  const downloadData = downloadDataWithVSCodeCache;

  useEffect(() => {
    (async () => {
      //const appSettings = getAppSettings();
      const configuration = await callVSCodeRpc(
        "CloudPipelinesConfiguration:get"
      );
      // TODO: Validate configuration against JsonSchema
      const componentLibraryUrls: Record<string, string> | undefined =
        configuration.componentLibrary?.libraryUrls;
      if (componentLibraryUrls === undefined) {
        return;
      }
      const componentLibraryUrl = Object.values(componentLibraryUrls)[0];
      const appSettings: AppSettings = {
        componentLibraryUrl: componentLibraryUrl,
        componentFeedUrls: [],
        defaultPipelineUrl: "",
        gitHubSearchLocations: [],
        googleCloudOAuthClientId: "",
        pipelineLibraryUrl: "",
      };
      setAppSettings(appSettings);
    })();
  }, []);

  return (
    <div className="dndflow" style={{backgroundColor: "white", color: "black"}}>
      <ReactFlowProvider>
        <div className="reactflow-wrapper">
          {componentSpec && (
            <GraphComponentSpecFlow
              componentSpec={componentSpec}
              setComponentSpec={setComponentSpec}
              deleteKeyCode={isAppleOS() ? "Backspace" : "Delete"}
              multiSelectionKeyCode={isAppleOS() ? "Command" : "Control"}
              snapToGrid={true}
              snapGrid={[GRID_SIZE, GRID_SIZE]}
            >
              {/* <MiniMap /> */}
              <Controls />
              <Background gap={GRID_SIZE} />
            </GraphComponentSpecFlow>
          )}
          {/* <ComponentSpecPositionAugmenter
            componentSpec={componentSpec}
            setAugmentedComponentSpec={handleAugmentedComponentSpecChange}
          /> */}
          <VSCodeDocumentConnector
            pipelineSpec={componentSpec}
            setPipelineSpec={setComponentSpec}
            downloadData={downloadData}
          />
          {/* <ReactBugTest/> */}
        </div>
        {appSettings && (
          <Sidebar
            componentSpec={componentSpec}
            setComponentSpec={setComponentSpec}
            appSettings={appSettings}
            downloadData={downloadData}
          />
        )}
        {/* <ComponentSpecAutoSaver componentSpec={componentSpec}/> */}
      </ReactFlowProvider>
    </div>
  );
};

export default DnDFlow;

// const ReactBugTest = () => {
//   const [, setValue] = useState(1);

//   useEffect(() => {
//     const nonce = getNonce();
//     setValue((currentValue) => {
//       const newValue = currentValue + 1;
//       console.log(`ReactBugTest ${nonce}: 1 Current value is ${currentValue}, new value is ${newValue}`)
//       return newValue;
//     });
//     setValue((currentValue) => {
//       const newValue = currentValue + 1;
//       console.log(`ReactBugTest ${nonce}: 2 Current value is ${currentValue}, new value is ${newValue}`)
//       return newValue;
//     });
//   });
//   return null;
// };

// function getNonce() {
//   let text = "";
//   const possible =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   for (let i = 0; i < 32; i++) {
//     text += possible.charAt(Math.floor(Math.random() * possible.length));
//   }
//   return text;
// }
