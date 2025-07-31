#!/bin/bash

# Install script for @octomind/octomind@latest
# Installs to ~/.local/packages with dependencies and creates symlinks in ~/.local/bin

set -e  # Exit on any error

PACKAGE_NAME="@octomind/octomind"
PACKAGE_VERSION="latest"
INSTALL_DIR="$HOME/.local/packages"
BIN_DIR="$HOME/.local/bin"
PACKAGE_DIR="$INSTALL_DIR/octomind"

echo "Installing $PACKAGE_NAME@$PACKAGE_VERSION with dependencies..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Remove existing installation if it exists
if [ -d "$PACKAGE_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$PACKAGE_DIR"
fi

# Create package directory
mkdir -p "$PACKAGE_DIR"
cd "$PACKAGE_DIR"

# Install the package and its dependencies using npm
echo "Installing package and dependencies..."
npm install "$PACKAGE_NAME@$PACKAGE_VERSION" --omit=dev --no-save

# The package will be in node_modules/@octomind/octomind
# Move it to the root and keep node_modules for dependencies
if [ -d "node_modules/@octomind/octomind" ]; then
    # Copy package files to root
    cp -r node_modules/@octomind/octomind/* .
    cp -r node_modules/@octomind/octomind/.[^.]* . 2>/dev/null || true
    
    # Remove the package from node_modules to avoid duplication
    rm -rf node_modules/@octomind/octomind
    
    # If @octomind directory is now empty, remove it
    if [ -d "node_modules/@octomind" ] && [ -z "$(ls -A node_modules/@octomind)" ]; then
        rmdir node_modules/@octomind
    fi
else
    echo "Warning: Package not found in expected location"
fi

echo "Package installed at: $PACKAGE_DIR"
echo "Dependencies installed in: $PACKAGE_DIR/node_modules"

# Check if package has executables
if [ -f "$PACKAGE_DIR/package.json" ]; then
    # Extract bin field from package.json
    BIN_COMMANDS=$(node -e "
        const pkg = require('$PACKAGE_DIR/package.json');
        if (pkg.bin) {
            if (typeof pkg.bin === 'string') {
                console.log('octomind:' + pkg.bin);
            } else {
                Object.entries(pkg.bin).forEach(([name, path]) => {
                    console.log(name + ':' + path);
                });
            }
        }
    " 2>/dev/null || echo "")
    
    if [ -n "$BIN_COMMANDS" ]; then
        echo ""
        echo "Creating symlinks for executables..."
        
        # Process each command
        echo "$BIN_COMMANDS" | while IFS=':' read -r cmd_name cmd_path; do
            if [ -n "$cmd_name" ] && [ -n "$cmd_path" ]; then
                SOURCE_PATH="$PACKAGE_DIR/$cmd_path"
                LINK_PATH="$BIN_DIR/$cmd_name"
                
                if [ -f "$SOURCE_PATH" ]; then
                    # Try to create symlink
                    if ln -sf "$SOURCE_PATH" "$LINK_PATH" 2>/dev/null; then
                        echo "✓ Created symlink: $cmd_name -> $SOURCE_PATH"
                        chmod +x "$SOURCE_PATH" 2>/dev/null || true
                    else
                        echo "✗ Failed to create symlink for $cmd_name"
                        echo "  Run manually: ln -sf '$SOURCE_PATH' '$LINK_PATH'"
                    fi
                else
                    echo "✗ Executable not found: $SOURCE_PATH"
                fi
            fi
        done
        
        # Check if ~/.local/bin is in PATH
        echo ""
        if echo "$PATH" | grep -q "$BIN_DIR"; then
            echo "✓ $BIN_DIR is already in your PATH"
            echo "You can now run: octomind"
        else
            echo "⚠ $BIN_DIR is not in your PATH"
            echo ""
            echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
            echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
            echo ""
            echo "Or run this command to add it for the current session:"
            echo "export PATH=\"$BIN_DIR:\$PATH\""
            echo ""
            echo "Then you can run: octomind"
        fi
    else
        echo "No executable commands found in package.json"
    fi
else
    echo "Warning: package.json not found"
fi

echo ""
echo "Installation complete!"
echo "Package installed at: $PACKAGE_DIR"

# Show installation info
if [ -f "$PACKAGE_DIR/package.json" ]; then
    VERSION=$(node -e "console.log(require('$PACKAGE_DIR/package.json').version)" 2>/dev/null || echo "unknown")
    echo "Version: $VERSION"
fi

# Show size info
if [ -d "$PACKAGE_DIR/node_modules" ]; then
    DEP_COUNT=$(find "$PACKAGE_DIR/node_modules" -maxdepth 2 -name "package.json" | wc -l)
    echo "Dependencies installed: $DEP_COUNT packages"
fi

echo ""
echo "To uninstall, run:"
echo "rm -rf '$PACKAGE_DIR'"
echo "rm -f '$BIN_DIR'/octomind"