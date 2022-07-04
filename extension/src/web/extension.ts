// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PipelineEditorProvider } from "../pipelineEditor";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "pipeline-editor" is now active in the web extension host!'
  );

  /*
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
  */

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cloud-pipeline-editor.newUntitledPipeline",
      async () => {
        // The code you place here will be executed every time your command is executed

        // const newUntitledFileResult = await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
        // // => undefined
        // console.log(`cloud-pipelines-editor.helloWorld: newUntitledFileResult`, newUntitledFileResult);
        // vscode.commands.executeCommand('vscode.openWith',
        //   vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'a.xxx'),
        //   'cloudPipelines.pipelineEditor'
        // );
        // !!! It works !!!
        vscode.commands.executeCommand(
          "vscode.openWith",
          // Cause save file as ".condarc.txt". Why???
          //vscode.Uri.parse("untitled:FooBar.component.yml"),
          // Cause save file as "FooBar.component.yaml.yml". Why extra extension?
          // Does not open new tab when there is already an unsaved tab. (Probably due to static name)
          vscode.Uri.parse("untitled:pipeline.component.yaml"),
          "cloudPipelines.pipelineEditor"
        );
      }
    )
  );

  // Register our custom editor providers
  context.subscriptions.push(PipelineEditorProvider.register(context));

  console.log("PipelineEditorProvider.register(context) completed!");
  // XXX // console.error("vscode.workspace=", vscode.workspace);
}

// this method is called when your extension is deactivated
export function deactivate() {}
