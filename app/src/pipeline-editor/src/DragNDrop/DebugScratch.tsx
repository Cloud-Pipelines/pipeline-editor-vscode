/**
 * @license
 * Copyright 2021 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2021 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import {
  Accordion,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";
import { ComponentSpec } from "../componentSpec";
import { useState } from "react";
import { loadComponentFromUrl } from "./samplePipelines";

export const DATA_PASSING_PIPELINE_URL =
  "https://raw.githubusercontent.com/Ark-kun/pipelines/b45c82e42588ee0a86b8875d1908d972275bfd2f/samples/test/data_passing.pipeline.component.yaml";
export const GOOGLE_CLOUD_OPTIMIZER_PIPELINE_URL =
  "https://raw.githubusercontent.com/Ark-kun/pipeline_components/84e782224ff79a0690e84e7d66c93cec5089e041/components/google-cloud/Optimizer/_samples/Optimization.pipeline.component.yaml";

interface DebugScratchProps {
  componentSpec?: ComponentSpec;
  setComponentSpec?: (componentSpec: ComponentSpec) => void;
}

const DebugScratch = ({
  componentSpec,
  setComponentSpec,
}: DebugScratchProps) => {
  const [message, setMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          loadComponentFromUrl(DATA_PASSING_PIPELINE_URL).then(
            setComponentSpec
          );
        }}
      >
        Load Data Passing pipeline
      </button>
      <button
        type="button"
        onClick={(e) => {
          loadComponentFromUrl(GOOGLE_CLOUD_OPTIMIZER_PIPELINE_URL).then(
            setComponentSpec
          );
        }}
      >
        Load Google Cloud Optimizer pipeline
      </button>
      <button
        onClick={async (e) => {
          // Error: net::ERR_CERT_AUTHORITY_INVALID
          const response = await fetch("https://IP/api/v1/pods/", {
            headers: new Headers({
              Authorization: "Bearer ",
              "Content-Type": "application/json; charset=utf-8",
            }),
          });
          const responseText = await response.text();
          setMessage(responseText);
        }}
      >
        List K8s cluster objects
      </button>
      <span>{message}</span>
      <Accordion>
        <AccordionSummary>Summary</AccordionSummary>
      </Accordion>
      <button
        onClick={(e) => {
          setIsDialogOpen(true);
        }}
      >
        Show dialog
      </button>
      <Dialog
        //open={open}
        open={isDialogOpen}
        //onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Do something?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            foo bar
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={(e) => setIsDialogOpen(false)}>
            Disagree
          </Button>
          <Button
            color="primary"
            onClick={(e) => setIsDialogOpen(false)}
            autoFocus
          >
            Agree
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DebugScratch;
