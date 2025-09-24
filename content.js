
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
const BLOCKED_TAGS = new Set(["SCRIPT","STYLE","NOSCRIPT","IFRAME","IMG","VIDEO","AUDIO","CANVAS","CODE","PRE","TEXTAREA","INPUT","SVG","MATH"]);
const MARK_ATTR = "data-gc-colored";
const HAS_TEXT_RE = /[A-Za-z0-9]/;
const MAX_NODE_LEN = 2000;
const BATCH_NODE_LIMIT = 300;

let enabled = true;
let map = null;
let useWhitelist = false;
let whitelist = [];
let blacklist = [];

const rIC = window.requestIdleCallback || function (cb) { return setTimeout(() => cb({timeRemaining: () => 0}), 16); };
const cIC = window.cancelIdleCallback || clearTimeout;

let queue = [];
let pumping = false;
let killSwitch = false;
let idleHandle = null;
let observer = null;

function hostMatches(host, pattern) {
  if (!pattern || !host) return false;
  pattern = pattern.trim().toLowerCase();
  host = host.toLowerCase();
  if (pattern === host) return true;
  if (pattern.startsWith("*.")) { const suffix = pattern.slice(1); return host.endsWith(suffix); }
  if (pattern.startsWith(".")) { return host.endsWith(pattern); }
  return host === pattern;
}

function isHostAllowed(host) {
  if (useWhitelist) {
    const allowed = (whitelist||[]).some(p => hostMatches(host, p));
    return allowed && !(blacklist||[]).some(p => hostMatches(host, p));
  } else {
    return !(blacklist||[]).some(p => hostMatches(host, p));
  }
}

chrome.storage.sync.get(["gc_enabled","gc_map","gc_use_whitelist","gc_whitelist","gc_blacklist"], (res) => {
  enabled = res.gc_enabled !== false;
  map = validateMap(res.gc_map) || DEFAULT_MAP;
  useWhitelist = !!res.gc_use_whitelist;
  whitelist = Array.isArray(res.gc_whitelist) ? res.gc_whitelist : [];
  blacklist = Array.isArray(res.gc_blacklist) ? res.gc_blacklist : [];

  const host = location.hostname;
  if (!isHostAllowed(host)) return;
  if (enabled) bootstrap();
});

chrome.storage.onChanged.addListener((changes) => {
  let mustReload = false;
  if ("gc_use_whitelist" in changes || "gc_whitelist" in changes || "gc_blacklist" in changes) {
    useWhitelist = changes.gc_use_whitelist?.newValue ?? useWhitelist;
    whitelist   = changes.gc_whitelist?.newValue ?? whitelist;
    blacklist   = changes.gc_blacklist?.newValue ?? blacklist;
    mustReload = true;
  }
  if ("gc_enabled" in changes) { enabled = changes.gc_enabled.newValue !== false; mustReload = true; }
  if ("gc_map" in changes) {
    map = validateMap(changes.gc_map.newValue) || DEFAULT_MAP;
    if (enabled) { uncolorizeDocument(); queue = []; bootstrap(); return; }
  }
  if (mustReload) {
    const host = location.hostname;
    const allowed = isHostAllowed(host);
    if (!enabled || !allowed) { disconnectObserver(); queue = []; uncolorizeDocument(); return; }
    else { uncolorizeDocument(); queue = []; bootstrap(); }
  }
});

function validateMap(m) {
  if (!m || typeof m !== "object") return null;
  const out = {};
  for (const k of Object.keys(m)) {
    const v = m[k];
    if (typeof v === "string") out[(k.length===1?k.toUpperCase():k)] = v;
  }
  return out;
}

function enqueue(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const p = node.parentNode;
  if (!p || p.nodeType !== Node.ELEMENT_NODE) return;
  if (p.closest(`[${MARK_ATTR}]`)) return;
  if (BLOCKED_TAGS.has(p.nodeName)) return;
  if (p.isContentEditable || p.closest("[contenteditable='true']")) return;
  const text = node.nodeValue;
  if (!text || !HAS_TEXT_RE.test(text)) return;
  if (text.length > MAX_NODE_LEN) return;
  queue.push(node);
  pump();
}

function pump() { if (pumping || !enabled || killSwitch) return; pumping = true; idleHandle = rIC(processBatch); }

function processBatch(deadline) {
  try {
    let processed = 0;
    while (queue.length && processed < BATCH_NODE_LIMIT && (deadline.timeRemaining?.() ?? 0) > 1) {
      const node = queue.shift();
      if (!node || !node.parentNode) continue;
      colorizeTextNode(node);
      processed++;
    }
  } catch (e) { console.warn("[synthesize] processing error; disabling:", e); killSwitch = true; }
  finally { pumping = false; if (enabled && !killSwitch && queue.length) pump(); }
}

function bootstrap() {
  if (!document.body) return;
  rIC(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const p = node.parentNode;
        if (!p || p.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_REJECT;
        if (BLOCKED_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.isContentEditable || p.closest("[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
        const t = node.nodeValue;
        if (!t || !HAS_TEXT_RE.test(t) || t.length > MAX_NODE_LEN) return NodeFilter.FILTER_REJECT;
        if (p.closest(`[${MARK_ATTR}]`)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while ((n = walker.nextNode())) enqueue(n);
  });
  observeMutations(true);
}

function observeMutations(restart=false) {
  if (observer && !restart) return;
  if (observer && restart) observer.disconnect();
  observer = new MutationObserver((mutations) => {
    if (!enabled || killSwitch) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) enqueue(node);
        else if (node.nodeType === Node.ELEMENT_NODE) {
          if (BLOCKED_TAGS.has(node.nodeName)) continue;
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
          let t, c=0; while((t=walker.nextNode()) && c<1500) { enqueue(t); c++; }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function disconnectObserver() { if (observer) {observer.disconnect(); observer=null;} if (idleHandle) {cIC(idleHandle); idleHandle=null;} }

function colorizeTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text || !HAS_TEXT_RE.test(text)) return;
  let hasMapped = false;
  for (let i=0;i<text.length;i++) { const up = text[i].toUpperCase(); if (map[up] !== undefined) { hasMapped = true; break; } }
  if (!hasMapped) return;
  const frag = document.createDocumentFragment();
  for (let i=0;i<text.length;i++) {
    const ch = text[i]; const upper = ch.toUpperCase(); const val = map[upper];
    if (typeof val === "string" && val !== "transparent") {
      const span = document.createElement("span"); span.setAttribute(MARK_ATTR,"1"); span.style.color = val; span.textContent = ch; frag.appendChild(span);
    } else { frag.appendChild(document.createTextNode(ch)); }
  }
  if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
}

function uncolorizeDocument() {
  document.querySelectorAll(`span[${MARK_ATTR}]`).forEach(s => { const p=s.parentNode; if(!p) return; p.replaceChild(document.createTextNode(s.textContent||""), s); p.normalize(); });
}

// Message listener for popup (host status)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "GET_HOST_STATUS") return;
  try {
    const host = location.hostname;
    // mirror the allowed logic
    let allowed = true;
    if (useWhitelist) {
      allowed = (whitelist||[]).some(p => hostMatches(host, p)) && !(blacklist||[]).some(p => hostMatches(host, p));
    } else {
      allowed = !(blacklist||[]).some(p => hostMatches(host, p));
    }
    sendResponse({host, allowed, enabled});
  } catch(e) { sendResponse({error:String(e)}); }
  return true;
});
