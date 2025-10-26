const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs')
const path = require('path');
let status = null;

function getConfigPath(from) {
    console.log('getConfigPath called with:', from);
    const fileName = 'wp-config.php';
    
    // Normalize the path
    if (from) {
        from = path.normalize(from);
    }
    
    // If no valid starting path, return false
    if (!from || from === '/' || from === '.' || from === '') {
        console.log('No valid starting path');
        return false;
    }
    
    // Check if directory exists
    if (!fs.existsSync(from)) {
        console.log('Directory does not exist:', from);
        return false;
    }
    
    const searchPath = path.join(from, fileName);
    console.log('Searching for:', searchPath);
    
    try {
        if (fs.existsSync(searchPath)) {
            console.log('Found wp-config.php at:', searchPath);
            return {
                path: searchPath,
                dir: from,
            };
        }
    } catch (err) {
        console.error('Error checking path:', err);
    }
    
    // Search parent directory
    const parentDir = path.dirname(from);
    if (parentDir === from) {
        console.log('Cannot go up further, returning false');
        return false;
    }
    
    return getConfigPath(parentDir);
}

function currentPageUri() {
    return vscode.window.activeTextEditor &&
        vscode.window.activeTextEditor.document &&
        vscode.window.activeTextEditor.document.uri;
}

function toggleConfigParam(filePath = false, search = '', value = '') {
    console.log('toggleConfigParam called with:', filePath, value);
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err);
                return;
            }
            let found = data.matchAll(search);
            if (found) {
                found = [...found][0];
                if (found && found.length == 2) {
                    let line = found[0].replace(found[1], value);
                    data = data.replace(found[0], line);
                    console.log('Replaced line:', line);
                }
            }
            fs.writeFile(filePath, data, 'utf-8', (err, data) => {
                if (err) {
                    console.error('Error writing file:', err);
                    reject(err);
                    return;
                }
                resolve(data);
            })
        })
    });
}

function activate(context) {
    console.log('WordPress Debug Mode extension activated');
    const actions = ['enable', 'disable', 'reveal', 'open'];
    actions.forEach(action => {
        let disposable = vscode.commands.registerCommand(`wordpress-debug-mode.${action}`, () => {
            try {
                console.log('Command triggered:', action);
                
                const filePath = currentPageUri();
                console.log('Current file path:', filePath);
                
                if (!filePath) {
                    vscode.window.showInformationMessage('Unable to get current file path. Please open a WordPress file first.');
                    return false;
                }
                
                const fileName = filePath.fsPath.split('/').pop();
                const fileDir = filePath.fsPath.replace(fileName, '');
                console.log('File directory:', fileDir);
                
                // Search for wp-config.php starting from current file's directory
                const configFile = getConfigPath(fileDir);
                console.log('Config file result:', configFile);
                
                if (!configFile) {
                    vscode.window.showInformationMessage('Unable to find wp-config.php. Make sure you have a WordPress file open.');
                    return false;
                }
                
                if (action == 'open') {
                    console.log('Opening file:', configFile.path);
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(configFile.path));
                    return;
                }
                
                if (action == 'reveal') {
                    console.log('Revealing file:', configFile.path);
                    cp.exec(`xdg-open "${path.dirname(configFile.path)}"`, (err) => {
                        if (err) {
                            console.error('Error revealing file:', err);
                            vscode.window.showInformationMessage('There was an error revealing the file');
                            return;
                        }
                    });
                    return;
                }
                
                if (action == 'enable' || action == 'disable') {
                    const search = /define\( ?'WP_DEBUG' ?, ?(\w*).?\);/gi;
                    const newValue = (action == 'enable' ? 'true' : 'false');
                    
                    return toggleConfigParam(configFile.path, search, newValue).then(res => {
                        console.log('Config updated successfully');
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
                        console.error('Error toggling config:', err);
                        vscode.window.showErrorMessage('Error updating wp-config.php: ' + err.message);
                    });
                }
            } catch (error) {
                console.error('FATAL ERROR:', error);
                vscode.window.showErrorMessage('Extension error: ' + error.message);
            }
        });
        context.subscriptions.push(disposable);
    });
}

exports.activate = activate;

function deactivate() {
    console.log('WordPress Debug Mode extension deactivated');
}

module.exports = {
    activate,
    deactivate
}
