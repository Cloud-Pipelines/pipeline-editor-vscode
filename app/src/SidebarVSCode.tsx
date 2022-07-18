/**
 * @license
 * Copyright 2021 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2021 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import { DragEvent } from 'react';

import ComponentLibrary from './pipeline-editor/src/DragNDrop/ComponentLibrary'
import { ComponentSpec } from './pipeline-editor/src/componentSpec';
import { AppSettings } from './pipeline-editor/src/appSettings';
import { DownloadDataType, downloadDataWithCache } from './pipeline-editor/src/cacheUtils';

import "./pipeline-editor/src/DragNDrop/dnd.css";
import { ComponentLibraryVSCode } from './ComponentLibraryVSCode';

const onDragStart = (event: DragEvent, nodeData: object) => {
  event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
  event.dataTransfer.setData(
    "DragStart.offset",
    JSON.stringify({
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY,
    })
  );
  event.dataTransfer.effectAllowed = 'move';
};

interface SidebarProps {
  componentSpec?: ComponentSpec,
  setComponentSpec?: (componentSpec: ComponentSpec) => void,
  appSettings: AppSettings;
  downloadData: DownloadDataType;
}

const Sidebar = ({
  componentSpec,
  setComponentSpec,
  appSettings,
  downloadData = downloadDataWithCache
}: SidebarProps) => {

  return (
    <aside className="nodeList">
      <h3>Drag components to the canvas:</h3>
      <details style={{ border: "1px solid #aaa", borderRadius: "4px", padding: "4px" }}>
        <summary><strong>Special</strong></summary>
        <div className="react-flow__node react-flow__node-input sidebar-node" onDragStart={(event: DragEvent) => onDragStart(event, { input: { label: "Input" } })} draggable>
          Input
        </div>
        <div className="react-flow__node react-flow__node-output sidebar-node" onDragStart={(event: DragEvent) => onDragStart(event, { output: { label: "Output" } })} draggable>
          Output
        </div>
      </details>
      <details open>
        <summary style={{ border: "1px solid #aaa", borderRadius: "4px", padding: "4px" }}>
          <strong>Component library</strong>
        </summary>
        <div style={{ paddingLeft: "10px" }}>
          <ComponentLibrary
            url={appSettings.componentLibraryUrl}
            downloadData={downloadData}
          />
        </div>
      </details>
      <details open>
        <summary style={{ border: "1px solid #aaa", borderRadius: "4px", padding: "4px" }}>
          <strong>VS Code workspace components</strong>
        </summary>
        <div style={{ paddingLeft: "10px" }}>
          <ComponentLibraryVSCode downloadData={downloadData}/>
        </div>
      </details>
    </aside>
  );
};

export default Sidebar;
