# Pipe Connection Puzzle - Offline Version

This game is now a Progressive Web App (PWA) that works completely offline!

## Features
✅ Works offline after first visit
✅ Can be installed as a standalone app
✅ No internet connection required
✅ Saves your progress locally

## How to Use Offline

### Desktop (Chrome, Edge, Brave):
1. Open the game in your browser (file:// or via a server)
2. Look for the install icon (➕) in the address bar
3. Click "Install" to add it to your desktop/apps
4. Launch it anytime, even without internet!

### Mobile (Android/iOS):
1. Open the game in Chrome/Safari
2. Tap the menu (⋮ or share icon)
3. Select "Add to Home Screen" or "Install App"
4. The app will appear on your home screen

### Simple File Access:
Just open `index.html` in any browser - it works completely offline with no server needed!

## Files
- `index.html` - Main game page
- `game.js` - Game logic
- `styles.css` - Styling
- `manifest.json` - PWA configuration
- `sw.js` - Service worker for offline caching

## Note
For the service worker to register properly when testing locally, you may need to serve the files via a local server (or use file:// in most browsers). Once installed, it works completely offline.
