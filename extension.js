const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Dyslexia Mitigation extension is now active!");

  let disposable = vscode.commands.registerCommand("dyslexia-mitigation.openFloatingMenu", () => {
    const panel = vscode.window.createWebviewPanel(
      "floatingMenu",
      "Dyslexia Helper",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Get path to webview HTML file
    const htmlPath = path.join(context.extensionPath, "webview", "menu.html");
    let htmlContent;

    try {
      htmlContent = fs.readFileSync(htmlPath, "utf8");
    } catch (err) {
      htmlContent = getBackupWebviewContent();
      console.error("Failed to load webview HTML:", err);
      vscode.window.showErrorMessage("Failed to load dyslexia helper menu. Using backup version.");
    }

    panel.webview.html = htmlContent;
    panel.reveal(vscode.ViewColumn.Active);

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "startPomodoro":
            vscode.window.showInformationMessage(
              `Starting Pomodoro timer for ${message.minutes} minutes`
            );
            return;
          case "dictionaryLookup":
            vscode.window.showInformationMessage("Looking up selected word");
            return;
          case "readAloud":
            vscode.window.showInformationMessage("Toggling read aloud");
            return;
          case "toggleFont":
            vscode.window.showInformationMessage(
              `${message.enabled ? "Enabling" : "Disabling"} custom font: ${message.font}`
            );
            return;
          case "changeFont":
            vscode.window.showInformationMessage(`Changing font to ${message.font}`);
            return;
          case "syllableSplit":
            vscode.window.showInformationMessage("Splitting text into syllables");
            return;
          case "geminiShorten":
            vscode.window.showInformationMessage("Shortening text with Gemini");
            return;
          // Handle other commands
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

// Fallback in case the HTML file can't be loaded
function getBackupWebviewContent() {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dyslexia Helper</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        button { margin: 10px 0; padding: 10px; width: 100%; }
      </style>
    </head>
    <body>
      <h1>Dyslexia Helper</h1>
      <p>Error loading full interface. Using simplified version.</p>
      <button onclick="vscode.postMessage({command: 'toggleDyslexiaMode'})">Toggle Dyslexia Mode</button>
      <button onclick="vscode.postMessage({command: 'increaseFontSize'})">Increase Font Size</button>
      <script>
        const vscode = acquireVsCodeApi();
      </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
