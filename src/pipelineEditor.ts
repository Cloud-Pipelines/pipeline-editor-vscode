import * as vscode from "vscode";

/**
 * Provider for Pipeline Editor.
 *
 * Pipeline Editor is used for `.component.yaml` files, which are just YAMl or JSON files.
 * To get started, run this extension and open an empty `.component.yaml` file in VS Code.
 */

// !!! The extension host must be restarted when changing this file. (Despite auto-recompiling.)
// F1 + "Developer: Restart Extension host"
export class PipelineEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new PipelineEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      PipelineEditorProvider.viewType,
      provider
    );

    return providerRegistration;
  }

  private static readonly viewType = "cloudPipelines.pipelineEditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when our custom editor is opened.
   *
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log("PipelineEditorProvider.resolveCustomTextEditor");
    // Fail fast: Checking the document format before loading the webview.
    // The document should be a YAML file with `{"implementation": {"graph": ...}}`.
    // TODO: Check the format more elegantly.
    const documentText = document.getText();
    if (
      !(documentText === "" || documentText.match(/implementation:\s*graph:/))
    ) {
      console.debug(
        `PipelineEditorProvider.resolveCustomTextEditor. The document is not a valid pipeline ComponentSpec. Opening a text editor`
      );
      // vscode.commands.executeCommand(
      //   "vscode.openWith",
      //   document.uri,
      //   "default"
      // );
      // vscode.commands.executeCommand(
      //   "vscode.openWith",
      //   document.uri,
      //   "default",
      //   webviewPanel.viewColumn
      // );
      // No longer works in VSCode 1.68
      // vscode.commands.executeCommand('workbench.action.reopenWithEditor',
      //   document.uri,
      //   "default"
      //   //'cloudPipelines.pipelineEditor'
      // );
      // Works
      vscode.commands.executeCommand(
        "workbench.action.toggleEditorType",
        document.uri
      );
      // Not loading HTML into the webview
      return;
    }

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = await this.getHtmlForWebview(
      webviewPanel.webview,
      this.context.extensionUri
    );

    function updateWebview() {
      console.debug("PipelineEditorProvider.updateWebview");
      const documentText = document.getText();
      webviewPanel.webview.postMessage({
        type: "setComponentSpecText",
        data: documentText,
      });
      console.debug(`PipelineEditorProvider.updateWebview - sent ${documentText.length}`);
    }

    //let latestDocumentText = document.getText();
    let latestReceivedDocumentText = "";

    // Hook up event handlers so that we can synchronize the webview with the text document.
    //
    // The text document acts as our model, so we have to sync change in the document to our
    // editor and sync changes in the editor back to the document.
    //
    // Remember that a single text document can also be shared between multiple custom
    // editors (this happens for example when you split a custom editor)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          //latestDocumentText = document.getText();
          if (document.getText().replace(/\r\n/g, "\n") !== latestReceivedDocumentText.replace(/\r\n/g, "\n")) {
            console.debug(
              "PipelineEditorProvider.webviewPanel.webview.onDidChangeTextDocument - Document really changed (outside?) - Calling updateWebview()",
              e
            );
              updateWebview();
          } else {
            // XXX
            console.debug(
              "PipelineEditorProvider.webviewPanel.webview.onDidChangeTextDocument - The changed document text is the same we've received before. - Not calling updateWebview()",
              e
            );
          }
        }
      }
    );

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      if (e?.type !== "rpc") {
        console.debug(
          "PipelineEditorProvider.webviewPanel.webview.onDidReceiveMessage",
          e
        );
      }
      switch (e.type) {
        case "VSCodeDocumentConnector:AddedEventListener":
          //latestReceivedDocumentText = "";
          updateWebview();
          break;
        case "VSCodeDocumentConnector:ComponentSpecChanged":
          const componentSpecText = e.data as string;
          latestReceivedDocumentText = componentSpecText;
          // [Alexey Volkov]: Trying to prevent infinite update loop.
          // Nope. // Note: ! document.getText() does not get updated immediately. So we cannot use it for change detection - it's outdated.
          // !!!! [Alexey Volkov]: VSCode converts \n -> \r\n when applying edits, which breaks string comparison. !!!!
          // So we cannot compare the texts directly - we need to normalize the line endings.
          const normalizedLatestDocumentText = document.getText().replace(/\r\n/g, "\n");
          const normalizedComponentSpecText = componentSpecText.replace(/\r\n/g, "\n");
          if (
            componentSpecText.replace(/\r\n/g, "\n") !==
            document.getText().replace(/\r\n/g, "\n")
          ) {
            // console.debug(
            //   `PipelineEditorProvider.onDidReceiveMessage.componentSpecChanged: New document is different: Current document length: ${normalizedLatestDocumentText.length}, received document length: ${normalizedComponentSpecText.length}`
            // );
            await this.updateTextDocument(document, componentSpecText);
          } else {
            // console.debug(
            //   "PipelineEditorProvider.onDidReceiveMessage.componentSpecChanged: Received document is the same."
            // );
          }
          break;
        case "VSCodeDocumentConnector:InvalidDocumentPassedFromVSCode":
          // The document is not a valid pipeline. Reopen as text.
          console.debug(
            "PipelineEditorProvider.onDidReceiveMessage.InvalidDocumentPassedFromVSCode."
          );
          vscode.window.showErrorMessage(
            "The document is not a valid pipeline (graph component spec)." + " " + "Please file a bug report: https://github.com/Cloud-Pipelines/pipeline-editor/issues"
            // items: A set of items that will be rendered as actions in the message.
          );
          vscode.commands.executeCommand('workbench.action.toggleEditorType',
            document.uri,
          );
          break;
        case "rpc":
          const messageId = e.data.messageId;
          const func = e.data.func;
          const args = e.data.args;
          callRpc(this.context, func, args).then(
            (result: any) => {
              const message = {
                type: "rpcResponse",
                data: {
                  messageId: messageId,
                  result: result,
                },
              };
              //console.debug("PipelineEditorProvider RPC response", message);
              //TODO: use transfer parameter for ArrayBuffer objects.
              webviewPanel.webview.postMessage(message);
            },
            (reason: any) => {
              const message = {
                type: "rpcResponse",
                data: {
                  messageId: messageId,
                  error: {
                    reason: reason,
                  },
                },
              };
              console.debug(
                "PipelineEditorProvider RPC error response",
                JSON.stringify(message)
              );
              webviewPanel.webview.postMessage(message);
            }
          );
          break;
        default:
          console.error("Unsupported message type:", e);
          break;
      }
    });
    // console.debug(
    //   "PipelineEditorProvider.resolveCustomTextEditor - Calling updateWebview() once."
    // );
    // !? Need to wait a bit for the WebView to load and set up event listener.
    //await new Promise(resolve => setTimeout(resolve, 5000));
    //Not calling updateWebview() for now. Waiting for the "VSCodeDocumentConnector:AddedEventListener" message.
    //updateWebview();
  }

  /**
   * Update the underlying VSCode document.
   */
  private updateTextDocument(document: vscode.TextDocument, text: string) {
    console.debug("PipelineEditorProvider.updateTextDocument");
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
      // TODO: Think of a way to infer what has changed and provide a label and a description here.
    );

    // The edit is applied asynchronously and `document.getText()` has the updated value once `applyEdit` completes.
    return vscode.workspace.applyEdit(edit);
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private async getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    useContentSecurityPolicy = false
  ) {
    // Load the React app HTML and automatically patch it to be VSCode-compatible.
    // VSCode requires that all extension assets are loaded from vscode-resource URLs.
    // The patching code adds the `<base href="https://file+.vscode-resource.vscode-webview.net/.../extension/build/">`
    // element to the HTML code to fix the asset loading (only works for relative links).
    // The React app assets are taken from the extension `build` sub-directory.

    const indexHtmlFileUri = vscode.Uri.joinPath(
      extensionUri,
      "build",
      "index.html"
    );

    // VSCode web extensions do not support the "fs" module.
    // So we use vscode.workspace.fs.readFile (which is async).
    const indexHtmlData = await vscode.workspace.fs.readFile(indexHtmlFileUri);
    const indexHtmlText = new TextDecoder().decode(indexHtmlData).toString();

    // Setting the base URL for all HTML asset loading (relative links only) to extension/build.
    const extensionBuildUri = vscode.Uri.joinPath(extensionUri, "build");
    const extensionBuildWebviewUri = webview.asWebviewUri(extensionBuildUri);
    // ! The trailing slash is important !
    const extensionBuildWebviewUriString =
      extensionBuildWebviewUri.toString() + "/";
    const htmlBaseTagString = `<base href="${extensionBuildWebviewUriString}">`;
    let modifiedHtmlText = indexHtmlText.replace(
      "<head>",
      "<head>\n" + htmlBaseTagString
    );
    if (useContentSecurityPolicy) {
      const nonce = getNonce();
      const cspTermList = [
        "default-src 'none'",
        `img-src ${webview.cspSource}`,
        `style-src ${webview.cspSource}`,
        `script-src 'nonce-${nonce}'`,
      ];
      const cspContent = cspTermList.join("; ");
      const cspTagString = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
      modifiedHtmlText = modifiedHtmlText
        .replace("<head>", "<head>\n" + cspTagString + "\n" + cspTagString)
        .replace(/<script/g, `<script nonce="${nonce}"`);
    }
    return modifiedHtmlText;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

const calculateHashDigestHex = async (data: string | ArrayBuffer) => {
  const dataBytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

async function callRpc(
  context: vscode.ExtensionContext,
  func: string,
  args: any[]
): Promise<any> {
  switch (func) {
    case "VSCodeGlobalKeyValueStore:getData": {
      const [cacheName, key] = args as [string, string];
      return await storageCacheGetData(context.globalStorageUri, key, cacheName);
    }
    case "VSCodeGlobalKeyValueStore:setData": {
      const [cacheName, key, value] = args as [string, string, ArrayBuffer];
      return await storageCacheSetData(context.globalStorageUri, key, value, cacheName);
    }
    case "VSCodeGlobalKeyValueStore:listKeys": {
      const [cacheName] = args as [string];
      return await storageCacheListKeys(context.globalStorageUri, cacheName);
    }
    case "VSCodeWorkspaceComponents:getComponentRefByUri": {
      const [uri] = args as [string];
      return await getWorkspaceComponentFileAsComponentRef(uri);
    }
    case "VSCodeWorkspaceComponents:listUris": {
      return await listWorkspaceComponentFileUris();
    }
    default:
      return null;
  }
  return undefined;
}

async function storageCacheGetData(
  storageUri: vscode.Uri,
  key: string,
  cacheName = "cache"
): Promise<ArrayBuffer | undefined> {
  //TODO: Sanitize cacheName less strictly
  const sanitizedCacheName = cacheName.replace(/\W/g, "_");
  const cacheDir = vscode.Uri.joinPath(
    storageUri,
    "caches",
    sanitizedCacheName
  );
  // Collisions are rare... (Let's see how well this work)
  const keyHash = await calculateHashDigestHex(key);
  const valueUri = vscode.Uri.joinPath(cacheDir, keyHash + ".value");
  try {
    // I've verified that readFile really returns Uint8Array, not VSBuffer.
    // See https://github.com/microsoft/vscode/issues/115807#issuecomment-851013383
    const dataArray = await vscode.workspace.fs.readFile(valueUri);
    // Convert the Uint8Array to ArrayBuffer
    // !!! Do not use dataArray(Uint8Array).buffer. The data might (often) have non-zero byteOffset!
    // A typical case when using readFile:
    //dataArray.length = 2454. dataArray.byteOffset = 9. dataArray.buffer.byteLength = 2463
    var arrayBuffer = dataArray.buffer.slice(
      dataArray.byteOffset,
      dataArray.byteOffset + dataArray.byteLength
    );
    return arrayBuffer;
  } catch {
    return undefined;
  }
}

async function storageCacheSetData(
  storageUri: vscode.Uri,
  key: string,
  value: ArrayBuffer,
  cacheName = "cache"
) {
  //TODO: Sanitize cacheName less strictly
  const sanitizedCacheName = cacheName.replace(/\W/g, "_");
  const cacheDir = vscode.Uri.joinPath(
    storageUri,
    "caches",
    sanitizedCacheName
  );
  // Collisions are rare... (Let's see how well this work)
  const keyHash = await calculateHashDigestHex(key);
  const keyUri = vscode.Uri.joinPath(cacheDir, keyHash + ".key");
  const valueUri = vscode.Uri.joinPath(cacheDir, keyHash + ".value");

  await vscode.workspace.fs.writeFile(valueUri, new Uint8Array(value));
  await vscode.workspace.fs.writeFile(keyUri, new TextEncoder().encode(key));
  return;
}

async function storageCacheListKeys(
  storageUri: vscode.Uri,
  cacheName = "cache"
): Promise<string[]> {
  //TODO: Sanitize cacheName less strictly
  const sanitizedCacheName = cacheName.replace(/\W/g, "_");
  const cacheDir = vscode.Uri.joinPath(
    storageUri,
    "caches",
    sanitizedCacheName
  );
  const files = await vscode.workspace.fs.readDirectory(cacheDir);
  const fileNames = files.map(([name, type]) => name);
  const keyFileNames = fileNames.filter((name) => name.endsWith(".key"));
  const keys = await Promise.all(
    keyFileNames.map(async (keyFileName) => {
      const keyFileUri = vscode.Uri.joinPath(cacheDir, keyFileName);
      const keyData = await vscode.workspace.fs.readFile(keyFileUri);
      const key = new TextDecoder().decode(keyData);
      return key;
    })
  );
  return keys;
}

async function getWorkspaceComponentFileAsComponentRef(uri: string) {
  const data = await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
  const text = new TextDecoder().decode(data);
  //TODO: ! Check that this is a valid component file
  //TODO: Add digest
  //TODO: Try to get the GIT URI (and check whether the file is dirty)
  // Make the component names/paths shorter and more readable by using the workspace folder names instead of full URIs.
  let componentName = uri;
  for (const folder of vscode.workspace.workspaceFolders || []) {
    componentName = componentName.replace(folder.uri.toString(), folder.name);
  }
  const componentRef = {
    // We should not set the component reference url to the uri since the URI is local
    name: componentName,
    text: text,
  };
  return componentRef;
}

async function listWorkspaceComponentFileUris() {
  const uris = await vscode.workspace.findFiles("**/component.yaml");
  // TODO: Validate the component files
  return uris.map((uri) => uri.toString());
}
