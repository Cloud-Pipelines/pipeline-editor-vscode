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
import { ComponentReference } from "./pipeline-editor/src/componentSpec";
import {
  ComponentLibraryFolder,
  FoldersAndComponentsVis,
} from "./pipeline-editor/src/DragNDrop/ComponentLibrary";
import { notUndefined } from "./pipeline-editor/src/utils";

const vscodeRpcWorkspaceComponents = new VSCodeRpcWorkspaceComponents();

type UnorderedComponentFolder = {
  folders: Map<string, UnorderedComponentFolder>;
  components: Set<ComponentReference>;
};

const mapGetOrCreateNew = <TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey,
  createValue: () => TValue
) => {
  const value = map.get(key);
  if (value !== undefined) {
    return value;
  }
  const newValue = createValue();
  map.set(key, newValue);
  return newValue;
};

const addComponentToDeepFolder = (
  root: UnorderedComponentFolder,
  componentRef: ComponentReference,
  pathParts: string[]
) => {
  let currentFolder = root;
  for (const pathPart of pathParts) {
    currentFolder = mapGetOrCreateNew(currentFolder.folders, pathPart, () => ({
      folders: new Map<string, UnorderedComponentFolder>(),
      components: new Set<ComponentReference>(),
    }));
  }
  currentFolder.components.add(componentRef);
};

function sortComponentLibrary(
  folder: UnorderedComponentFolder,
  name: string = "root"
): ComponentLibraryFolder {
  return {
    name: name,
    folders: Array.from(folder.folders.entries())
      .sort(([key1], [key2]) =>
        key1.localeCompare(key2, undefined, { sensitivity: "base" })
      )
      .map(([key, value]) => sortComponentLibrary(value, key)),
    components: Array.from(folder.components.values()).sort((ref1, ref2) =>
      (ref1.name || "").localeCompare(ref2.name || "", undefined, {
        sensitivity: "base",
      })
    ),
  };
}

function compactComponentLibrary(
  folder: ComponentLibraryFolder
): ComponentLibraryFolder {
  // Combines nested folders that have only one sub-folder and no components
  // TODO: Consider inlining folders that only have one component
  const compactedFolders = folder.folders.map(compactComponentLibrary);
  if (compactedFolders.length === 1 && folder.components.length === 0) {
    const singleChildFolder = compactedFolders[0];
    return {
      name: folder.name + "/" + singleChildFolder.name,
      components: singleChildFolder.components,
      folders: singleChildFolder.folders,
    };
  } else {
    return {
      name: folder.name,
      components: folder.components,
      folders: compactedFolders,
    };
  }
}

export const ComponentLibraryVSCode = ({
  downloadData = downloadDataWithCache,
}: {
  downloadData: DownloadDataType;
}) => {
  const [componentLibrary, setComponentLibrary] = useState<
    ComponentLibraryFolder | undefined
  >();

  useEffect(() => {
    (async () => {
      const componentRefs = (
        await Promise.all(
          (
            await vscodeRpcWorkspaceComponents.keys()
          ).map(async (key) => await vscodeRpcWorkspaceComponents.get(key))
        )
      ).filter(notUndefined);

      const rootFolder: UnorderedComponentFolder = {
        folders: new Map<string, UnorderedComponentFolder>(),
        components: new Set<ComponentReference>(),
      };
      for (const componentRef of componentRefs) {
        if (componentRef.name === undefined) {
          // Should not happen
          rootFolder.components.add(componentRef);
        } else {
          const pathParts = componentRef.name.split(/[/\\]/g);
          // Removing the last part which is "component.yaml"
          pathParts.pop();
          // Removing the last directory part - each component.yaml is in separate directory
          // Leaving at least one path part (the workspace folder name)
          if (pathParts.length > 1) {
            pathParts.pop();
          }
          addComponentToDeepFolder(rootFolder, componentRef, pathParts);
        }
      }
      let libraryStructRootFolder = compactComponentLibrary(
        sortComponentLibrary(rootFolder, "")
      );
      if (libraryStructRootFolder.components.length > 0) {
        libraryStructRootFolder.name = libraryStructRootFolder.name.replace(
          /^\//,
          ""
        );
        libraryStructRootFolder = {
          name: "",
          folders: [libraryStructRootFolder],
          components: [],
        };
      }
      setComponentLibrary(libraryStructRootFolder);
    })();
  }, [setComponentLibrary]);

  if (componentLibrary === undefined) {
    return <>The library is being loaded...</>
  }
  if (componentLibrary.folders.length === 0) {
    // TODO: Add link to the component creation guide.
    // TODO: Add link to the ComponentSpec format reference.
    return <>
      No components found in the VSCode workspace.
      Add <code>component.yaml</code> files.
    </>;
  }
  return (
    <FoldersAndComponentsVis
      folder={componentLibrary}
      isOpen={true}
      downloadData={downloadData}
    />
  );
};
