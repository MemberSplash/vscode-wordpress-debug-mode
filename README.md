# WordPress Debug Mode

Allows toggling on/off the following constants in wp-config.php. Works with Dockerized WP as well as local.

__WP_DEBUG__ -- true/false

__WP_ENVIRONMENT_TYPE__ -- one of production, development, staging or local. Development is used by Member Splash to handle live loading Vue scripts. Can be checked with wp_get_environment() (https://developer.wordpress.org/reference/functions/wp_get_environment_type/).

Ex: `if ( 'development' === wp_get_environment_type() ){ ... `

__SENDGRID_DEV__ -- true/false. If true SendGrid sandbox mode is enabled and messages aren't actually delivered

Launch initially by using Control + Shift + P to open the Command menu and then type __WordPress: Configuration Settings__. Click on the settings icon to the right of the command and then assign it a keyboard shortcut (I use Shift + W, Shift + P -- as in hold down Shift and then type W followed by P). Now you can launch it and toggle any of those settings without having to manually edit your wp-config file.

<img width="541" height="166" alt="image" src="https://github.com/user-attachments/assets/2f43477f-aa09-4316-ae1b-e924d748f96d" />

# Installation
1. Go to the Releases page
2. Download the `.vsix` file from the latest release
  <img width="580" height="477" alt="image" src="https://github.com/user-attachments/assets/81f97def-f8a5-4981-b9a6-d9220683a5e8" />

4. Install it in VS Code

# Local Dev
```
# Clone the repo
git clone git@github.com:MemberSplash/vscode-wordpress-debug-mode.git
cd vscode-wordpress-debug-mode

# Install dependencies
npm install

# Symlink to VS Code extensions
ln -s "$(pwd)" ~/.vscode/extensions/vscode-wordpress-debug-mode

# Reload VS Code
```

# Build for Release
```javascript
cd ~/Playground/VSCode\ Extensions/vscode-wordpress-debug-mode

# Install vsce if you don't have it
npm install -g @vscode/vsce

# Package the extension. This creates: wordpress-debug-mode-0.0.1.vsix
vsce package

# Create a version tag
git tag v1.0.X
git push origin v1.0.X

git push origin v0.0.1

## Upload VSIX to GitHub

1. Go to: `https://github.com/MemberSplash/vscode-wordpress-debug-mode/releases`
2. Click **"Create a new release"**
3. Select the tag: `v1.0.X`
4. Title: `v1.0.X`
5. Description: `Initial release - Lando/Docker compatible WordPress debug settings`
6. **Drag and drop** the `wordpress-debug-mode-1.0.X.vsix` file into the assets section
7. Click **"Publish release"**
```

## Releases

### 1.0.0

Initial release
