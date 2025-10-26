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

// Create menu for enabling / disabling constants
function getCurrentConfigValue(filePath, setting) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        let regex;
        
        switch(setting) {
            case 'WP_DEBUG':
                regex = /define\(\s*'WP_DEBUG'\s*,\s*(\w+)\s*\);/i;
                break;
            case 'WP_ENVIRONMENT_TYPE':
                regex = /define\(\s*'WP_ENVIRONMENT_TYPE'\s*,\s*'(\w+)'\s*\);/i;
                break;
            case 'SENDGRID_DEV':
                regex = /define\(\s*'SENDGRID_DEV'\s*,\s*(\w+)\s*\);/i;
                break;
        }
        
        const match = data.match(regex);
        return match ? match[1] : null;
    } catch (err) {
        console.error('Error reading config value:', err);
        return null;
    }
}

function toggleSetting(filePath, setting, newValue) {
    console.log(`Toggling ${setting} to ${newValue}`);
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err);
                return;
            }
            
            let regex, replacement;
            
            switch(setting) {
                case 'WP_DEBUG':
                    regex = /define\(\s*'WP_DEBUG'\s*,\s*\w+\s*\);/i;
                    replacement = `define( 'WP_DEBUG', ${newValue} );`;
                    break;
                case 'WP_ENVIRONMENT_TYPE':
                    regex = /define\(\s*'WP_ENVIRONMENT_TYPE'\s*,\s*'\w+'\s*\);/i;
                    replacement = `define( 'WP_ENVIRONMENT_TYPE', '${newValue}' );`;
                    break;
                case 'SENDGRID_DEV':
                    regex = /define\(\s*'SENDGRID_DEV'\s*,\s*\w+\s*\);/i;
                    replacement = `define( 'SENDGRID_DEV', ${newValue} );`;
                    break;
            }
            
            if (!regex.test(data)) {
                reject(new Error(`${setting} not found in wp-config.php`));
                return;
            }
            
            data = data.replace(regex, replacement);
            
            fs.writeFile(filePath, data, 'utf-8', (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}

async function showSettingsMenu(configFilePath) {
    // Get current values
    const wpDebug = getCurrentConfigValue(configFilePath, 'WP_DEBUG');
    const envType = getCurrentConfigValue(configFilePath, 'WP_ENVIRONMENT_TYPE');
    const sendgridDev = getCurrentConfigValue(configFilePath, 'SENDGRID_DEV');
    
    // Create menu items
    const items = [
        {
            label: `$(debug-alt) WP_DEBUG`,
            description: `Currently: ${wpDebug || 'not found'}`,
            detail: 'Toggle WordPress debug mode',
            setting: 'WP_DEBUG',
            currentValue: wpDebug
        },
        {
            label: `$(server-environment) WP_ENVIRONMENT_TYPE`,
            description: `Currently: ${envType || 'not found'}`,
            detail: 'Switch between production and development',
            setting: 'WP_ENVIRONMENT_TYPE',
            currentValue: envType
        },
        {
            label: `$(mail) SENDGRID_DEV`,
            description: `Currently: ${sendgridDev || 'not found'}`,
            detail: 'Toggle SendGrid development mode',
            setting: 'SENDGRID_DEV',
            currentValue: sendgridDev
        }
    ];
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a setting to change',
        title: 'WordPress Configuration Settings'
    });
    
    if (!selected) return;
    
    // Determine what the new value should be
    let newValue;
    
    if (selected.setting === 'WP_ENVIRONMENT_TYPE') {
        const envOptions = [
            { label: 'production', picked: selected.currentValue === 'production' },
            { label: 'development', picked: selected.currentValue === 'development' },
            { label: 'staging', picked: selected.currentValue === 'staging' },
            { label: 'local', picked: selected.currentValue === 'local' }
        ];
        
        const envChoice = await vscode.window.showQuickPick(envOptions, {
            placeHolder: 'Select environment type',
            title: 'WP_ENVIRONMENT_TYPE'
        });
        
        if (!envChoice) return;
        newValue = envChoice.label;
    } else {
        // Toggle true/false for WP_DEBUG and SENDGRID_DEV
        newValue = selected.currentValue === 'true' ? 'false' : 'true';
    }
    
    // Apply the change
    try {
        await toggleSetting(configFilePath, selected.setting, newValue);
        vscode.window.showInformationMessage(
            `✓ ${selected.setting} set to ${newValue}`
        );
        
        // Show menu again so they can make more changes
        const again = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Change another setting?'
        });
        
        if (again === 'Yes') {
            showSettingsMenu(configFilePath);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Error updating ${selected.setting}: ${err.message}`);
    }
}

function activate(context) {
    console.log('WordPress Debug Mode extension activated');
    
    // Add the settings menu command
    let menuCommand = vscode.commands.registerCommand('wordpress-debug-mode.settings', () => {
        try {
            const filePath = currentPageUri();
            
            if (!filePath) {
                vscode.window.showInformationMessage('Please open a WordPress file first.');
                return;
            }
            
            const fileName = filePath.fsPath.split('/').pop();
            const fileDir = filePath.fsPath.replace(fileName, '');
            const configFile = getConfigPath(fileDir);
            
            if (!configFile) {
                vscode.window.showInformationMessage('Unable to find wp-config.php');
                return;
            }
            
            showSettingsMenu(configFile.path);
        } catch (error) {
            console.error('Error opening settings menu:', error);
            vscode.window.showErrorMessage('Error: ' + error.message);
        }
    });
    
    context.subscriptions.push(menuCommand);
    
    // Existing enable/disable/reveal/open commands
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
