#!/bin/bash

# Package extension for Chrome Web Store submission
# Usage: ./package.sh [version]

VERSION=${1:-"0.1.0"}
EXTENSION_NAME="editresume-job-saver"
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "Packaging EditResume Job Saver Extension v${VERSION}..."

# Remove old zip if exists
if [ -f "../${ZIP_NAME}" ]; then
    rm "../${ZIP_NAME}"
    echo "Removed old package"
fi

# Create zip excluding unnecessary files
cd "$(dirname "$0")"
zip -r "../${ZIP_NAME}" . \
    -x "*.DS_Store" \
    -x "*.git*" \
    -x "*.md" \
    -x "package.sh" \
    -x "*.zip" \
    -x "node_modules/*" \
    -x ".vscode/*" \
    -x "*.log"

if [ $? -eq 0 ]; then
    echo "✓ Package created: ../${ZIP_NAME}"
    echo "✓ Size: $(du -h ../${ZIP_NAME} | cut -f1)"
    echo ""
    echo "Next steps:"
    echo "1. Go to https://chrome.google.com/webstore/devconsole"
    echo "2. Click 'New Item'"
    echo "3. Upload ${ZIP_NAME}"
    echo "4. Fill out store listing using STORE_LISTING.md"
    echo "5. Use PERMISSIONS_JUSTIFICATION.md for permissions section"
else
    echo "✗ Failed to create package"
    exit 1
fi

