// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

// 延时函数
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Open a file to use this command.');
            return;
        }

        const filePath = editor.document.fileName;
        try {
            // Get the blame information for the whole file
            const blameOutput = await getBlameForFile(filePath);
            if (blameOutput) {
                // Show the blame results in a new window
                showBlameResults(blameOutput, editor.document);
            }
        } catch (err: unknown) {
            const errorMessage = (err as Error).message || 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run git blame: ${errorMessage}`);
        }
    });

    // 监听悬停事件
    vscode.window.onDidChangeTextEditorSelection(async (event) => {
        const editor = event.textEditor;
        const selectedLine = editor.selection.active.line;

        // 延迟3秒，确保用户在此行悬停超过3秒
        await delay(3000);

        // 获取悬停行的作者
        const blameOutput = await getBlameForFile(editor.document.fileName);
        const author = blameOutput[selectedLine];

        if (author) {
            // 根据作者设置代码行的透明度
            highlightByAuthor(editor, blameOutput, author);
        }
    });
    
    context.subscriptions.push(disposable);
}

async function getBlameForFile(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const blameCommand = spawn('git', ['blame', '--line-porcelain', path.basename(filePath)], { cwd: path.dirname(filePath) });

        let output = '';
        blameCommand.stdout.on('data', (data) => {
            output += data.toString();
        });

        blameCommand.stderr.on('data', (data) => {
            reject(new Error(data.toString()));
        });

        blameCommand.on('close', (code) => {
            if (code === 0) {
                const blameLines = parseBlameOutput(output);
                resolve(blameLines);
            } else {
                reject(new Error(`git blame process exited with code ${code}`));
            }
        });
    });
}

// Parse git blame output for the entire file
function parseBlameOutput(blameOutput: string): string[] {
    const blameLines = blameOutput.split('\n').filter(line => line.startsWith('author '));

    const parsedAuthors: string[] = [];
    let lineNumber = 0;

    for (let i = 0; i < blameLines.length; i++) {
        if (blameLines[i].startsWith('author ')) {
            const author = blameLines[i].replace('author ', '');
            parsedAuthors[lineNumber] = author;
            lineNumber++;
        }
    }

    return parsedAuthors;
}

// Display the blame results in a new text editor
function showBlameResults(blameOutput: string[], document: vscode.TextDocument) {
    let content = '';
    for (let i = 0; i < document.lineCount; i++) {
        const lineContent = document.lineAt(i).text;
        const author = blameOutput[i] || 'Unknown';
        content += `${author.padEnd(20)} | ${lineContent}\n`;
    }

    vscode.workspace.openTextDocument({ content, language: 'plaintext' }).then(doc => {
        vscode.window.showTextDocument(doc);
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
