// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

// 延时函数
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let hoverTimeout: NodeJS.Timeout | undefined;
// 监听器变量
let selectionListener: vscode.Disposable | undefined;
let fullOpacityDecoration: vscode.TextEditorDecorationType | undefined;
let reducedOpacityDecoration: vscode.TextEditorDecorationType | undefined;
let isEnabled: boolean = false;  // 新增变量跟踪插件状态

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitmembers" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const disposable = vscode.commands.registerCommand('gitmembers.showGitBlameInTxT', async () => {
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

    const toggleDisposable = vscode.commands.registerCommand('gitmembers.members', () => {
        isEnabled = !isEnabled;  // 切换状态
        vscode.window.showInformationMessage(`GitMembers plugin has been ${isEnabled ? 'enabled' : 'disabled'}.`);
        if (!isEnabled) {
            deactivate();  // 禁用时调用 deactivate
        } else {
            enableRealTimeBlame();  // 启用时调用
        }
    });

    context.subscriptions.push(toggleDisposable);
}

function enableRealTimeBlame() {
    if (selectionListener) {
        selectionListener.dispose();  // 确保没有重复的监听器
    }

    selectionListener = vscode.window.onDidChangeTextEditorSelection((event) => {
        if (!isEnabled) return;  // 检查插件是否启用

        const editor = event.textEditor;
        if (!editor) return;

        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
        }

        const selectedLine = editor.selection.active.line;

        hoverTimeout = setTimeout(async () => {
            const blameOutput = await getBlameForFile(editor.document.fileName);
            const author = blameOutput[selectedLine];
            console.log(`Selected Line: ${selectedLine}, Author: ${author}`);

            if (author) {
                highlightByAuthor(editor, blameOutput, author);
            }
        }, 1000);
    });
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

function highlightByAuthor(editor: vscode.TextEditor, blameOutput: string[], author: string) {
    if (!isEnabled) return;  // 检查插件是否启用

    if (fullOpacityDecoration) {
        editor.setDecorations(fullOpacityDecoration, []);
    }
    if (reducedOpacityDecoration) {
        editor.setDecorations(reducedOpacityDecoration, []);
    }

    fullOpacityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 255, 0, 0.3)'  // 黄色背景
    });

    reducedOpacityDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(128, 128, 128, 0.3)'  // 灰色背景
    });

    const fullOpacityRanges: vscode.Range[] = [];
    const reducedOpacityRanges: vscode.Range[] = [];

    for (let i = 0; i < blameOutput.length; i++) {
        const lineAuthor = blameOutput[i];
        const range = new vscode.Range(i, 0, i, editor.document.lineAt(i).text.length);

        if (lineAuthor === author) {
            fullOpacityRanges.push(range);
            console.log(`Highlighting line ${i} for author: ${author}`);
        } else {
            reducedOpacityRanges.push(range);
            console.log(`Dimming line ${i} for author: ${lineAuthor}`);
        }
    }

    editor.setDecorations(fullOpacityDecoration, fullOpacityRanges);
    editor.setDecorations(reducedOpacityDecoration, reducedOpacityRanges);
}

// This method is called when your extension is deactivated
// 禁用插件
export function deactivate() {
    if (hoverTimeout) {
        clearInterval(hoverTimeout);
    }
    // 清除高亮装饰
    if (fullOpacityDecoration) {
        vscode.window.activeTextEditor?.setDecorations(fullOpacityDecoration, []);
        fullOpacityDecoration = undefined;
    }
    if (reducedOpacityDecoration) {
        vscode.window.activeTextEditor?.setDecorations(reducedOpacityDecoration, []);
        reducedOpacityDecoration = undefined;
    }

    // 移除事件监听器
    if (selectionListener) {
        selectionListener.dispose();
        selectionListener = undefined;
    }
}
