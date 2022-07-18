/**
 * @license
 * Copyright 2022 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2022 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  MenuList,
} from "@material-ui/core";
import yaml from "js-yaml";
import { useCallback, useState } from "react";
import { callVSCodeRpc } from "./cacheUtilsVSCode";
import { buildArgoWorkflowFromGraphComponent } from "./pipeline-editor/src/compilers/Argo/argoCompiler";
import { buildVertexPipelineJobFromGraphComponent } from "./pipeline-editor/src/compilers/GoogleCloudVertexAIPipelines/vertexAiCompiler";
import { ComponentSpec } from "./pipeline-editor/src/componentSpec";

const compilePipelineToGoogleCloudVertexPipelineJob = (
  componentSpec: ComponentSpec
): string => {
  const vertexPipelineJob = buildVertexPipelineJobFromGraphComponent(
    componentSpec,
    "gs://<gcsOutputDirectory>",
    new Map()
  );
  vertexPipelineJob.labels = {
    sdk: "cloud-pipelines-editor",
    "cloud-pipelines-editor-version": "0-0-1",
  };
  const vertexPipelineJobJson = JSON.stringify(vertexPipelineJob, undefined, 2);
  return vertexPipelineJobJson;
};

const compilePipelineToArgoWorkflow = (
  componentSpec: ComponentSpec
): string => {
  const argoWorkflow = buildArgoWorkflowFromGraphComponent(
    componentSpec,
    new Map()
  );
  argoWorkflow.metadata.labels = {
    sdk: "cloud-pipelines-editor",
    "cloud-pipelines.net/pipeline-editor": "true",
    "pipelines.kubeflow.org/pipeline-sdk-type": "cloud-pipelines-editor",
  };
  const argoWorkflowYaml = yaml.dump(argoWorkflow, {
    lineWidth: -1, // Don't fold long strings
    quotingType: '"',
  });
  return argoWorkflowYaml;
};

export const MainMenu = ({
  componentSpec,
}: {
  componentSpec?: ComponentSpec;
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [compilationErrorMessage, setCompilationErrorMessage] = useState<
    string | undefined
  >(undefined);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuButtonClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleExportAsGoogleCloudVertexPipeline = useCallback(() => {
    if (componentSpec !== undefined) {
      try {
        const compiledPipelineText =
          compilePipelineToGoogleCloudVertexPipelineJob(componentSpec);
        const pipelineFileName = "vertex_pipeline_job.json";
        callVSCodeRpc(
          "promptSaveFileAsWithContent",
          compiledPipelineText,
          pipelineFileName
        );
      } catch (err) {
        const errorMessage =
          typeof err === "object" && err instanceof Error
            ? err.toString()
            : String(err);
        setCompilationErrorMessage(errorMessage);
      }
    }
    handleClose();
  }, [componentSpec, handleClose]);

  const handleExportAsKubeflowPipeline = useCallback(() => {
    if (componentSpec !== undefined) {
      try {
        const compiledPipelineText =
            compilePipelineToArgoWorkflow(componentSpec);
        const pipelineFileName = "kubeflow_pipeline.yaml";
        callVSCodeRpc(
          "promptSaveFileAsWithContent",
          compiledPipelineText,
          pipelineFileName
        );
      } catch (err) {
        const errorMessage =
          typeof err === "object" && err instanceof Error
            ? err.toString()
            : String(err);
        setCompilationErrorMessage(errorMessage);
      }
    }
    handleClose();
  }, [componentSpec, handleClose]);

  return (
    <div>
      <Button
        variant="outlined"
        disableElevation
        onClick={handleMenuButtonClick}
      >
        Menu
      </Button>
      <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleClose}>
        <MenuList dense>
          <MenuItem onClick={handleExportAsGoogleCloudVertexPipeline}>
            Export as Google Cloud Vertex PipelineJob
          </MenuItem>
          <MenuItem onClick={handleExportAsKubeflowPipeline}>
            Export as Kubeflow Pipeline
          </MenuItem>
          {/* <MenuItem>About Cloud Pipelines</MenuItem> */}
          {/* <MenuItem>Give feedback</MenuItem> */}
        </MenuList>
      </Menu>
      <Dialog open={compilationErrorMessage !== undefined}>
        <DialogTitle>Pipeline compilation error</DialogTitle>
        <DialogContent>{compilationErrorMessage}</DialogContent>
        <DialogActions>
          <Button
            color="primary"
            onClick={() => {
              setCompilationErrorMessage(undefined);
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
