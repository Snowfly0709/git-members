// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitmembers" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const ikunCommand = vscode.commands.registerCommand('gitmembers.ikun', () => {
		vscode.window.showInformationMessage('You are ikun!');
	});
	context.subscriptions.push(ikunCommand);

	const disposable = vscode.commands.registerCommand('gitmembers.showGitBlame', async () => {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Open a file to use this command.');
            return;
        }

        const filePath = editor.document.fileName;
        try {
            // Run git blame on the entire file
            const blameOutput = await gitBlame(filePath);
            if (blameOutput) {
                // Show the blame results in a new window
                showBlameResults(blameOutput, editor.document);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to run git blame: ${err.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// Run git blame on the whole file
async function gitBlame(filePath: string): Promise<string> {
    const blameCommand = `git blame --porcelain ${path.basename(filePath)}`;

    return new Promise((resolve, reject) => {
        exec(blameCommand, { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// Parse git blame output and display in a new text editor
function showBlameResults(blameOutput: string, document: vscode.TextDocument) {
    // Split the blame output into lines
    const blameLines = blameOutput.split('\n').filter(line => line.startsWith('author '));

    const blameInfo: { [key: number]: string } = {};
    let lineNumber = 0;

    // Match each author line with a line number
    for (let i = 0; i < blameLines.length; i++) {
        if (blameLines[i].startsWith('author ')) {
            blameInfo[lineNumber] = blameLines[i].replace('author ', '');
            lineNumber++;
        }
    }

    // Prepare the content with blame info
    let content = '';
    for (let i = 0; i < document.lineCount; i++) {
        const lineContent = document.lineAt(i).text;
        const author = blameInfo[i] || 'Unknown';
        content += `${author.padEnd(20)} | ${lineContent}\n`;
    }

    // Open a new text document to show the blame results
    vscode.workspace.openTextDocument({ content, language: 'plaintext' }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
