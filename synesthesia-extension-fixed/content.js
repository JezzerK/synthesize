// Optimized Grapheme→Color content script

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

let enabled = true;
let map = null;

// Load settings
chrome.storage.sync.get(["gc_enabled","gc_map"], (res) => {
  enabled = res.gc_enabled !== false;
  map = validateMap(res.gc_map) || DEFAULT_MAP;
  if (enabled) {
    colorizeDocument();
    observeMutations();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if ("gc_enabled" in changes) {
    enabled = changes.gc_enabled.newValue !== false;
    if (enabled) {
      colorizeDocument();
      observeMutations(true);
    } else {
      uncolorizeDocument();
      disconnectObserver();
    }
  }
  if ("gc_map" in changes) {
    map = validateMap(changes.gc_map.newValue) || DEFAULT_MAP;
    if (enabled) {
      uncolorizeDocument();
      colorizeDocument();
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

let observer = null;
function observeMutations(restart=false) {
  if (observer && !restart) return;
  if (observer && restart) observer.disconnect();

  let scheduled = false;

  observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    if (!scheduled) {
      scheduled = true;
      requestIdleCallback(() => {
        scheduled = false;
        const added = [];
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              if (node.nodeValue.length < 2000) added.push(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              if (!BLOCKED_TAGS.has(node.nodeName)) {
                added.push(node);
              }
            }
          }
        }
        for (const n of added) {
          if (n.nodeType === Node.TEXT_NODE) {
            colorizeTextNode(n);
          } else {
            colorizeSubtree(n);
          }
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function colorizeDocument() {
  if (!document.body) return;
  colorizeSubtree(document.body);
}

function uncolorizeDocument() {
  const spans = document.querySelectorAll(`span[${MARK_ATTR}]`);
  for (const s of spans) unwrapSpan(s);
}

function colorizeSubtree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.nodeValue.length > 2000) return NodeFilter.FILTER_REJECT;
      const p = node.parentNode;
      if (!p || p.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_REJECT;
      if (p.closest(`[${MARK_ATTR}]`)) return NodeFilter.FILTER_REJECT;
      if (BLOCKED_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
      if (p.isContentEditable || (p.closest("[contenteditable='true']"))) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) colorizeTextNode(n);
}

function colorizeTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text) return;

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

function unwrapSpan(span) {
  const parent = span.parentNode;
  if (!parent) return;
  const txt = document.createTextNode(span.textContent || "");
  parent.replaceChild(txt, span);
  parent.normalize();
}
