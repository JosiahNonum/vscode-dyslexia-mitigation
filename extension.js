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
  let cursorTrackingEnabled = false;

  let currentTrackingColor = 'blue';
  let currentLineFocusColor = 'yellow';


  function getRgbaColor(color) {
    switch(color) {
      case 'blue':
        return 'rgba(0, 0, 255, 0.3)';
      case 'green':
        return 'rgba(0, 255, 0, 0.3)';
      case 'red':
        return 'rgba(255, 0, 0, 0.3)';
      case 'yellow':
        return 'rgba(255, 255, 0, 0.3)';
      case 'purple':
        return 'rgba(128, 0, 128, 0.3)';
      default:
        return 'rgba(0, 0, 255, 0.3)';
    }
  }

  function createCursorTrackingDecorationType(color) {
    currentTrackingColor = color;
    const rgbaColor = getRgbaColor(color);
    return vscode.window.createTextEditorDecorationType({
      backgroundColor: rgbaColor,
      border: `1px solid ${color}`
    });
  }

  function createTextMaskingDecorationType() {
    return vscode.window.createTextEditorDecorationType({
      color: 'rgba(0, 0, 0, 0)', // black text
      backgroundColor: 'rgba(0, 0, 0, 1)', //solid black background
      opacity: '1'
    });
  }

  //TODO: api key implementation
/*
function apikey(){|
current api:"Link"
Purpo

}
*/

  function createReadingGuideDecorationType(color) {
    currentLineFocusColor = color;
    switch(color) {
      case 'yellow':
        return vscode.window.createTextEditorDecorationType({
          backgroundColor: "rgba(255, 255, 0, 0.3)",
        });
      case 'blue':
        return vscode.window.createTextEditorDecorationType({
          backgroundColor: "rgba(0, 0, 255, 0.3)",
        });
      case 'green':
        return vscode.window.createTextEditorDecorationType({
          backgroundColor: "rgba(0, 255, 0, 0.3)",
        });
      case 'pink':
        return vscode.window.createTextEditorDecorationType({
          backgroundColor: "rgba(255, 105, 180, 0.3)",
        });
      default:
        return vscode.window.createTextEditorDecorationType({
          backgroundColor: "rgba(255, 255, 0, 0.3)",
        });
    }
  }

  // Create decoration types with updated distraction reducer settings
  let textMaskingDecorationType = createTextMaskingDecorationType();
  let readingGuideDecorationType = createReadingGuideDecorationType(currentLineFocusColor);
  let cursorTrackingDecorationType = createCursorTrackingDecorationType(currentTrackingColor);

  // Register command to show menu panel
  let showMenu = vscode.commands.registerCommand("dyslexia-mitigation.showMenu", () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }

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

    const menuPath = path.join(context.extensionPath, "webview", "menu.html");
    console.log(`Loading menu from: ${menuPath}`);

    let menuContent;
    try {
      if (!fs.existsSync(menuPath)) {
        vscode.window.showErrorMessage(`Menu file not found at path: ${menuPath}`);
        const webviewDir = path.join(context.extensionPath, "webview");
        if (!fs.existsSync(webviewDir)) {
          fs.mkdirSync(webviewDir);
        }
        createDefaultMenuFile(menuPath);
        vscode.window.showInformationMessage(`Created default menu file at: ${menuPath}`);
      }

      menuContent = fs.readFileSync(menuPath, "utf8");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load menu: ${error.message}`);
      return;
    }

    currentPanel.webview.html = menuContent;

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

            case "toggleDistractionReducer":
              toggleTextMaskingFeature(message.enabled);
              break;

            case "toggleTrackingAid":
              cursorTrackingEnabled = message.enabled;
              if (cursorTrackingEnabled) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                  updateCursorTrackingDecorations(editor);
                }
                context.subscriptions.push(
                  vscode.window.onDidChangeTextEditorSelection(event => {
                    updateCursorTrackingDecorations(event.textEditor);
                  })
                );
                vscode.window.showInformationMessage("Cursor Tracking Enabled - Selected words highlighted");
              } else {
                vscode.window.visibleTextEditors.forEach(editor => {
                  editor.setDecorations(cursorTrackingDecorationType, []);
                  editor.setDecorations(textMaskingDecorationType, []);
                });
                vscode.window.showInformationMessage("Cursor Tracking Disabled");
              }
              break;

            case "changeTrackingAidColor":
              cursorTrackingDecorationType.dispose();
              cursorTrackingDecorationType = createCursorTrackingDecorationType(message.color);
              if (cursorTrackingEnabled) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                  updateCursorTrackingDecorations(editor);
                }
              }
              vscode.window.showInformationMessage(`Tracking aid color set to ${message.color}`);
              break;

            case "changeLineFocusColor":
              readingGuideDecorationType.dispose();
              readingGuideDecorationType = createReadingGuideDecorationType(message.color);
              if (readingGuideDisposable) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                  let range = editor.document.lineAt(editor.selection.active.line).range;
                  editor.setDecorations(readingGuideDecorationType, [range]);
                }
              }
              vscode.window.showInformationMessage(`Line focus color set to ${message.color}`);
              break;

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

            case "toggleOverlay":
              toggleColorOverlayFeature(message.enabled, message.color, message.opacity);
              break;

            case "changeOverlayColor":
              updateColorOverlay(message.color, message.opacity);
              break;

            case "changeOverlayOpacity":
              updateColorOverlay(message.color, message.opacity);
              break;

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

    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      null,
      context.subscriptions
    );
  });

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
      <label class="option-label" for="lineFocusColor">Line Focus Color:</label>
      <select id="lineFocusColor">
        <option value="yellow">Yellow</option>
        <option value="blue">Blue</option>
        <option value="green">Green</option>
        <option value="pink">Pink</option>
      </select>
    </div>
    
    <div class="option-row">
      <label class="option-label" for="distractionReducer">Distraction Reducer:</label>
      <select id="distractionReducer">
        <option value="off">Off</option>
        <option value="on">On</option>
      </select>
    </div>

    <div class="option-row">
      <label class="option-label" for="trackingColor">Cursor Tracking Color:</label>
      <select id="trackingColor">
        <option value="blue">Blue</option>
        <option value="green">Green</option>
        <option value="red">Red</option>
        <option value="yellow">Yellow</option>
        <option value="purple">Purple</option>
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

      document.getElementById("lineFocusColor").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "changeLineFocusColor",
          color: e.target.value
        });
      });
      
      document.getElementById("distractionReducer").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "toggleDistractionReducer",
          enabled: e.target.value === "on"
        });
      });

      document.getElementById("trackingColor").addEventListener("change", (e) => {
        vscode.postMessage({
          command: "changeTrackingAidColor",
          color: e.target.value
        });
      });
    </script>
  </body>
</html>`;

    fs.writeFileSync(filePath, content, "utf8");
  }

  function toggleTextMaskingFeature(enabled) {
    textMaskingEnabled = enabled;
    console.log(`Text masking toggled: ${enabled}`);

    try {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        applyTextMasking(editor);
      }

      if (textMaskingEnabled) {
        const changeListener = vscode.window.onDidChangeActiveTextEditor(applyTextMasking);
        const selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
          applyTextMasking(event.textEditor);
        });

        context.subscriptions.push(changeListener, selectionListener);

        vscode.window.showInformationMessage("Distraction Reducer Enabled");
      } else {
        vscode.window.visibleTextEditors.forEach((editor) => {
          editor.setDecorations(textMaskingDecorationType, []);
        });
        vscode.window.showInformationMessage("Distraction Reducer Disabled");
      }
    } catch (error) {
      console.error(`Error toggling text masking: ${error.message}`);
      vscode.window.showErrorMessage(`Error toggling text masking: ${error.message}`);
    }
  }

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

  function toggleColorOverlayFeature(enabled, color, opacity) {
    try {
      if (enabled) {
        updateColorOverlay(color, opacity);
        vscode.window.showInformationMessage("Color overlay enabled");
      } else {
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

  function updateColorOverlay(color, opacity) {
    try {
      if (!color || !color.startsWith("#")) {
        color = "#FFFFFF";
      }

      const hexColor = color.replace("#", "");
      const r = parseInt(hexColor.substr(0, 2), 16);
      const g = parseInt(hexColor.substr(2, 2), 16);
      const b = parseInt(hexColor.substr(4, 2), 16);
      const a = opacity !== undefined ? opacity : 0.2;

      const oldOverlay = overlayColorDecoration;
      overlayColorDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
        isWholeLine: true,
      });

      vscode.window.visibleTextEditors.forEach((editor) => {
        try {
          const ranges = [];
          for (let i = 0; i < editor.document.lineCount; i++) {
            const line = editor.document.lineAt(i);
            ranges.push(new vscode.Range(line.range.start, line.range.end));
          }
          editor.setDecorations(overlayColorDecoration, ranges);

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

  function toggleLineFocus(enabled) {
    try {
      if (readingGuideDisposable) {
        readingGuideDisposable.dispose();
        readingGuideDisposable = null;
      }

      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(readingGuideDecorationType, []);
      });

      if (enabled) {
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

  function updateCursorTrackingDecorations(editor) {
    if (!cursorTrackingEnabled || !editor) return;

    try {
      const selection = editor.selection;
      let highlightRange;
      
      if (selection.isEmpty) {
        highlightRange = editor.document.getWordRangeAtPosition(selection.active);
      } else {
        highlightRange = new vscode.Range(selection.start, selection.end);
      }
      
      if (highlightRange) {
        // Set the cursor tracking decoration
        editor.setDecorations(cursorTrackingDecorationType, [highlightRange]);
        
        // Create ranges for all text except the highlighted portion
        const fullRange = new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(editor.document.lineCount, 0)
        );
        
        // Create a range that excludes the highlighted portion
        const ranges = [];
        
        // Add range before the highlight
        if (highlightRange.start.line > 0) {
          ranges.push(new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(highlightRange.start.line, 0)
          ));
        }
        
        // Add lines before the highlight on the same line
        if (highlightRange.start.character > 0) {
          ranges.push(new vscode.Range(
            new vscode.Position(highlightRange.start.line, 0),
            highlightRange.start
          ));
        }
        
        // Add lines after the highlight on the same line
        const line = editor.document.lineAt(highlightRange.end.line);
        if (highlightRange.end.character < line.text.length) {
          ranges.push(new vscode.Range(
            highlightRange.end,
            new vscode.Position(highlightRange.end.line, line.text.length)
          ));
        }
        
        // Add range after the highlight
        if (highlightRange.end.line < editor.document.lineCount - 1) {
          ranges.push(new vscode.Range(
            new vscode.Position(highlightRange.end.line + 1, 0),
            new vscode.Position(editor.document.lineCount, 0)
          ));
        }
        
        // Apply white text decoration to all other text
        editor.setDecorations(textMaskingDecorationType, ranges);
      } else {
        // If no highlight range, white out everything
        const fullRange = new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(editor.document.lineCount, 0)
        );
        editor.setDecorations(textMaskingDecorationType, [fullRange]);
        editor.setDecorations(cursorTrackingDecorationType, []);
      }
    } catch (error) {
      console.error(`Error updating cursor tracking decorations: ${error.message}`);
    }
  }

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

  let toggleTextMasking = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleTextMasking",
    function () {
      toggleTextMaskingFeature(!textMaskingEnabled);
    }
  );

  let toggleCursorTracking = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleCursorTracking",
    function () {
      cursorTrackingEnabled = !cursorTrackingEnabled;
      
      if (cursorTrackingEnabled) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          updateCursorTrackingDecorations(editor);
        }
        
        context.subscriptions.push(
          vscode.window.onDidChangeTextEditorSelection(event => {
            updateCursorTrackingDecorations(event.textEditor);
          })
        );
        
        vscode.window.showInformationMessage("Cursor Tracking Enabled - Selected words highlighted");
      } else {
        vscode.window.visibleTextEditors.forEach(editor => {
          editor.setDecorations(cursorTrackingDecorationType, []);
          editor.setDecorations(textMaskingDecorationType, []);
        });
        vscode.window.showInformationMessage("Cursor Tracking Disabled");
      }
    }
  );

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

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    vscode.window.showErrorMessage(`Extension error: ${error.message}`);
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};