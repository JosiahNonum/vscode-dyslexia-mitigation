const vscode = require('vscode');

// Added commands onto this extension.js file

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Dyslexia Mitigation extension is now active!');

    // Register command to change font size
    let setFontSize = vscode.commands.registerCommand('dyslexia-mitigation.setFontSize', async function () {
        const input = await vscode.window.showInputBox({ prompt: 'Enter font size (e.g., 16)' });
        if (input) {
            vscode.workspace.getConfiguration('editor').update('fontSize', parseInt(input), true);
            vscode.window.showInformationMessage(`Font size set to ${input}`);
        }
    });

    // Register command to change font family
    let setFontFamily = vscode.commands.registerCommand('dyslexia-mitigation.setFontFamily', async function () {
        const input = await vscode.window.showInputBox({ prompt: 'Enter font family (e.g., Arial, Verdana)' });
        if (input) {
            vscode.workspace.getConfiguration('editor').update('fontFamily', input, true);
            vscode.window.showInformationMessage(`Font family set to ${input}`);
        }
    });

    // Register command to change line spacing
    let setLineSpacing = vscode.commands.registerCommand('dyslexia-mitigation.setLineSpacing', async function () {
        const input = await vscode.window.showInputBox({ prompt: 'Enter line height (e.g., 1.5)' });
        if (input) {
            vscode.workspace.getConfiguration('editor').update('lineHeight', parseFloat(input), true);
            vscode.window.showInformationMessage(`Line spacing set to ${input}`);
        }
    });
    // text to speech Assitance
    let textToSpeech = vscode.commands.registerCommand('dyslexia-mitigation.textToSpeech', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        const text = editor.document.getText(editor.selection);
        if (!text) {
            vscode.window.showInformationMessage('No text selected');
            return;
        }
        const uri = vscode.Uri.parse(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`);
        vscode.env.openExternal(uri);
    });
       


    let readingGuideDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.3)'
    });
    
    // Add a variable to store the listener
    let readingGuideListener = null;
    
    let enableReadingGuide = vscode.commands.registerCommand('dyslexia-mitigation.enableReadingGuide', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        
        let highlightLine = () => {
            if (!editor) return;
            let range = editor.document.lineAt(editor.selection.active.line).range;
            editor.setDecorations(readingGuideDecorationType, [range]);
        };
        
        // Clear existing listener before creating a new one
        if (readingGuideListener) {
            readingGuideListener.dispose();
        }
        
        // Store the new listener
        readingGuideListener = vscode.window.onDidChangeTextEditorSelection(highlightLine);
        highlightLine();
        vscode.window.showInformationMessage('Reading Guide Enabled');
    });
    
    let disableReadingGuide = vscode.commands.registerCommand('dyslexia-mitigation.disableReadingGuide', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active text editor');
            return;
        }
        
        // Clear decorations AND dispose the listener
        editor.setDecorations(readingGuideDecorationType, []);
        if (readingGuideListener) {
            readingGuideListener.dispose();
            readingGuideListener = null;
        }
        
        vscode.window.showInformationMessage('Reading Guide Disabled');
    });


let textMaskingDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(6, 6, 7, 0.5)',  
    color: 'black',  
    fontWeight: 'normal',  
});

let textMaskingEnabled = false;

let toggleTextMasking = vscode.commands.registerCommand('dyslexia-mitigation.toggleTextMasking', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active text editor');
        return;
    }

    textMaskingEnabled = !textMaskingEnabled;

    if (textMaskingEnabled) {
        let ranges = [];
        for (let i = 0; i < editor.document.lineCount; i++) {
            if (i !== editor.selection.active.line) {  
                const line = editor.document.lineAt(i);
                ranges.push(new vscode.Range(line.range.start, line.range.end));  
            }
        }

        editor.setDecorations(textMaskingDecorationType, ranges);
        vscode.window.showInformationMessage('Text Masking Enabled');
    } else {
        editor.setDecorations(textMaskingDecorationType, []);
        vscode.window.showInformationMessage('Text Masking Disabled');
    }
});


let cursorTrackingDecorationType = vscode.window.createTextEditorDecorationType({
    border: '2px solid blue',  
    backgroundColor: 'rgba(0, 0, 255, 0.2)',
    borderRadius: '2px'
});

let fadeOutTextDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'white' 
});

let cursorTrackingEnabled = false;
let cursorTrackingListener = null;

let toggleCursorTracking = vscode.commands.registerCommand('dyslexia-mitigation.toggleCursorTracking', function () {
    cursorTrackingEnabled = !cursorTrackingEnabled;
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showInformationMessage('No active text editor');
        return;
    }

    if (cursorTrackingEnabled) {
        let highlightWord = () => {
            if (!editor) return;

            const position = editor.selection.active;
            const lineText = editor.document.lineAt(position.line).text;

           
            const wordRegex = /[a-zA-Z0-9_]+/g;  
            const symbolRegex = /[^\s\w]/g;       
            let wordRange = null;

            
            let match;
            while ((match = wordRegex.exec(lineText)) !== null) {
                if (position.character >= match.index && position.character <= match.index + match[0].length) {
                    wordRange = new vscode.Range(
                        new vscode.Position(position.line, match.index),
                        new vscode.Position(position.line, match.index + match[0].length)
                    );
                    break;
                }
            }

           
            if (!wordRange) {
                while ((match = symbolRegex.exec(lineText)) !== null) {
                    if (position.character === match.index) {
                        wordRange = new vscode.Range(
                            new vscode.Position(position.line, match.index),
                            new vscode.Position(position.line, match.index + match[0].length)
                        );
                        break;
                    }
                }
            }

            
            if (!wordRange) {
                wordRange = new vscode.Range(position, position.translate(0, 1));
            }

            editor.setDecorations(cursorTrackingDecorationType, [wordRange]);

            
            let fadeOutRanges = [];

            for (let i = 0; i < editor.document.lineCount; i++) {
                const line = editor.document.lineAt(i);
                for (let j = 0; j < line.text.length; j++) {
                    let charPos = new vscode.Position(i, j);
                    let charRange = new vscode.Range(charPos, charPos.translate(0, 1));

                    if (!wordRange.contains(charPos)) {
                        fadeOutRanges.push(charRange);
                    }
                }
            }

            editor.setDecorations(fadeOutTextDecorationType, fadeOutRanges);
        };

        
        if (cursorTrackingListener) {
            cursorTrackingListener.dispose();
        }

        cursorTrackingListener = vscode.window.onDidChangeTextEditorSelection(highlightWord);
        highlightWord();

        vscode.window.showInformationMessage('Cursor Tracking Enabled');
    } else {
        
        editor.setDecorations(cursorTrackingDecorationType, []);
        editor.setDecorations(fadeOutTextDecorationType, []);

        if (cursorTrackingListener) {
            cursorTrackingListener.dispose();
            cursorTrackingListener = null;
        }

        vscode.window.showInformationMessage('Cursor Tracking Disabled');
    }
});

// Register command to toggle color overlay
let colorOverlayDecoration = vscode.window.createTextEditorDecorationType({
    color: 'rgb(0, 255, 30)' // Changes text color to orange-red
});

// This variable will track the state of the color overlay
let colorOverlayEnabled = false;

let toggleColorOverlay = vscode.commands.registerCommand('dyslexia-mitigation.toggleColorOverlay', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active text editor');
        return;
    }

    colorOverlayEnabled = !colorOverlayEnabled;

    if (colorOverlayEnabled) {
        let ranges = [new vscode.Range(0, 0, editor.document.lineCount, 0)];
        editor.setDecorations(colorOverlayDecoration, ranges);
        vscode.window.showInformationMessage('Color Overlay Enabled');
    } else {
        editor.setDecorations(colorOverlayDecoration, []);
        vscode.window.showInformationMessage('Color Overlay Disabled');
    }
});

// Register command to toggle theme background
let toggleThemeBackground = vscode.commands.registerCommand('dyslexia-mitigation.toggleThemeBackground', async function () {
    const config = vscode.workspace.getConfiguration("workbench");

    // Define overlay color
    const overlayColor = "#000000"; // Light yellow
    let currentColors = config.get("colorCustomizations") || {};
    let currentBackground = currentColors["editor.background"];

    // Toggle background color
    let newColors = { ...currentColors, "editor.background": currentBackground ? undefined : overlayColor };

    // Apply update
    await config.update("colorCustomizations", newColors, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(currentBackground ? "Theme Overlay Disabled" : "Theme Overlay Enabled");
});



context.subscriptions.push(setFontSize, setFontFamily, setLineSpacing, textToSpeech, enableReadingGuide, disableReadingGuide, toggleTextMasking, toggleCursorTracking, toggleColorOverlay, toggleThemeBackground);
}

/**
 * This method is called when the extension is deactivated.
 */

function deactivate() {}

module.exports = {
    activate,
    deactivate
};