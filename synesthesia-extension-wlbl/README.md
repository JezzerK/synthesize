# Grapheme→Color Reader (Chrome Extension)

Colorize letters and numbers consistently across the web to train grapheme-color associations.

**v1.1.0 adds site whitelist/blacklist + performance improvements.**

## Install (Unpacked)
1. Download this folder or the ZIP.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.

## Whitelist/Blacklist
- Toggle **whitelist mode** in Options (blocks all sites except ones listed).
- Add domains in Options (one per line). Patterns supported:
  - `example.com` (exact)
  - `*.example.com` (any subdomain)
  - `.example.com` (suffix match)
- From the popup you can **Allow**, **Block**, or **Clear override** for the current site.

## Files
- `manifest.json` – Chrome MV3 manifest
- `content.js` – colorizes text nodes, uses idle batching, honors white/black lists
- `popup.html/js` – global toggle + per-site allow/block
- `options.html/js` – color mapping + whitelist/blacklist controls
