const vscode = require('vscode');

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

    context.subscriptions.push(setFontSize, setFontFamily, setLineSpacing);
}

/**
 * This method is called when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
