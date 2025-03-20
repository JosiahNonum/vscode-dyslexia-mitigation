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

    // TODO: still in progress , command is not showing up in the command palette
    // attempting to use npm install syllable, probably need to add a plugin
    // Syllable breakdown command

    let syllableBreakdown = vscode.commands.registerCommand('dyslexia-mitigation.syllableBreakdown', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor.');
            return;
        }

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        
        if (!text) {
            vscode.window.showErrorMessage('No text selected.');
            return;
        }

        // Simple syllable breakdown (for demonstration purposes)
        const syllabifiedText = text.replace(/([aeiouy]+)/gi, '-$1');

        editor.edit(editBuilder => {
            editBuilder.replace(selection, syllabifiedText);
        });

        vscode.window.showInformationMessage('Syllables Added to Selected Text');
    });

    
// TODO: still implementing the following features, need to add the logic for each feature, and test
// if the commands can work without plugin

let enableReadingGuide = vscode.commands.registerCommand('dyslexia-mitigation.enableReadingGuide', function () {
    vscode.window.showInformationMessage('Reading Guide Enabled');
    // Implement the reading guide overlay logic here
});

// Disable Reading Guide
let disableReadingGuide = vscode.commands.registerCommand('dyslexia-mitigation.disableReadingGuide', function () {
    vscode.window.showInformationMessage('Reading Guide Disabled');
    // Remove overlay logic here
});

// Toggle Text Masking (e.g., hides text except for a focused area)
let toggleTextMasking = vscode.commands.registerCommand('dyslexia-mitigation.toggleTextMasking', function () {
    vscode.window.showInformationMessage('Toggled Text Masking');
    // Implement text masking effect here
});

// Toggle Cursor Tracking (e.g., modifies cursor size/color or adds tracking effect)
let toggleCursorTracking = vscode.commands.registerCommand('dyslexia-mitigation.toggleCursorTracking', function () {
    vscode.window.showInformationMessage('Toggled Cursor Tracking');
    // Implement cursor tracking effect here
});

    context.subscriptions.push(setFontSize, setFontFamily, setLineSpacing, textToSpeech, syllableBreakdown, enableReadingGuide, disableReadingGuide, toggleTextMasking, toggleCursorTracking);
}

/**
 * This method is called when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
