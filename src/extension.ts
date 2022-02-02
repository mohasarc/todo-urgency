import * as vscode from 'vscode';
import { TodoItemProvider } from './todoItemProvider';

function jumpToFileLine(filePath: string, lineNo: number) {
	vscode.window.showTextDocument(vscode.Uri.file(filePath)).then((editor) => {
		let range = editor.document.lineAt(lineNo-1).range;
		editor.selection =  new vscode.Selection(range.start, range.end);
		editor.revealRange(range);
	});
}

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const todoItemsProvider = new TodoItemProvider(rootPath);
	vscode.window.registerTreeDataProvider('todoUrgency', todoItemsProvider);
	const disposable = vscode.commands.registerCommand('todo-urgency.refreshEntry', () => todoItemsProvider.refresh());
	vscode.commands.registerCommand('todo-urgency.item', (args) => {
		jumpToFileLine(args.filePath, args.lineNo);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
