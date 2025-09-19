// content.js — performant + whitelist/blacklist

const DEFAULT_MAP = {
  A:"#ff5e5e", B:"#ff8a3d", C:"#ffbf3f", D:"#ffe14d", E:"#d6ff5d", F:"#9dff6a",
  G:"#66ff8a", H:"#52ffbe", I:"#4fe3ff", J:"#4ebaff", K:"#5a8cff", L:"#7b66ff",
  M:"#a066ff", N:"#c466ff", O:"#ff66f2", P:"#ff66bd", Q:"#ff6691", R:"#ff6f6f",
  S:"#ff944d", T:"#ffc24d", U:"#f2e64d", V:"#cfff4d", W:"#9bff4d", X:"#66ff66",
  Y:"#4dff9f", Z:"#4dffd6",
  "0":"#aaaaaa","1":"#ff4444","2":"#ff8844","3":"#ffcc44","4":"#ccff44",
  "5":"#88ff44","6":"#44ff88","7":"#44ffcc","8":"#44ccff","9":"#4488ff"
};

const BLOCKED_TAGS = new Set(["SCRIPT","STYLE","NOSCRIPT","IFRAME","IMG","VIDEO","AUDIO","CANVAS","CODE","PRE","TEXTAREA","INPUT","SVG","MATH"]);
const MARK_ATTR = "data-gc-colored";
const HAS_TEXT_RE = /[A-Za-z0-9]/;
const MAX_NODE_LEN = 2000;
const BATCH_NODE_LIMIT = 300;

let enabled = true;
let map = null;
let useWhitelist = false;
let whitelist = []; // array of host globs
let blacklist = []; // array of host globs

// idle helper
const rIC = window.requestIdleCallback || function (cb) { return setTimeout(() => cb({timeRemaining: () => 0}), 16); };
const cIC = window.cancelIdleCallback || clearTimeout;

// queue + control
let queue = [];
let pumping = false;
let killSwitch = false;
let idleHandle = null;

// Host matching helpers
function hostMatches(host, pattern) {
  // pattern can be exact host ("example.com"), subdomain glob ("*.example.com"), or suffix (".example.com")
  if (!pattern || !host) return false;
  pattern = pattern.trim().toLowerCase();
  host = host.toLowerCase();
  if (pattern === host) return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".example.com"
    return host.endsWith(suffix);
  }
  if (pattern.startsWith(".")) {
    return host.endsWith(pattern);
  }
  // fall back to exact
  return host === pattern;
}

function isHostAllowed(host) {
  // If whitelist mode: only allow if matches any whitelist pattern
  if (useWhitelist) {
    const allowed = whitelist.some(p => hostMatches(host, p));
    return allowed && !blacklist.some(p => hostMatches(host, p));
  } else {
    // default allow unless blacklisted
    return !blacklist.some(p => hostMatches(host, p));
  }
}

// Load settings
chrome.storage.sync.get(
  ["gc_enabled","gc_map","gc_use_whitelist","gc_whitelist","gc_blacklist"],
  (res) => {
    enabled = res.gc_enabled !== false;
    map = validateMap(res.gc_map) || DEFAULT_MAP;
    useWhitelist = !!res.gc_use_whitelist;
    whitelist = Array.isArray(res.gc_whitelist) ? res.gc_whitelist : [];
    blacklist = Array.isArray(res.gc_blacklist) ? res.gc_blacklist : [];

    const host = location.hostname;
    if (!isHostAllowed(host)) {
      // Do nothing on disallowed hosts
      return;
    }
    if (enabled) {
      bootstrap();
    }
  }
);

chrome.storage.onChanged.addListener((changes) => {
  let mustReload = false;
  if ("gc_use_whitelist" in changes || "gc_whitelist" in changes || "gc_blacklist" in changes) {
    useWhitelist = changes.gc_use_whitelist?.newValue ?? useWhitelist;
    whitelist   = changes.gc_whitelist?.newValue ?? whitelist;
    blacklist   = changes.gc_blacklist?.newValue ?? blacklist;
    // If host permission changes invalidate current page
    mustReload = true;
  }
  if ("gc_enabled" in changes) {
    enabled = changes.gc_enabled.newValue !== false;
    mustReload = true;
  }
  if ("gc_map" in changes) {
    map = validateMap(changes.gc_map.newValue) || DEFAULT_MAP;
    if (enabled) {
      uncolorizeDocument();
      queue = [];
      bootstrap();
      return; // handled
    }
  }
  if (mustReload) {
    // reevaluate permission and enabled status
    const host = location.hostname;
    const allowed = isHostAllowed(host);
    if (!enabled || !allowed) {
      disconnectObserver();
      queue = [];
      uncolorizeDocument();
      return;
    } else {
      uncolorizeDocument();
      queue = [];
      bootstrap();
    }
  }
});

function validateMap(m) {
  if (!m || typeof m !== "object") return null;
  const out = {};
  for (const k of Object.keys(m)) {
    const K = k.length === 1 ? k.toUpperCase() : k;
    if (typeof m[k] === "string") out[K] = m[k];
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

function pump() {
  if (pumping || !enabled || killSwitch) return;
  pumping = true;
  idleHandle = rIC(processBatch);
}

function processBatch(deadline) {
  try {
    let processed = 0;
    while (queue.length && processed < BATCH_NODE_LIMIT && (deadline.timeRemaining?.() ?? 0) > 1) {
      const node = queue.shift();
      if (!node || !node.parentNode) continue;
      colorizeTextNode(node);
      processed++;
    }
  } catch (e) {
    console.warn("[Grapheme→Color] Error during processing; disabling on this page:", e);
    killSwitch = true;
  } finally {
    pumping = false;
    if (enabled && !killSwitch && queue.length) pump();
  }
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
    let n;
    while ((n = walker.nextNode())) enqueue(n);
  });
  observeMutations(true);
}

let observer = null;
function observeMutations(restart=false) {
  if (observer && !restart) return;
  if (observer && restart) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    if (!enabled || killSwitch) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          enqueue(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (BLOCKED_TAGS.has(node.nodeName)) continue;
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
          let t;
          let count = 0;
          while ((t = walker.nextNode()) && count < 1500) {
            enqueue(t);
            count++;
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (idleHandle) {
    cIC(idleHandle);
    idleHandle = null;
  }
}

function colorizeTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text || !HAS_TEXT_RE.test(text)) return;

  let hasMapped = false;
  for (let i = 0; i < text.length; i++) {
    if (map[text[i].toUpperCase()]) { hasMapped = true; break; }
  }
  if (!hasMapped) return;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const upper = ch.toUpperCase();
    if (map[upper]) {
      const span = document.createElement("span");
      span.setAttribute(MARK_ATTR, "1");
      span.style.color = map[upper];
      span.textContent = ch;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(ch));
    }
  }

  if (textNode.parentNode) {
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

function uncolorizeDocument() {
  const spans = document.querySelectorAll(`span[${MARK_ATTR}]`);
  for (const s of spans) unwrapSpan(s);
}

function unwrapSpan(span) {
  const parent = span.parentNode;
  if (!parent) return;
  const txt = document.createTextNode(span.textContent || "");
  parent.replaceChild(txt, span);
  parent.normalize();
}
