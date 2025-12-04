# feat: Add PWA Support to Avatarz

## Overview

Make Avatarz installable to home screen on mobile and desktop devices.

## Implementation (Completed)

### 1. Created manifest.json

File: `public/manifest.json`

```json
{
  "name": "Avatarz - AI Avatar Generator",
  "short_name": "Avatarz",
  "start_url": "/avatarz/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 2. Added Icons

- `public/android-chrome-192x192.png` ✓
- `public/android-chrome-512x512.png` ✓
- `public/apple-touch-icon.png` (180x180) ✓

### 3. Updated index.html

Added PWA meta tags:

```html
<link rel="manifest" href="/avatarz/manifest.json" />
<link rel="apple-touch-icon" href="/avatarz/apple-touch-icon.png" />
<meta name="theme-color" content="#4f46e5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

## Testing

1. Deploy to GitHub Pages
2. On Android Chrome: Look for "Install app" option in menu
3. On iOS Safari: Share → "Add to Home Screen"
4. Verify app launches in standalone mode (no browser UI)

## What's NOT Included

- No service worker (no offline support)
- No caching strategies
- No update notifications
- No iOS install prompt UI

These can be added later if needed.
