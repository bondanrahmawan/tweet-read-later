# Tweet Read Later

A Chrome extension that lets you save tweets into a personal "Read Later" library with tagging, search, archive, and import/export.

## Features

- Save tweets with one click from X/Twitter
- Tag and organize saved tweets
- Search and filter your library
- Archive tweets you've read
- Import/Export for backup
- Mobile-friendly view via GitHub Pages

## Project Structure

```
tweet-read-later/
├── manifest.json          # Chrome extension manifest
├── README.md
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/                   # Extension source code
│   ├── background.js      # Service worker
│   ├── shared.js          # Shared utilities
│   ├── content/           # Content script (injected into Twitter)
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/             # Extension popup
│   │   ├── popup.html
│   │   └── popup.js
│   ├── library/           # Tweet library page
│   │   ├── library.html
│   │   └── library.js
│   └── styles/
│       └── main.css       # Shared styles
└── mobile/                # Standalone mobile view (for GitHub Pages)
    ├── index.html
    ├── mobile.js
    ├── shared.js
    ├── style.css
    └── README.md          # Mobile setup guide
```

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `tweet-read-later` folder

## Mobile View

See [mobile/README.md](mobile/README.md) for instructions on setting up the mobile-friendly view using GitHub Pages.

## License

MIT
