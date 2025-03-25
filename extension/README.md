# Brainwave Chrome Extension

This Chrome extension integrates with the Brainwave speech recognition backend to provide seamless voice-to-text input directly into web form fields and chat interfaces.

## Features

- Real-time speech recognition with direct text injection into active text fields
- Works with standard input fields, textareas, and contenteditable elements
- Easy toggle recording with visual status indicators
- Configurable server URL for connecting to your Brainwave backend
- Settings persistence across browser sessions

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select the `extension` directory from this repository
4. The Brainwave extension icon should appear in your browser toolbar

### Production Mode (Future)

The extension will be available on the Chrome Web Store once it has been submitted and approved.

## Usage

1. Click the Brainwave icon in your toolbar to open the popup
2. Focus on any text input field where you want to insert text
3. Click "Start Recording" and begin speaking
4. The transcribed text will be automatically inserted into the focused field
5. Click "Stop Recording" when finished

## Configuration

- **Server URL**: The WebSocket URL of your Brainwave backend
  - Default: `ws://localhost:3005/api/v1/ws`
  - Change this if your server is running on a different host or port

- **Auto-fill text fields**: Toggle whether transcribed text is automatically inserted into text fields
  - When enabled: Text is inserted in real-time
  - When disabled: Text is stored but not inserted

## Backend Integration

This extension is designed to work with the Brainwave real-time server. Make sure your server is running and accessible from the browser.

The server must have CORS enabled to accept WebSocket connections from the extension.

## Permissions

The extension requires the following permissions:

- `storage`: To save your settings
- `activeTab`: To access the current page and inject text
- `scripting`: To interact with web page elements
- `tabCapture`: To access the microphone

## Development

### Project Structure

```
extension/
├── manifest.json         # Extension configuration
├── background.js         # Background service worker
├── popup/                # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/              # Content scripts
│   └── content.js        # Handles page integration
├── lib/                  # Reused code from original app
│   └── audio-processor.js
└── icons/                # Extension icons
```

### Building for Production

For a production build, you would typically:

1. Minify JavaScript files
2. Optimize CSS
3. Create production-ready icon files
4. Package the extension as a ZIP file for Chrome Web Store submission

## Troubleshooting

- **No text appears**: Make sure a text field is focused before starting recording
- **Connection errors**: Check that your Brainwave server is running and the URL is correct
- **Microphone access denied**: You need to grant microphone permissions to the extension

## License

Same as the main Brainwave project. 