/**
 * @license
 * Copyright 2022 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2022 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import { useEffect, useState } from "react";
import { VSCodeRpcWorkspaceComponents } from "./cacheUtilsVSCode";
import {
  DownloadDataType,
  downloadDataWithCache,
} from "./pipeline-editor/src/cacheUtils";
import {
  ComponentLibraryStruct,
  ComponentLibraryVisFromStruct,
} from "./pipeline-editor/src/DragNDrop/ComponentLibrary";
import { notUndefined } from "./pipeline-editor/src/utils";

const vscodeRpcWorkspaceComponents = new VSCodeRpcWorkspaceComponents();

export const ComponentLibraryVSCode = ({
  downloadData = downloadDataWithCache,
}: {
  downloadData: DownloadDataType;
}) => {
  const [componentLibraryStruct, setComponentLibraryStruct] = useState<
    ComponentLibraryStruct | undefined
  >();

  useEffect(() => {
    (async () => {
      const componentRefs = (
        await Promise.all(
          (await vscodeRpcWorkspaceComponents.keys())
            .sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" })
            )
            .map(async (key) => await vscodeRpcWorkspaceComponents.get(key))
        )
      ).filter(notUndefined);
      const componentLibraryStruct: ComponentLibraryStruct = {
        folders: [
          {
            name: "VS Code workspace components",
            components: componentRefs,
            folders: [],
          },
        ],
      };
      setComponentLibraryStruct(componentLibraryStruct);
    })();
  }, [setComponentLibraryStruct]);

  return (
    <ComponentLibraryVisFromStruct
      componentLibraryStruct={componentLibraryStruct}
      downloadData={downloadData}
    />
  );
};
