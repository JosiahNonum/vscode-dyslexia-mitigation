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
    
    vscode.window.onDidChangeTextEditorSelection(highlightLine);
    highlightLine();
    vscode.window.showInformationMessage('Reading Guide Enabled');
});

let disableReadingGuide = vscode.commands.registerCommand('dyslexia-mitigation.disableReadingGuide', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active text editor');
        return;
    }
    editor.setDecorations(readingGuideDecorationType, []);
    vscode.window.showInformationMessage('Reading Guide Disabled');
});


let textMaskingDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
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

let cursorTrackingEnabled = false;

let toggleCursorTracking = vscode.commands.registerCommand('dyslexia-mitigation.toggleCursorTracking', function () {
    cursorTrackingEnabled = !cursorTrackingEnabled;
    vscode.workspace.getConfiguration('editor').update('cursorStyle', cursorTrackingEnabled ? 'block' : 'line', true);
    vscode.workspace.getConfiguration('editor').update('cursorBlinking', cursorTrackingEnabled ? 'phase' : 'solid', true);
    vscode.window.showInformationMessage(cursorTrackingEnabled ? 'Cursor Tracking Enabled' : 'Cursor Tracking Disabled');
});

context.subscriptions.push(setFontSize, setFontFamily, setLineSpacing, textToSpeech, enableReadingGuide, disableReadingGuide, toggleTextMasking, toggleCursorTracking);
}

/**
 * This method is called when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};