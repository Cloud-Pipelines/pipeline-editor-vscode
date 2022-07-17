/**
 * @license
 * Copyright 2022 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2022 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import { useCallback, useEffect, useRef } from "react";
import { useStoreState } from "react-flow-renderer";
import { downloadDataWithVSCodeCache } from "./cacheUtilsVSCode";
import { DownloadDataType } from "./pipeline-editor/src/cacheUtils";

import {
  ComponentSpec,
  isGraphImplementation,
} from "./pipeline-editor/src/componentSpec";
import {
  componentSpecToYaml,
  loadComponentAsRefFromText,
  preloadComponentReferences,
} from "./pipeline-editor/src/componentStore";
import { augmentComponentSpec } from "./pipeline-editor/src/DragNDrop/GraphComponentSpecFlow";

// @ts-ignore
const vscode = acquireVsCodeApi();
// @ts-ignore
window.vscodeApi = vscode;

const FULLY_LOADED_PIPELINE_SPEC_STATE_KEY = "fullyLoadedPipelineSpec";
const SET_PIPELINE_SPEC_MESSAGE_TYPE = "setComponentSpecText";

function createEmptyPipelineSpec(name: string = "Pipeline") {
  return {
    name: name,
    implementation: {
      graph: {
        tasks: {},
      },
    },
  } as ComponentSpec;
}

type VSCodeDocumentConnectorProps = {
  pipelineSpec?: ComponentSpec;
  setPipelineSpec: (componentSpec: ComponentSpec) => void;
  downloadData?: DownloadDataType;
};

const VSCodeDocumentConnector = ({
  pipelineSpec,
  setPipelineSpec,
  downloadData = downloadDataWithVSCodeCache,
}: VSCodeDocumentConnectorProps) => {
  // Problem: Original componentSpec vs componentSpec with preloaded task components.
  // Problem: ComponentSpec vs componentSpec "augmented" with positions.
  // Problem: Infinite React re-render due to ComponentSpec change -> nodes change -> ComponentSpec change -> ...
  // Problem: Infinite React re-render due to update VSCode document -> receive VSCode document -> update VSCode document -> ...
  // Idea:
  // VSCode state holds both original component in some form and augmented component? Why do we need original component??
  // We need to send to VSCode doc update any position changes... But should not include preloaded specs.
  // Problem: How to not expand task components when saving.
  // Solution: Maybe stash the original componentRef in annotation. Or just React state + VSCode state.
  // Solution: Or we can start with just removing spec when url is present.

  const nodes = useStoreState((store) => store.nodes);
  const vscodePipelineTextRef = useRef<string>();

  console.debug("VSCodeDocumentConnector");

  // Case: When VSCode sends updated document text
  const onWatchEventHandler = useCallback(
    async (msg: MessageEvent<any>) => {
      // validate e.origin
      // origin: "vscode-webview://02grj1f2h8e6rtu5jihdjcpi33jh03i65r58kfqn62f8a1i2lco2"
      //console.debug("VSCodeDocumentConnector.onWatchEventHandler; msg=", msg);
      const messageType = msg.data.type as string;
      const messageData = msg.data.data;
      switch (messageType) {
        case SET_PIPELINE_SPEC_MESSAGE_TYPE:
          const componentText = messageData;
          if (typeof msg.data! == "string") {
            throw TypeError(`Message data type should be string. msg=${msg}`);
          }
          try {
            const fullyLoadedPipelineSpec =
              componentText === ""
                ? // Handling the case where the editor is (explicitly) applied to an empty file.
                  // Handing this case by loading an empty pipeline.
                  createEmptyPipelineSpec()
                : await preloadComponentReferences(
                    (
                      await loadComponentAsRefFromText(componentText)
                    ).spec,
                    downloadData
                  );
            // Only accepting graph components
            if (
              !isGraphImplementation(fullyLoadedPipelineSpec.implementation)
            ) {
              throw Error(
                "Provided ComponentSpec is not a pipeline (the implementation is not a graph)."
              );
            }
            // The message only arrives once when the document is opened.
            // But the WebView panel is reopened every time it gains focus.
            // So we need to save the document text to VSCode state to preserve it.
            vscode.setState({
              [FULLY_LOADED_PIPELINE_SPEC_STATE_KEY]: fullyLoadedPipelineSpec,
            });
            //
            setPipelineSpec(fullyLoadedPipelineSpec);
            // Setting the `lastReceivedPipelineTextRef` so that we do not echo the pipeline received from VSCode back to VSCode.
            //setVscodePipelineText(componentText);
            vscodePipelineTextRef.current = componentText;
            // lastReceivedPipelineTextRef.current = componentText;
            // // Resetting the sent text since VSCode has different data now.
            // lastSentPipelineTextRef.current = componentText;
          } catch (err: any) {
            // TODO: Show error to the user.
            console.error(
              `VSCodeDocumentConnector.onWatchEventHandler: Error loading the component spec passed from VSCode using a ${messageType} message. Error:`,
              err
            );
            // Sending the error to VSCode so that it reloads the file in text mode.
            vscode.postMessage({
              type: "VSCodeDocumentConnector:InvalidDocumentPassedFromVSCode",
              data: {
                error: err,
              },
            });
          }
          break;
        case "rpcResponse":
          break;
        default:
          console.error(
            "VSCodeDocumentConnector.onWatchEventHandler: Unknown message:",
            msg
          );
          break;
      }
    },
    [setPipelineSpec, downloadData]
  );

  // Case: When VSCode sends updated document text
  useEffect(() => {
    console.debug(
      "VSCodeDocumentConnector. Registering message event listener"
    );
    window.addEventListener("message", onWatchEventHandler);
    vscode.postMessage({
      type: "VSCodeDocumentConnector:AddedEventListener",
      data: {},
    });
    return () => window.removeEventListener("message", onWatchEventHandler);
  }, [onWatchEventHandler]);

  // Case: When VSCode rehydrates the WebView and we need to restore from VSCode state
  useEffect(() => {
    const state = vscode.getState();
    if (state === undefined) {
      return;
    }
    if (typeof state === "object") {
      console.debug("VSCodeDocumentConnector. Got state:", state);
      const componentSpec = state[FULLY_LOADED_PIPELINE_SPEC_STATE_KEY];
      // TODO: Maybe save and load `vscodePipelineText` too.
      if (typeof componentSpec !== "object") {
        console.error(
          `VSCodeDocumentConnector. Got broken state (type=${typeof componentSpec}):`,
          state
        );
        return;
      }
      setPipelineSpec(componentSpec);
    }
  }, [setPipelineSpec]);

  // Case: When component spec (or node positions) change and we need to notify VSCode
  useEffect(() => {
    if (pipelineSpec === undefined) {
      console.debug("VSCodeDocumentConnector. componentSpec === undefined");
      return;
    }
    // Observation: This code is called 5 times on startup:
    // 1. componentSpec === undefined
    // 2. nodes === []
    // 3. nodes have height and width === null
    // 4. nodes have correct height and width
    // 5. I don't know why, but one more time.
    // TODO: Investigate the extra 5th refresh. I've verified that JSON.stringify({spec: componentSpec, nodes: nodes}) is unchanged here.

    // Note: This function is called many times during dragging.
    // Let's skip the updates until all nodes are dropped.
    // This also very often leads to infinite back and forth jitter when using multiple panels showing the same document
    // (and often even with a single editor).
    // TODO: Investigate the issue.
    // Even with "echo reduction" improvements on both App and Extension sides,
    // dragging when split editing still triggers semi-infinite jitter.
    // So, skipping updates when dragging for now.
    // The feedback loops are now fixed.

    // Do not send updates during dragging so that we do not pollute the document history (undo/redo).
    if (nodes.some((node) => node.__rf?.isDragging === true)) {
      console.debug(
        "VSCodeDocumentConnector. Some nodes are being dragged. Skipping update."
      );
      return;
    }

    // Let's skip updates when nodes have null height or width.
    // TODO: FIX: Fix augmentComponentSpec to throw error on nulls. nulls are not valid in JSON standard.
    if (
      nodes.some(
        (node) => node.__rf?.height === null || node.__rf?.width === null
      )
    ) {
      console.debug(
        "VSCodeDocumentConnector. Some nodes have null dimensions. Skipping update."
      );
      return;
    }

    // The code reaches here 2 times initially (strange). TODO: Try to prevent the 2nd update.
    // The code reaches here 1 time when drag finishes.
    // The code reaches here 2 times when changing argument value. TODO: Try to prevent the 2nd update.
    // TODO: ! Prevent sending changes to VSCode until any real change has been made.
    console.debug(
      "VSCodeDocumentConnector. ComponentSpec or nodes have changed - updating augmented componentSpec"
    );
    // console.debug({
    //   //componentSpec: componentSpec,
    //   //nodes: nodes,
    //   //nodes: JSON.stringify(nodes, undefined, 2),
    //   xxx: JSON.stringify({spec: componentSpec, nodes: nodes}, undefined, 2),
    // });
    try {
      const componentSpecWithPositionsAndSpecs = augmentComponentSpec(
        pipelineSpec,
        nodes,
        // includeSpecs
        true,
        // includePositions
        true
      );
      const componentSpecWithPositionsAndWithoutSpecs = augmentComponentSpec(
        pipelineSpec,
        nodes,
        // includeSpecs
        false,
        // includePositions
        true
      );
      // Save VScode state
      console.debug(
        "VSCodeDocumentConnector. ComponentSpec or nodes have changed - doing vscode.setState"
      );
      vscode.setState({
        [FULLY_LOADED_PIPELINE_SPEC_STATE_KEY]:
          componentSpecWithPositionsAndSpecs,
      });
      // Send new document text to VSCode
      const newPipelineTextForSaving = componentSpecToYaml(
        componentSpecWithPositionsAndWithoutSpecs
      );
      if (
        compareStringsWithNormalizedLineEndings(
          newPipelineTextForSaving,
          vscodePipelineTextRef.current
        )
      ) {
        console.debug(
          "VSCodeDocumentConnector. Pipeline text is the same as the one in VSCode. Skipping."
        );
        return;
      }
      console.debug(
        "VSCodeDocumentConnector. Pipeline text is new. Sending it to VSCode."
      );
      vscode.postMessage({
        type: "VSCodeDocumentConnector:ComponentSpecChanged",
        data: newPipelineTextForSaving,
      });
      //lastSentPipelineTextRef.current = newPipelineTextForSaving;
      vscodePipelineTextRef.current = newPipelineTextForSaving;
    } catch (err: any) {
      console.debug(
        "VSCodeDocumentConnector. Some nodes are missing. Skipping update."
      );
      // TODO: Find a way to avoid the React/Redux race conditions causing this error.
      // Nodes updates only during the next re-render after componentSpec updates.
      if (err?.message?.startsWith("The nodes array does not") !== true) {
        console.error(err);
      }
    }
  }, [pipelineSpec, nodes]);

  return null;
};

function compareStringsWithNormalizedLineEndings(s1?: string, s2?: string) {
  if (s1 === undefined && s2 === undefined) {
    return true;
  }
  if (s1 === undefined || s2 === undefined) {
    return false;
  }
  return s1.replace(/\r\n/g, "\n") === s2.replace(/\r\n/g, "\n");
}

export default VSCodeDocumentConnector;
