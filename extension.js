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
      "ADHD Productivity Toolkit",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Get path to menu.html
    const menuPath = path.join(context.extensionPath, "webview", "menu.html");

    // Read HTML file content
    let menuContent;
    try {
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
        switch (message.command) {
          case "startPomodoro":
            vscode.window.showInformationMessage(
              `Starting Pomodoro timer for ${message.minutes} minutes`
            );
            // Implement pomodoro timer functionality here
            break;

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
              vscode.workspace.getConfiguration("editor").update("fontFamily", message.font, true);
              vscode.window.showInformationMessage(`Font changed to ${message.font}`);
            }
            break;

          case "syllableSplit":
            vscode.commands.executeCommand("dyslexia-mitigation.syllableBreakdown");
            break;

          case "geminiShorten":
            vscode.window.showInformationMessage("Gemini shortening feature not yet implemented");
            break;

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
              vscode.workspace.getConfiguration("editor").update("letterSpacing", undefined, true);
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
              vscode.workspace.getConfiguration("editor").update("wordWrapColumn", undefined, true);
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
            toggleColorOverlay(message.enabled, message.color, message.opacity);
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

  // Function to toggle text masking without requiring active editor
  function toggleTextMaskingFeature(enabled) {
    textMaskingEnabled = enabled;

    // Apply to current editor if exists
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      applyTextMasking(editor);
    }

    // Set up listeners for future editors
    if (textMaskingEnabled) {
      vscode.window.onDidChangeActiveTextEditor(applyTextMasking);
      vscode.window.onDidChangeTextEditorSelection(applyTextMasking);
      vscode.window.showInformationMessage("Text Masking Enabled");
    } else {
      // Clear decorations from all visible editors
      vscode.window.visibleTextEditors.forEach((editor) => {
        editor.setDecorations(textMaskingDecorationType, []);
      });
      vscode.window.showInformationMessage("Text Masking Disabled");
    }
  }

  // Apply text masking to an editor
  function applyTextMasking(editor) {
    if (!textMaskingEnabled || !editor) return;

    let ranges = [];
    for (let i = 0; i < editor.document.lineCount; i++) {
      if (i !== editor.selection.active.line) {
        const line = editor.document.lineAt(i);
        ranges.push(new vscode.Range(line.range.start, line.range.end));
      }
    }
    editor.setDecorations(textMaskingDecorationType, ranges);
  }

  // Function to toggle color overlay without requiring active editor
  function toggleColorOverlay(enabled, color, opacity) {
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
      }
      vscode.window.showInformationMessage("Color overlay disabled");
    }
  }

  // Update overlay color and apply to all editors
  function updateColorOverlay(color, opacity) {
    // Convert hex color and opacity to RGBA format
    const hexColor = color.replace("#", "");
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    const a = opacity;

    // Create or recreate the decoration type
    const oldOverlay = overlayColorDecoration;
    overlayColorDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
      isWholeLine: true,
    });

    // Apply to all visible editors
    vscode.window.visibleTextEditors.forEach((editor) => {
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
    });
  }

  // Function to toggle line focus without requiring active editor
  function toggleLineFocus(enabled) {
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
        const editor = event.textEditor;
        if (editor) {
          let range = editor.document.lineAt(editor.selection.active.line).range;
          editor.setDecorations(readingGuideDecorationType, [range]);
        }
      });

      // Apply to current editor
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        let range = editor.document.lineAt(editor.selection.active.line).range;
        editor.setDecorations(readingGuideDecorationType, [range]);
      }

      vscode.window.showInformationMessage("Line Focus Enabled");
    } else {
      vscode.window.showInformationMessage("Line Focus Disabled");
    }
  }

  // Dictionary lookup function
  function dictionaryLookup() {
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
    }
  );

  function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Basic syllable counting rules
    word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  // Syllable Breakdown Command
  let syllableBreakdown = vscode.commands.registerCommand(
    "dyslexia-mitigation.syllableBreakdown",
    function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active text editor.");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text) {
        vscode.window.showErrorMessage("No text selected.");
        return;
      }

      try {
        const words = text.split(/\s+/);
        const syllabifiedText = words
          .map((word) => {
            if (word.match(/[^a-zA-Z]/)) return word;
            const syllables = countSyllables(word);
            if (syllables > 1) {
              // Simple hyphenation between vowel groups
              return word.replace(/([aeiouy]+)/gi, "$1-").replace(/-$/, "");
            }
            return word;
          })
          .join(" ");

        editor.edit((editBuilder) => {
          editBuilder.replace(selection, syllabifiedText);
        });

        vscode.window.showInformationMessage("Syllables added to selected text.");
      } catch (error) {
        console.error("Error processing syllables:", error);
        vscode.window.showErrorMessage("Failed to process syllables.");
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

  // Color Overlay Command
  let toggleColorOverlay = vscode.commands.registerCommand(
    "dyslexia-mitigation.toggleColorOverlay",
    async function () {
      const isEnabled = overlayColorDecoration !== null;

      if (!isEnabled) {
        const colorPick = await vscode.window.showInputBox({
          prompt: "Enter overlay color (e.g., #RRGGBB)",
          placeHolder: "#FFFFFF",
        });

        if (colorPick) {
          const opacity = await vscode.window.showInputBox({
            prompt: "Enter opacity (0.0 - 1.0)",
            placeHolder: "0.2",
          });

          if (opacity !== undefined) {
            toggleColorOverlay(true, colorPick, parseFloat(opacity));
          }
        }
      } else {
        toggleColorOverlay(false);
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
    syllableBreakdown,
    enableReadingGuide,
    disableReadingGuide,
    toggleTextMasking,
    toggleCursorTracking,
    toggleColorOverlay
  );
}

/**
 * This method is called when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
