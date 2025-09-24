# synthesize  

Inspired by science, **synthesize** recolors numbers and letters on webpages to induce grapheme–color synesthesia–like associations in the user.  

This Chrome extension is based on training protocols from *Bor et al. (2014)*, which showed that non-synesthetes can acquire synesthesia-like experiences through repeated, adaptive exposure.  

I did most of the hard parts with ChatGPT since I'm lazy, so please forgive me if the code is clunky or unconventional in some parts. I've also never built a chrome extension before.

---

## Features  
- **Automatic coloring** of letters (A–Z) and numbers (0–9) across all webpages.  
- **Custom mapping editor** in Options — pick your own colors or leave characters unchanged.  
- **Color presets**:
  - *Full Color* – apply to all letters and digits.  
  - *Bor et al.* – replicates the training set used in Bor et al. (2014).  
  - *Only Numbers* – maps only digits 0–9 (typical associations).  
  - *Only Letters* – maps A–Z only.  
- **Whitelist / Blacklist support** — control which sites are colored.  
- **Passive Drill** training task — replicates the original experimental “Passive Drill” (letters shown in color for 1s, background color for 500ms, repeated in cycles).  
- **Import / Export mappings** via text (JSON or simple `A=#ff0000` style).  

---

## Installation (Developer Mode)  
It's live on the Chrome Web Store, but you can run locally by:

1. Download the latest release ZIP from this repo.  
2. Extract it to a folder.  
3. Go to `chrome://extensions` in Chrome.  
4. Enable **Developer Mode** (top right).  
5. Click **Load unpacked** and select the folder.  

The extension icon will appear in your toolbar.  

---

## How to Use  
1. Open the **Options** page from the extension popup.  
2. Choose or edit a **color mapping** (or use a preset).  
3. Visit any website — letters/numbers will be recolored automatically.  
4. Try the **Passive Drill** (linked from Options or popup) for focused training.  

---

## Permissions  
`synthesize` requests the minimal permissions needed:  

- **storage** – to save your color mappings, whitelist/blacklist, and global enable/disable state.  

No other permissions are required.  

---

## References  
- Bor, D., Rothen, N., Schwartzman, D. J., Clayton, S., & Seth, A. K. (2014). *Adults can be trained to acquire synesthetic experiences*. Scientific Reports, 4, 7089. [https://doi.org/10.1038/srep07089](https://doi.org/10.1038/srep07089)  

---

## License  
MIT License. See [LICENSE](LICENSE) for details.  
