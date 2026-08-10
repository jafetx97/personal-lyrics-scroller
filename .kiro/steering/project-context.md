# Personal Lyrics Scroller - Project Context

## Overview
This is a personal Progressive Web App (PWA) for auto-scrolling song lyrics during live performances. The user is a singer in a versatile band who needs hands-free lyrics display on an iPad via Safari.

## Tech Stack
- Pure HTML5, CSS3, and vanilla JavaScript (no frameworks)
- PWA with Service Worker for offline support
- Hosted on GitHub Pages
- Target device: iPad with Safari (add to home screen for fullscreen experience)
- Input: external Bluetooth mouse (no keyboard in performance)

## Architecture Decisions
- Songs stored as individual JSON files in `songs/` directory
- Song index maintained in `songs/index.json`
- Setlists stored as JSON files in `setlists/` directory
- Single-page application with no build step required
- All interactions designed for mouse-click only (no keyboard shortcuts needed in performance)

## File Structure
```
personal-lyrics-scroller/
├── index.html          Main app entry point
├── style.css           All styles
├── app.js              All application logic
├── manifest.json       PWA manifest
├── sw.js               Service worker for offline
├── songs/
│   ├── index.json      Registry of all available songs
│   └── *.json          Individual song files
└── setlists/
    └── *.json          Setlist files (ordered song lists)
```

## Song JSON Format
```json
{
  "id": "song-id-slug",
  "title": "Song Title",
  "artist": "Artist Name",
  "lyrics": "Line 1\nLine 2\nLine 3..."
}
```

## Setlist JSON Format
```json
{
  "id": "setlist-id",
  "name": "Event Name - Date",
  "songs": ["song-id-1", "song-id-2", "song-id-3"]
}
```

## Key Features
1. Auto-scroll with adjustable speed (faster/slower buttons)
2. Manual scroll interruption continues auto-scroll from new position
3. Alphabetical song menu (sidebar)
4. Setlist management (predefined song order for events)
5. Offline support via PWA/Service Worker
6. Fullscreen-friendly for iPad "Add to Home Screen"

## UI/UX Guidelines
- Large, readable text (performance stage lighting conditions)
- High contrast (dark background, light text)
- Minimal UI chrome - lyrics take priority
- Controls should be small and unobtrusive but clickable with a mouse
- Touch-friendly tap targets (minimum 44px)
- No unnecessary animations or transitions that distract

## Development Notes
- No build tools required - edit files directly
- To test locally: use any static file server (e.g., `npx serve` or VS Code Live Server)
- Deploy: push to `main` branch, enable GitHub Pages from repository settings
- Service worker caches all assets and song files for offline use
