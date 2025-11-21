# EditResume Job Saver Chrome Extension

Chrome extension for saving LinkedIn job descriptions to editresume.io and running AI-powered resume matching.

## Features

- One-click job saving from LinkedIn
- Automatic job metadata extraction
- Resume matching with AI analysis
- Cross-device synchronization
- Secure authentication

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit Chrome Web Store
2. Search for "EditResume Job Saver"
3. Click "Add to Chrome"

### Development Installation
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension` folder

## Usage

1. **Sign In**: Open editresume.io and sign in to your account
2. **Browse Jobs**: Visit LinkedIn job pages
3. **Save Jobs**: Click the extension icon and click "Save Job"
4. **View Matches**: Open editresume.io to see matching scores

## Configuration

Access settings via:
- Right-click extension icon → Options
- Or click "Settings" in the popup

Configure:
- API Base URL (default: https://editresume-staging.onrender.com)
- App Base URL (default: https://staging.editresume.io)

## Permissions

- **storage**: Saves jobs and settings locally
- **activeTab**: Reads job content from LinkedIn pages
- **scripting**: Extracts job information
- **tabs**: Opens editresume.io for authentication
- **Host permissions**: LinkedIn and editresume.io access

## Development

### Project Structure
```
extension/
├── manifest.json          # Extension manifest
├── popup.html/js          # Extension popup UI
├── options.html/js        # Settings page
├── content.js             # LinkedIn page content script
├── service-worker.js      # Background service worker
├── appBridge.js           # Communication bridge
└── icon-*.png             # Extension icons
```

### Building

No build step required. Extension uses vanilla JavaScript.

### Testing

1. Load extension in developer mode
2. Test on LinkedIn job pages
3. Verify save functionality
4. Test authentication flow
5. Check settings persistence

## Privacy

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for detailed privacy information.

## Support

- Email: support@editresume.io
- Website: https://editresume.io
- Issues: Report via Chrome Web Store

## License

Copyright © 2024 editresume.io. All rights reserved.

## Chrome Web Store Submission

See [SUBMISSION_GUIDE.md](./SUBMISSION_GUIDE.md) for submission instructions.

