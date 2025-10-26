const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs')
const path = require('path');

let status = null;

function getConfigPath(from) {
    const fileName = 'wp-config.php';
    
    // If no path provided or path doesn't exist, default to Lando container path
    if (!from || !fs.existsSync(from)) {
        from = '/app/wordpress';
    }
    
    // Normalize the path
    from = path.normalize(from);
    
    // Check if we've reached the root
    if (from === '/' || from === '.' || from === '') {
        return false;
    }
    
    const searchPath = path.join(from, fileName);
    
    try {
        if (fs.existsSync(searchPath)) {
            return {
                path: searchPath,
                dir: from,
            };
        }
    } catch (err) {
        // Continue searching
    }
    
    // Search parent directory
    const parentDir = path.dirname(from);
    if (parentDir === from) {
        return false; // We've reached the root
    }
    
    return getConfigPath(parentDir);
}

/**
 * Get current open file path
 */
function currentPageUri() {
    return vscode.window.activeTextEditor &&
        vscode.window.activeTextEditor.document &&
        vscode.window.activeTextEditor.document.uri;
}

/**
 * Toogle config
 * param
 */
function toggleConfigParam(filePath = false, search = '', value = '') {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf-8', (err, data) => {
		    if (err) throw err;
		    let found = data.matchAll(search);
		    if (found) {
		        found = [...found][0];
		        if (found.length == 2) {
		            let line = found[0].replace(found[1], value);
		            data = data.replace(found[0], line);
		        }
		    }
		    fs.writeFile(filePath, data, 'utf-8', (err, data) => {
				if (err) throw err;
				resolve(data);
			})
		})
	});
}


function activate(context) {
	const actions = ['enable', 'disable', 'reveal', 'open'];

	actions.forEach(action => {
		let disposable = vscode.commands.registerCommand(`wordpress-debug-mode.${action}`, () => {
		    const filePath = currentPageUri();
		    if (!filePath) {
		        vscode.window.showInformationMessage('Unable to get current file path');
		        return false;
		    }

		    const fileName = filePath.fsPath.split('/').pop();
		    const fileDir = filePath.fsPath.replace(fileName, '');
		    const configFile = getConfigPath(fileDir);

		    if (!configFile) {
		        vscode.window.showInformationMessage('Unable to get wp-config.php file path');
		        return false;
			}

			if (action == 'open') {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(configFile.path));
				return;
			}

			if (action == 'reveal') {
			    cp.exec(`open -R ${configFile.path}`, (err) => {
			        if (err) {
			            console.error(err);
			            status.text = '';
			            status.hide();
			            vscode.window.showInformationMessage('There was an error please view console for more information');
			            return;
			        }
				});
				return;
			}

			if (action == 'enable' || action == 'disable') {
				const search = /define\( ?'WP_DEBUG' ?, ?(\w*).?\);/gi;
				const newValue = (action == 'enable' ? 'true' : 'false');
				return toggleConfigParam(configFile.path, search, newValue).then(res => {
					if (!status) {
					    status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
					}

					status.color = '';
					status.text = '';
					status.hide();

					const actioned = (action == 'enable' ? 'enabled' : 'disabled');
					status.text = `$(check) Debug mode was ${actioned}`;
					status.show();
					setTimeout(() => { status.hide() }, 2000);
				}).catch(err => {
					console.error(err);
				});
			}
		});
		context.subscriptions.push(disposable);
	});
}

exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
