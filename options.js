
const DEFAULT_MAP_KEYS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ..."0123456789"];
const DEFAULT_MAP = {
  "0": "#000000",
  "1": "#c1c337",
  "2": "#0011ff",
  "3": "#2da725",
  "4": "#b2752e",
  "5": "#f50559",
  "6": "#bd54c4",
  "7": "#33d1c6",
  "8": "#db831f",
  "9": "#cd9dbb",
  "A": "#ec092b",
  "B": "#7592ae",
  "C": "#4ab58c",
  "D": "#8d3011",
  "E": "#c1b20b",
  "F": "#995ec9",
  "G": "#3a5e03",
  "H": "#6b544c",
  "I": "#009b9e",
  "J": "#bc2485",
  "K": "#943b00",
  "L": "#8b9f65",
  "M": "#009411",
  "N": "#996900",
  "O": "#c40892",
  "P": "#23518e",
  "Q": "#ac1111",
  "R": "#caa316",
  "S": "#39a5c0",
  "T": "#cb9386",
  "U": "#a8a8a8",
  "V": "#495069",
  "W": "#304ee8",
  "X": "#ff9742",
  "Y": "#e53852",
  "Z": "#59d507"
};
const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/i;

// Bor et al. colors (trained set)
const BOR_MAP = { B:"#000099", D:"#993300", E:"#66FF66", G:"#008000", I:"#00CCFF", O:"#FFA117", P:"#FF00FF", Q:"#800080", R:"#FF0000", U:"#808080", W:"#FFFFFF", X:"#555555", Y:"#FFFF00" };

// Typical numbers-only starter
const NUMS_Typical = { "0":"#000000", "1":"#787878", "2":"#0000FF", "3":"#00AA00", "4":"#FF0000", "5":"#FFD700", "6":"#800080", "7":"#8B4513", "8":"#FF8C00", "9":"#FF1493" };

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

const schemeBox = document.getElementById("schemeBox");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const schemeStatus = document.getElementById("schemeStatus");

const presetStatus = document.getElementById("presetStatus");
const presetFull = document.getElementById("presetFull");
const presetBor = document.getElementById("presetBor");
const presetNums = document.getElementById("presetNums");
const presetLetters = document.getElementById("presetLetters");

function cell(char, val) {
  const wrap = document.createElement("div"); wrap.className = "cell";
  const label = document.createElement("label"); label.textContent = char;
  const input = document.createElement("input"); input.type = "color"; input.dataset.char = char;
  const none = document.createElement("input"); none.type = "checkbox"; none.dataset.char = char;
  const noneLbl = document.createElement("span"); noneLbl.textContent = "no color";

  if (typeof val === "string" && val.toLowerCase() === "transparent") {
    none.checked = true; input.disabled = true; input.value = "#000000";
  } else {
    input.value = val && HEX_RE.test(val) ? val : "#000000";
  }

  none.addEventListener("change", () => { input.disabled = none.checked; });
  const row1 = document.createElement("div"); row1.appendChild(label);
  const row2 = document.createElement("div"); row2.appendChild(input);
  const row3 = document.createElement("label"); row3.style.fontWeight="normal"; row3.appendChild(none); row3.appendChild(noneLbl);
  wrap.appendChild(row1); wrap.appendChild(row2); wrap.appendChild(row3);
  return wrap;
}

function render(map) {
  lettersEl.innerHTML = ""; digitsEl.innerHTML = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch => lettersEl.appendChild(cell(ch, map[ch])));
  "0123456789".split("").forEach(ch => digitsEl.appendChild(cell(ch, map[ch])));
}

function validateMap(m) {
  if (!m || typeof m !== "object") return null;
  const out = {};
  for (const k of DEFAULT_MAP_KEYS) {
    const v = m[k];
    if (typeof v === "string" && (HEX_RE.test(v) || v.toLowerCase() === "transparent")) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

function parseTextScheme(text) {
  text = (text || "").trim();
  if (!text) return null;
  if (text[0] === "{") {
    try { const obj = JSON.parse(text); return validateMap(obj); } catch { return null; }
  } else {
    const out = {};
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const s = line.trim(); if (!s) continue;
      const parts = s.replace(/[:=]/g," ").split(/\s+/);
      if (parts.length >= 2) {
        const key = parts[0].toUpperCase();
        const val = parts[1];
        if (DEFAULT_MAP_KEYS.includes(key) && (HEX_RE.test(val) || val.toLowerCase() === "transparent")) out[key] = val;
      }
    }
    return validateMap(out);
  }
}

function applyPresetToUI(map) {
  document.querySelectorAll("input[type='checkbox'][data-char]").forEach(chk => { chk.checked = false; });
  document.querySelectorAll("input[type='color'][data-char]").forEach(inp => { inp.disabled = false; });
  // Set all to transparent first for clarity
  document.querySelectorAll("input[type='checkbox'][data-char]").forEach(chk => { chk.checked = true; });
  document.querySelectorAll("input[type='color'][data-char]").forEach(inp => { inp.disabled = true; inp.value = "#000000"; });
  for (const [k,v] of Object.entries(map)) {
    const inp = document.querySelector(`input[type='color'][data-char='${k}']`);
    const chk = document.querySelector(`input[type='checkbox'][data-char='${k}']`);
    if (inp && chk) {
      if (typeof v === "string" && v.toLowerCase() === "transparent") { chk.checked = true; inp.disabled = true; inp.value = "#000000"; }
      else if (typeof v === "string" && HEX_RE.test(v)) { chk.checked = false; inp.disabled = false; inp.value = v; }
    }
  }
}

function presetFullMap() {
  const out = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("").forEach(k => {
    const v = DEFAULT_MAP[k];
    out[k] = (typeof v === "string" && v.toLowerCase() !== "transparent") ? v : "#000000";
  });
  return out;
}

function presetBorMap() {
  const out = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("").forEach(k => out[k] = "transparent");
  for (const [k,v] of Object.entries(BOR_MAP)) out[k] = v;
  return out;
}

function presetNumbersOnly() {
  const out = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(k => out[k] = "transparent");
  for (const [k,v] of Object.entries(NUMS_Typical)) out[k] = v;
  return out;
}

function presetLettersOnly() {
  const out = {};
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(k => out[k] = DEFAULT_MAP[k] || "#000000");
  "0123456789".split("").forEach(k => out[k] = "transparent");
  return out;
}

document.getElementById("presetFull").addEventListener("click", ()=> { applyPresetToUI(presetFullMap()); presetStatus.textContent = "Applied Full Color — click 'Save mapping'."; setTimeout(()=>presetStatus.textContent="",2000); });
document.getElementById("presetBor").addEventListener("click", ()=> { applyPresetToUI(presetBorMap()); presetStatus.textContent = "Applied Bor et al. — click 'Save mapping'."; setTimeout(()=>presetStatus.textContent="",2000); });
document.getElementById("presetNums").addEventListener("click", ()=> { applyPresetToUI(presetNumbersOnly()); presetStatus.textContent = "Applied Only Numbers — click 'Save mapping'."; setTimeout(()=>presetStatus.textContent="",2000); });
document.getElementById("presetLetters").addEventListener("click", ()=> { applyPresetToUI(presetLettersOnly()); presetStatus.textContent = "Applied Only Letters — click 'Save mapping'."; setTimeout(()=>presetStatus.textContent="",2000); });

chrome.storage.sync.get(["gc_map","gc_use_whitelist","gc_whitelist","gc_blacklist"], (res) => {
  const currentMap = validateMap(res.gc_map) || DEFAULT_MAP;
  render(currentMap);
  useWhitelist.checked = !!res.gc_use_whitelist;
  whitelistBox.value = (Array.isArray(res.gc_whitelist)? res.gc_whitelist: []).join("\n");
  blacklistBox.value = (Array.isArray(res.gc_blacklist)? res.gc_blacklist: []).join("\n");
});

saveMapBtn.addEventListener("click", () => {
  const colors = document.querySelectorAll("input[type='color'][data-char]");
  const checks = document.querySelectorAll("input[type='checkbox'][data-char]");
  const mapOut = {};
  colors.forEach(inp => { mapOut[inp.dataset.char] = inp.disabled ? "transparent" : inp.value; });
  checks.forEach(chk => { if (chk.checked) mapOut[chk.dataset.char] = "transparent"; });
  chrome.storage.sync.set({ gc_map: mapOut }, () => {
    mapStatus.textContent = "Saved mapping!"; setTimeout(() => mapStatus.textContent = "", 1200);
  });
});

useWhitelist.addEventListener("change", () => { chrome.storage.sync.set({ gc_use_whitelist: useWhitelist.checked }); });
saveWL.addEventListener("click", () => {
  const wl = whitelistBox.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  chrome.storage.sync.set({ gc_whitelist: wl }, () => { wlStatus.textContent = "Whitelist saved"; setTimeout(() => wlStatus.textContent = "", 1200); });
});
saveBL.addEventListener("click", () => {
  const bl = blacklistBox.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  chrome.storage.sync.set({ gc_blacklist: bl }, () => { blStatus.textContent = "Blacklist saved"; setTimeout(() => blStatus.textContent = "", 1200); });
});

document.getElementById("importBtn").addEventListener("click", () => {
  const parsed = parseTextScheme(schemeBox.value);
  if (!parsed) { schemeStatus.textContent = "Could not parse scheme."; setTimeout(() => schemeStatus.textContent = "", 2000); return; }
  applyPresetToUI(parsed);
  schemeStatus.textContent = "Imported! Click 'Save mapping'."; setTimeout(() => schemeStatus.textContent = "", 1500);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const colors = document.querySelectorAll("input[type='color'][data-char]");
  const checks = document.querySelectorAll("input[type='checkbox'][data-char]");
  const out = {};
  colors.forEach(inp => { out[inp.dataset.char] = inp.disabled ? "transparent" : inp.value; });
  checks.forEach(chk => { if (chk.checked) out[chk.dataset.char] = "transparent"; });
  schemeBox.value = JSON.stringify(out, null, 2);
  schemeStatus.textContent = "Exported to text box — copy it."; setTimeout(() => schemeStatus.textContent = "", 1500);
});
