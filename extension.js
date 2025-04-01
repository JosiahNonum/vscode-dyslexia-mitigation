const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("Dyslexia Mitigation extension is now active!");

  let currentPanel = undefined;
  let overlayColorDecoration = null;
  let readingGuideDisposable = null;
  let textMaskingEnabled = false;
  let textMaskingDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  });
  let readingGuideDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 0, 0.3)",
  });
  let cursorTrackingEnabled = false;

  // Register command to show menu panel
  let showMenu = vscode.commands.registerCommand("dyslexia-mitigation.showMenu", () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create and show panel
    currentPanel = vscode.window.createWebviewPanel(
      "dyslexiaMenu",
      "Dyslexia Mitigation Tools",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "webview"))],
      }
    );

    // Get path to menu.html
    const menuPath = path.join(context.extensionPath, "webview", "menu.html");
    console.log(`Loading menu from: ${menuPath}`);

    // Read HTML file content
    let menuContent;
    try {
      // Check if the file exists first
      if (!fs.existsSync(menuPath)) {
        vscode.window.showErrorMessage(`Menu file not found at path: ${menuPath}`);
        // Create directory if it doesn't exist
        const webviewDir = path.join(context.extensionPath, "webview");
        if (!fs.existsSync(webviewDir)) {
          fs.mkdirSync(webviewDir);
        }
        // Create a basic menu.html file
        createDefaultMenuFile(menuPath);
        vscode.window.showInformationMessage(`Created default menu file at: ${menuPath}`);
      }

      menuContent = fs.readFileSync(menuPath, "utf8");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load menu: ${error.message}`);
      return;
    }

    // Set webview content
    currentPanel.webview.html = menuContent;

    // Handle messages from the webview
    currentPanel.webview.onDidReceiveMessage(
      (message) => {
        try {
          console.log(`Received message: ${JSON.stringify(message)}`);

          switch (message.command) {
            case "dictionaryLookup":
              dictionaryLookup();
              break;

            case "readAloud":
              vscode.commands.executeCommand("dyslexia-mitigation.textToSpeech");
              break;

            case "changeFont":
              if (message.font === "DEFAULT") {
                vscode.workspace.getConfiguration("editor").update("fontFamily", undefined, true);
                vscode.window.showInformationMessage("Reset to default font");
              } else {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("fontFamily", message.font, true);
                vscode.window.showInformationMessage(`Font changed to ${message.font}`);
              }
              break;

            // Remove syllableSplit case

            // Handler for distraction reducer (text masking)
            case "toggleDistractionReducer":
              toggleTextMaskingFeature(message.enabled);
              break;

            // Handler for tracking aid (cursor tracking)
            case "toggleTrackingAid":
              cursorTrackingEnabled = message.enabled;
              vscode.workspace
                .getConfiguration("editor")
                .update("cursorStyle", cursorTrackingEnabled ? "block" : "line", true);
              vscode.workspace
                .getConfiguration("editor")
                .update("cursorBlinking", cursorTrackingEnabled ? "phase" : "solid", true);
              vscode.window.showInformationMessage(
                cursorTrackingEnabled ? "Cursor Tracking Enabled" : "Cursor Tracking Disabled"
              );
              break;

            // Add handlers for tracking aid color
            case "changeTrackingAidColor":
              vscode.window.showInformationMessage(`Tracking aid color set to ${message.color}`);
              // This would require additional implementation to actually change the cursor color
              break;

            // Add handlers for text appearance settings
            case "changeFontSize":
              if (message.value === "DEFAULT") {
                vscode.workspace.getConfiguration("editor").update("fontSize", undefined, true);
                vscode.window.showInformationMessage("Font size reset to default");
              } else {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("fontSize", parseInt(message.value), true);
                vscode.window.showInformationMessage(`Font size set to ${message.value}`);
              }
              break;

            case "changeLetterSpacing":
              if (message.value === "DEFAULT") {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("letterSpacing", undefined, true);
                vscode.window.showInformationMessage("Letter spacing reset to default");
              } else {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("letterSpacing", parseFloat(message.value), true);
                vscode.window.showInformationMessage(`Letter spacing set to ${message.value}`);
              }
              break;

            case "changeLineHeight":
              if (message.value === "DEFAULT") {
                vscode.workspace.getConfiguration("editor").update("lineHeight", undefined, true);
                vscode.window.showInformationMessage("Line height reset to default");
              } else {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("lineHeight", parseFloat(message.value), true);
                vscode.window.showInformationMessage(`Line height set to ${message.value}`);
              }
              break;

            case "changeMaxLineWidth":
              if (message.value === "DEFAULT") {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("wordWrapColumn", undefined, true);
                vscode.workspace.getConfiguration("editor").update("wordWrap", "off", true);
                vscode.window.showInformationMessage("Line width reset to default");
              } else {
                vscode.workspace
                  .getConfiguration("editor")
                  .update("wordWrapColumn", parseInt(message.value), true);
                vscode.workspace.getConfiguration("editor").update("wordWrap", "bounded", true);
                vscode.window.showInformationMessage(`Max line width set to ${message.value}`);
              }
              break;

            // Add handlers for color overlay
            case "toggleOverlay":
              toggleColorOverlayFeature(message.enabled, message.color, message.opacity);
              break;

            case "changeOverlayColor":
              updateColorOverlay(message.color, message.opacity);
              break;

            case "changeOverlayOpacity":
              updateColorOverlay(message.color, message.opacity);
              break;

            // Add handlers for line focus
            case "toggleLineFocus":
              toggleLineFocus(message.enabled);
              break;

            default:
              console.log(`Unknown command: ${message.command}`);
              break;
          }
        } catch (error) {
          console.error(`Error processing message: ${error.message}`);
          vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
      },
      undefined,
      context.subscriptions
    );

    // Reset when the panel is closed
    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      null,
      context.subscriptions
    );
  });

  // Create a default menu file if one doesn't exist
  function createDefaultMenuFile(filePath) {
    const content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dyslexia Mitigation Tools</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        padding: 20px;
      }
      h2 {
        color: #333;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
      }
      button {
        background-color: #007acc;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 10px;
        width: 100%;
      }
      button:hover {
        background-color: #005a9e;
      }
      .option-row {
        display: flex;
        align-items: center;
        margin: 10px 0;
      }
      .option-label {
        min-width: 150px;
        margin-right: 10px;
      }
      select, input {
        padding: 5px;
        border-radius: 3px;
        border: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <h2>Dyslexia Mitigation Tools</h2>
    
    <h3>Reading Aids</h3>
    <div class="option-row">
      <label class="option-label" for="fontFamily">Font Family:</label>
      <select id="fontFamily">
        <option value="DEFAULT">System Default</option>
        <option value="OpenDyslexic">OpenDyslexic</option>
        <option value="Arial">Arial</option>
        <option value="Comic Sans MS">Comic Sans MS</option>
      </select>
    </div>
    
    <div class="option-row">
      <label class="option-label" for="fontSize">Font Size:</label>
      <select id="fontSize">
        <option value="DEFAULT">Default</option>
        <option value="14">14</option>
        <option value="16">16</option>
        <option value="18">18</option>
        <option value="20">20</option>
      </select>
    </div>
    
    <h3>Features</h3>
    <button id="dictionaryLookupButton">Dictionary Lookup</button>
    <button id="readAloudToggle">Read Text Aloud</button>
    
    <h3>Visual Aids</h3>
    <div class="option-row">
      <label class="option-label" for="lineFocus">Line Focus:</label>
      <select id="lineFocus">
        <option value="off">Off</option>
        <option value="on">On</option>
      </select>
    </div>
    
    <div class="option-row">
      <label class="option-label" for="distractionReducer">Distraction Reducer:</label>
      <select id="distractionReducer">
        <option value="off">Off</option>
        <option value="on">On</option>
      </select>
    </div>
    
    <script>
      const vscode = acquireVsCodeApi();
      
      document.getElementById("fontFamily").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "changeFont",
          font: e.target.value
        });
      });
      
      document.getElementById("fontSize").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "changeFontSize",
          value: e.target.value
        });
      });
      
      document.getElementById("dictionaryLookupButton").addEventListener("click", () => {
        vscode.postMessage({ command: "dictionaryLookup" });
      });
      
      document.getElementById("readAloudToggle").addEventListener("click", () => {
        vscode.postMessage({ command: "readAloud" });
      });
      
      document.getElementById("lineFocus").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "toggleLineFocus",
          enabled: e.target.value === "on"
        });
      });
      
      document.getElementById("distractionReducer").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "toggleDistractionReducer",
          enabled: e.target.value === "on"
        });
      });
    </script>
  </body>
</html>`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  // Function to toggle text masking without requiring active editor
  function toggleTextMaskingFeature(enabled) {
    textMaskingEnabled = enabled;
    console.log(`Text masking toggled: ${enabled}`);

    try {
      // Apply to current editor if exists
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        applyTextMasking(editor);
      }

      // Set up listeners for future editors
      if (textMaskingEnabled) {
        const changeListener = vscode.window.onDidChangeActiveTextEditor(applyTextMasking);
        const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
          applyTextMasking(event.textEditor);
        });

        context.subscriptions.push(changeListener, selectionListener);

        vscode.window.showInformationMessage("Text Masking Enabled");
      } else {
        // Clear decorations from all visible editors
        vscode.window.visibleTextEditors.forEach((editor) => {
          editor.setDecorations(textMaskingDecorationType, []);
        });
        vscode.window.showInformationMessage("Text Masking Disabled");
      }
    } catch (error) {
      console.error(`Error toggling text masking: ${error.message}`);
      vscode.window.showErrorMessage(`Error toggling text masking: ${error.message}`);
    }
  }

  // Apply text masking to an editor
  function applyTextMasking(editor) {
    if (!textMaskingEnabled || !editor) return;

    try {
      let ranges = [];
      for (let i = 0; i < editor.document.lineCount; i++) {
        if (i !== editor.selection.active.line) {
          const line = editor.document.lineAt(i);
          ranges.push(new vscode.Range(line.range.start, line.range.end));
        }
      }
      editor.setDecorations(textMaskingDecorationType, ranges);
    } catch (error) {
      console.error(`Error applying text masking: ${error.message}`);
    }
  }

  // Function to toggle color overlay without requiring active editor
  function toggleColorOverlayFeature(enabled, color, opacity) {
    try {
      if (enabled) {
        // Create or update the overlay
        updateColorOverlay(color, opacity);
        vscode.window.showInformationMessage("Color overlay enabled");
      } else {
        // Clear overlay from all visible editors
        if (overlayColorDecoration) {
          vscode.window.visibleTextEditors.forEach((editor) => {
            editor.setDecorations(overlayColorDecoration, []);
          });
          overlayColorDecoration = null;
        }
        vscode.window.showInformationMessage("Color overlay disabled");
      }
    } catch (error) {
      console.error(`Error toggling color overlay: ${error.message}`);
      vscode.window.showErrorMessage(`Error toggling color overlay: ${error.message}`);
    }
  }

  // Update overlay color and apply to all editors
  function updateColorOverlay(color, opacity) {
    try {
      // Convert hex color and opacity to RGBA format
      if (!color || !color.startsWith("#")) {
        color = "#FFFFFF"; // Default to white if invalid color
      }

      const hexColor = color.replace("#", "");
      const r = parseInt(hexColor.substr(0, 2), 16);
      const g = parseInt(hexColor.substr(2, 2), 16);
      const b = parseInt(hexColor.substr(4, 2), 16);
      const a = opacity !== undefined ? opacity : 0.2;

      // Create or recreate the decoration type
      const oldOverlay = overlayColorDecoration;
      overlayColorDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
        isWholeLine: true,
      });

      // Apply to all visible editors
      vscode.window.visibleTextEditors.forEach((editor) => {
        try {
          const ranges = [];
          for (let i = 0; i < editor.document.lineCount; i++) {
            const line = editor.document.lineAt(i);
            ranges.push(new vscode.Range(line.range.start, line.range.end));
          }
          editor.setDecorations(overlayColorDecoration, ranges);

          // Clear old decorations
          if (oldOverlay) {
            editor.setDecorations(oldOverlay, []);
          }
        } catch (innerError) {
          console.error(`Error applying overlay to editor: ${innerError.message}`);
        }
      });
    } catch (error) {
      console.error(`Error updating color overlay: ${error.message}`);
      vscode.window.showErrorMessage(`Error updating color overlay: ${error.message}`);
    }
  }

  // Function to toggle line focus without requiring active editor
  function toggleLineFocus(enabled) {
    try {
      // Clean up previous listener if exists
      if (readingGuideDisposable) {
        readingGuideDisposable.dispose();
        readingGuideDisposable = null;
      }

      // Clear existing decorations from all editors
      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(readingGuideDecorationType, []);
      });

      if (enabled) {
        // Set up new listener for selection changes
        readingGuideDisposable = vscode.window.onDidChangeTextEditorSelection((event) => {
          try {
            const editor = event.textEditor;
            if (editor) {
              let range = editor.document.lineAt(editor.selection.active.line).range;
              editor.setDecorations(readingGuideDecorationType, [range]);
            }
          } catch (error) {
            console.error(`Error updating reading guide: ${error.message}`);
          }
        });

        // Apply to current editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          try {
            let range = editor.document.lineAt(editor.selection.active.line).range;
            editor.setDecorations(readingGuideDecorationType, [range]);
          } catch (error) {
            console.error(`Error applying initial reading guide: ${error.message}`);
          }
        }

        vscode.window.showInformationMessage("Line Focus Enabled");
      } else {
        vscode.window.showInformationMessage("Line Focus Disabled");
      }
    } catch (error) {
      console.error(`Error toggling line focus: ${error.message}`);
      vscode.window.showErrorMessage(`Error toggling line focus: ${error.message}`);
    }
  }

  // Dictionary lookup function
  function dictionaryLookup() {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active text editor");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showInformationMessage("Please select a word to look up");
        return;
      }

      const word = text.trim();
      const uri = vscode.Uri.parse(`https://www.dictionary.com/browse/${encodeURIComponent(word)}`);
      vscode.env.openExternal(uri);
    } catch (error) {
      console.error(`Error looking up dictionary: ${error.message}`);
      vscode.window.showErrorMessage(`Error looking up dictionary: ${error.message}`);
    }
  }

  // Register command to change font size
  let setFontSize = vscode.commands.registerCommand(
    "dyslexia-mitigation.setFontSize",
    async function () {
      const input = await vscode.window.showInputBox({ prompt: "Enter font size (e.g., 16)" });
      if (input) {
        vscode.workspace.getConfiguration("editor").update("fontSize", parseInt(input), true);
        vscode.window.showInformationMessage(`Font size set to ${input}`);
      }
    }
  );

  // Register command to change font family
  let setFontFamily = vscode.commands.registerCommand(
    "dyslexia-mitigation.setFontFamily",
    async function () {
      const input = await vscode.window.showInputBox({
        prompt: "Enter font family (e.g., Arial, Verdana)",
      });
      if (input) {
        vscode.workspace.getConfiguration("editor").update("fontFamily", input, true);
        vscode.window.showInformationMessage(`Font family set to ${input}`);
      }
    }
  );

  // Register command to change line spacing
  let setLineSpacing = vscode.commands.registerCommand(
    "dyslexia-mitigation.setLineSpacing",
    async function () {
      const input = await vscode.window.showInputBox({ prompt: "Enter line height (e.g., 1.5)" });
      if (input) {
        vscode.workspace.getConfiguration("editor").update("lineHeight", parseFloat(input), true);
        vscode.window.showInformationMessage(`Line spacing set to ${input}`);
      }
    }
  );

  // text to speech Assistance
  let textToSpeech = vscode.commands.registerCommand(
    "dyslexia-mitigation.textToSpeech",
    async function () {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active text editor");
          return;
        }

        const text = editor.document.getText(editor.selection);
        if (!text) {
          vscode.window.showInformationMessage("No text selected");
          return;
        }

        const uri = vscode.Uri.parse(
          `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            text
          )}&tl=en&client=tw-ob`
        );
        vscode.env.openExternal(uri);
      } catch (error) {
        console.error(`Error with text to speech: ${error.message}`);
        vscode.window.showErrorMessage(`Error with text to speech: ${error.message}`);
      }
    }
  );

  // Reading Guide Commands
  let enableReadingGuide = vscode.commands.registerCommand(
    "dyslexia-mitigation.enableReadingGuide",
    function () {
      toggleLineFocus(true);
    }
  );

  let disableReadingGuide = vscode.commands.registerCommand(
    "dyslexia-mitigation.disableReadingGuide",
    function () {
      toggleLineFocus(false);
    }
  );

  // Text Masking Command
  let toggleTextMasking = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleTextMasking",
    function () {
      toggleTextMaskingFeature(!textMaskingEnabled);
    }
  );

  // Cursor Tracking Command
  let toggleCursorTracking = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleCursorTracking",
    function () {
      cursorTrackingEnabled = !cursorTrackingEnabled;
      vscode.workspace
        .getConfiguration("editor")
        .update("cursorStyle", cursorTrackingEnabled ? "block" : "line", true);
      vscode.workspace
        .getConfiguration("editor")
        .update("cursorBlinking", cursorTrackingEnabled ? "phase" : "solid", true);
      vscode.window.showInformationMessage(
        cursorTrackingEnabled ? "Cursor Tracking Enabled" : "Cursor Tracking Disabled"
      );
    }
  );

  // Color Overlay Command - renamed to avoid conflict with function name
  let toggleColorOverlayCommand = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleColorOverlay",
    async function () {
      try {
        const isEnabled = overlayColorDecoration !== null;

        if (!isEnabled) {
          const colorPick = await vscode.window.showInputBox({
            prompt: "Enter overlay color (e.g., #RRGGBB)",
            placeHolder: "#FFFFFF",
            validateInput: (text) => {
              return /^#[0-9A-Fa-f]{6}$/.test(text)
                ? null
                : "Please enter a valid hex color (e.g., #FFFFFF)";
            },
          });

          if (colorPick) {
            const opacity = await vscode.window.showInputBox({
              prompt: "Enter opacity (0.0 - 1.0)",
              placeHolder: "0.2",
              validateInput: (text) => {
                const num = parseFloat(text);
                return isNaN(num) || num < 0 || num > 1
                  ? "Please enter a number between 0.0 and 1.0"
                  : null;
              },
            });

            if (opacity !== undefined) {
              toggleColorOverlayFeature(true, colorPick, parseFloat(opacity));
            }
          }
        } else {
          toggleColorOverlayFeature(false);
        }
      } catch (error) {
        console.error(`Error toggling color overlay command: ${error.message}`);
        vscode.window.showErrorMessage(`Error toggling color overlay: ${error.message}`);
      }
    }
  );

  // Register commands
  context.subscriptions.push(
    showMenu,
    setFontSize,
    setFontFamily,
    setLineSpacing,
    textToSpeech,
    enableReadingGuide,
    disableReadingGuide,
    toggleTextMasking,
    toggleCursorTracking,
    toggleColorOverlayCommand
  );

  // Add better error handling
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    vscode.window.showErrorMessage(`Extension error: ${error.message}`);
  });
}

/**
 * This method is called when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
