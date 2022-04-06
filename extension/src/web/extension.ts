// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "pipeline-editor" is now active in the web extension host!'
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("reactPanel.start", () => {
      ReactPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("reactPanel.postMessage", () => {
      if (ReactPanel.currentPanel) {
        ReactPanel.currentPanel.postMessage();
      }
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(ReactPanel.viewType, {
      async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: any
      ) {
        console.log(`Got state: ${state}`);
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        ReactPanel.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `build` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "build")],
  };
}

// this method is called when your extension is deactivated
export function deactivate() {}

/**
 * Manages react webview panels
 */
class ReactPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: ReactPanel | undefined;

  public static readonly viewType = "reactPanel";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (ReactPanel.currentPanel) {
      ReactPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      ReactPanel.viewType,
      "React app panel",
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri)
    );

    ReactPanel.currentPanel = new ReactPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    ReactPanel.currentPanel = new ReactPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public postMessage() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: "someCommand" });
  }

  public dispose() {
    ReactPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update() {
    this._panel.title = "React panel";
    this._panel.webview.html = await this._getHtmlForWebview(
      this._panel.webview
    );
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
    useContentSecurityPolicy = false
  ) {
    // Load the React app HTML and automatically patch it to be VSCode-compatible.
    // VSCode requires that all extension assets are loaded from vscode-resource URLs.
    // The patching code adds the `<base href="https://file+.vscode-resource.vscode-webview.net/.../extension/build/">`
    // element to the HTML code to fix the asset loading (only works for relative links).
    // The React app assets are taken from the extension `build` sub-directory.

    const indexHtmlFileUri = vscode.Uri.joinPath(
      this._extensionUri,
      "build",
      "index.html"
    );

    // VSCode web extensions do not support the "fs" module.
    // So we use vscode.workspace.fs.readFile (which is async).
    const indexHtmlData = await vscode.workspace.fs.readFile(indexHtmlFileUri);
    const indexHtmlText = new TextDecoder().decode(indexHtmlData).toString();

    // Setting the base URL for all HTML asset loading (relative links only) to extension/build.
    const extensionBuildUri = vscode.Uri.joinPath(this._extensionUri, "build");
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
