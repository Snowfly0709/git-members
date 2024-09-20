"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
// 延时函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
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
        }
        catch (err) {
            const errorMessage = err.message || 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run git blame: ${errorMessage}`);
        }
    });
    context.subscriptions.push(disposable);
}
async function getBlameForFile(filePath) {
    return new Promise((resolve, reject) => {
        const blameCommand = (0, child_process_1.spawn)('git', ['blame', '--line-porcelain', path.basename(filePath)], { cwd: path.dirname(filePath) });
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
            }
            else {
                reject(new Error(`git blame process exited with code ${code}`));
            }
        });
    });
}
// Parse git blame output for the entire file
function parseBlameOutput(blameOutput) {
    const blameLines = blameOutput.split('\n').filter(line => line.startsWith('author '));
    const parsedAuthors = [];
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
function showBlameResults(blameOutput, document) {
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
function deactivate() { }
//# sourceMappingURL=extension.js.map