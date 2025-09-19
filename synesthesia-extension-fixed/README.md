# Grapheme→Color Reader (Chrome Extension)

Colorize letters and numbers consistently across the web to train grapheme-color associations.

## Install (Unpacked)

1. Download this folder or the ZIP.
2. Go to `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Pin the extension and click the icon to enable/disable. Use **Options** to edit the mapping.

## Publish to GitHub (quick)

### Option A: Web UI
1. Create a new repo on GitHub (public or private).
2. Click **Add file → Upload files**.
3. Drag & drop the entire `synesthesia-extension/` folder (or the ZIP) into the page.
4. Commit the upload to `main`.

### Option B: Git CLI (local)
```bash
git init
git add .
git commit -m "Initial commit: Grapheme→Color Reader"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Files
- `manifest.json` – Chrome manifest (MV3)
- `content.js` – colorizes text nodes and observes DOM changes
- `popup.html`, `popup.js` – enable/disable + link to Options
- `options.html`, `options.js` – UI to customize grapheme→color map
