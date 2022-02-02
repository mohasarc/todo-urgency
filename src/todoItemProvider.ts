import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class TodoItemProvider implements vscode.TreeDataProvider<TodoItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<TodoItem | undefined | void> = new vscode.EventEmitter<TodoItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TodoItem | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(todoItem: TodoItem): vscode.TreeItem {
		return todoItem;
	}

	getChildren(): Thenable<TodoItem[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No todo items in empty workspace');
			return Promise.resolve([]);
		}

        const allFilesPaths = this.getAllFilePaths(this.workspaceRoot);
        const allTodoItems: TodoItem[] = [];

        allFilesPaths.forEach((filePath) => {
            if (this.pathExists(filePath)) {
                allTodoItems.push(...this.gettodoItemsInFile(filePath));
            }
        });

        // Sort based on urgency!!
        allTodoItems.sort((a, b) => parseInt(b.urgency) - parseInt(a.urgency));
        allTodoItems.forEach((todoItem) => {
            if (todoItem.command) {
                todoItem.command['arguments'] = [{
                    filePath: todoItem.filePath,
                    lineNo: todoItem.lineNo,
                }];
            }
        });

        return Promise.resolve(allTodoItems);
	}

    private getAllFilePaths(rootPath: string): string[] {
        const allFilesPaths: string[] = [];
        const subfolderPaths: string[] = [];

        const files = fs.readdirSync(rootPath);
        files.forEach((file) => {
            if (file === 'node_modules') { return; }

            const absFilePath = path.join(rootPath, file);
            const stat = fs.lstatSync(absFilePath);

            if (stat.isFile()) {
                allFilesPaths.push(absFilePath);
            } else {
                subfolderPaths.push(absFilePath);
            }
        });

        subfolderPaths.forEach((subfolderPath) => {
            allFilesPaths.push(...this.getAllFilePaths(subfolderPath));
        });

        return allFilesPaths;
    }

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private gettodoItemsInFile(filePath: string): TodoItem[] {
		if (this.pathExists(filePath)) {
			const fileContent: string = fs.readFileSync(filePath, 'utf-8');
            const lineArr: string[] = fileContent.split(/\r\n|\n/);
            const searchKeyword = '// urgent ';
            const todoItems: TodoItem[] = [];

            lineArr.forEach((line, i) => {
                const todoStartingIndex = line.indexOf(searchKeyword);

                if (todoStartingIndex >= 0) {
                    // there is a todo in this line
                    let todoUrgency = '1';
                    const todoLine = i + 1;
                    const matchedNums = line.match(/^\d+|\d+\b|\d+(?=\w)/g);

                    if (matchedNums !== null) { todoUrgency = matchedNums[0]; }

                    const todoNote = line.substring(todoStartingIndex + searchKeyword.length + todoUrgency.length);
                    todoItems.push(new TodoItem(todoUrgency, todoNote, todoLine, filePath, {title: "view line", command: "todo-urgency.item"}));
                }
            });

            return todoItems;
        }

        return [];
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

export class TodoItem extends vscode.TreeItem {
	constructor(
		public readonly urgency: string,
		private readonly note: string,
        public readonly lineNo: number,
        public readonly filePath: string,
		public readonly command?: vscode.Command,
	) {
		super(`${urgency}`);

		this.tooltip = `${this.urgency}-${this.note}`;
		this.description = this.note;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	};

	contextValue = 'dependency';
}