const DEFAULT_MAP_KEYS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ..."0123456789"];
const DEFAULT_MAP = {
  A:"#ff5e5e", B:"#ff8a3d", C:"#ffbf3f", D:"#ffe14d", E:"#d6ff5d", F:"#9dff6a",
  G:"#66ff8a", H:"#52ffbe", I:"#4fe3ff", J:"#4ebaff", K:"#5a8cff", L:"#7b66ff",
  M:"#a066ff", N:"#c466ff", O:"#ff66f2", P:"#ff66bd", Q:"#ff6691", R:"#ff6f6f",
  S:"#ff944d", T:"#ffc24d", U:"#f2e64d", V:"#cfff4d", W:"#9bff4d", X:"#66ff66",
  Y:"#4dff9f", Z:"#4dffd6",
  "0":"#aaaaaa","1":"#ff4444","2":"#ff8844","3":"#ffcc44","4":"#ccff44",
  "5":"#88ff44","6":"#44ff88","7":"#44ffcc","8":"#44ccff","9":"#4488ff"
};

const lettersEl = document.getElementById("letters");
const digitsEl = document.getElementById("digits");
const saveMapBtn = document.getElementById("saveMap");
const mapStatus = document.getElementById("mapStatus");

const useWhitelist = document.getElementById("useWhitelist");
const whitelistBox = document.getElementById("whitelistBox");
const blacklistBox = document.getElementById("blacklistBox");
const saveWL = document.getElementById("saveWL");
const saveBL = document.getElementById("saveBL");
const wlStatus = document.getElementById("wlStatus");
const blStatus = document.getElementById("blStatus");

function colorInputFor(char, val) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.alignItems = "center";
  const label = document.createElement("div"); label.textContent = char; label.style.fontWeight = "600";
  const input = document.createElement("input"); input.type = "color"; input.value = val; input.dataset.char = char;
  wrap.appendChild(label); wrap.appendChild(input);
  return wrap;
}

function renderMap(map) {
  lettersEl.innerHTML = ""; digitsEl.innerHTML = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch => lettersEl.appendChild(colorInputFor(ch, map[ch] || "#000000")));
  "0123456789".split("").forEach(ch => digitsEl.appendChild(colorInputFor(ch, map[ch] || "#000000")));
}

function parseLines(text) {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

chrome.storage.sync.get(["gc_map","gc_use_whitelist","gc_whitelist","gc_blacklist"], (res) => {
  renderMap(validateMap(res.gc_map) || DEFAULT_MAP);
  useWhitelist.checked = !!res.gc_use_whitelist;
  (whitelistBox.value = (Array.isArray(res.gc_whitelist)? res.gc_whitelist: []).join("\n"));
  (blacklistBox.value = (Array.isArray(res.gc_blacklist)? res.gc_blacklist: []).join("\n"));
});

function validateMap(m) {
  if (!m || typeof m !== "object") return null;
  const out = {};
  for (const k of DEFAULT_MAP_KEYS) {
    if (typeof m[k] === "string") out[k] = m[k];
  }
  return out;
}

saveMapBtn.addEventListener("click", () => {
  const inputs = document.querySelectorAll("input[type='color'][data-char]");
  const newMap = {};
  inputs.forEach(inp => { newMap[inp.dataset.char] = inp.value; });
  chrome.storage.sync.set({ gc_map: newMap }, () => {
    mapStatus.textContent = "Saved!"; setTimeout(() => mapStatus.textContent = "", 1200);
  });
});

useWhitelist.addEventListener("change", () => {
  chrome.storage.sync.set({ gc_use_whitelist: useWhitelist.checked });
});

saveWL.addEventListener("click", () => {
  const wl = parseLines(whitelistBox.value);
  chrome.storage.sync.set({ gc_whitelist: wl }, () => {
    wlStatus.textContent = "Whitelist saved"; setTimeout(() => wlStatus.textContent = "", 1200);
  });
});

saveBL.addEventListener("click", () => {
  const bl = parseLines(blacklistBox.value);
  chrome.storage.sync.set({ gc_blacklist: bl }, () => {
    blStatus.textContent = "Blacklist saved"; setTimeout(() => blStatus.textContent = "", 1200);
  });
});
