const toggle = document.getElementById("toggle");
const openOptions = document.getElementById("openOptions");
const hostEl = document.getElementById("host");
const hostStatus = document.getElementById("hostStatus");
const allowBtn = document.getElementById("allowBtn");
const blockBtn = document.getElementById("blockBtn");
const clearBtn = document.getElementById("clearBtn");

function getActiveTab(cb) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => cb(tabs[0]));
}

function updateStatus() {
  chrome.storage.sync.get(["gc_enabled","gc_use_whitelist","gc_whitelist","gc_blacklist"], (res) => {
    toggle.checked = res.gc_enabled !== false;
    const wl = Array.isArray(res.gc_whitelist) ? res.gc_whitelist : [];
    const bl = Array.isArray(res.gc_blacklist) ? res.gc_blacklist : [];
    const useWl = !!res.gc_use_whitelist;

    getActiveTab((tab) => {
      try {
        const url = new URL(tab.url);
        const host = url.hostname;
        hostEl.textContent = host;
        const status = hostStatusFor(host, useWl, wl, bl);
        hostStatus.textContent = `— ${status}`;
      } catch {
        hostEl.textContent = "(no host)";
        hostStatus.textContent = "";
      }
    });
  });
}

function hostStatusFor(host, useWl, wl, bl) {
  const inWL = wl.some(p => hostMatches(host, p));
  const inBL = bl.some(p => hostMatches(host, p));
  if (inBL) return "Blocked";
  if (useWl) return inWL ? "Allowed (whitelist)" : "Blocked (whitelist)";
  return inWL ? "Allowed (whitelist entry present)" : "Allowed (default)";
}

function hostMatches(host, pattern) {
  if (!pattern || !host) return false;
  pattern = pattern.trim().toLowerCase();
  host = host.toLowerCase();
  if (pattern === host) return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return host.endsWith(suffix);
  }
  if (pattern.startsWith(".")) {
    return host.endsWith(pattern);
  }
  return host === pattern;
}

// init
updateStatus();

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ gc_enabled: toggle.checked }, updateStatus);
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

allowBtn.addEventListener("click", () => {
  getActiveTab((tab) => {
    const host = new URL(tab.url).hostname;
    chrome.storage.sync.get(["gc_whitelist","gc_blacklist"], (res) => {
      const wl = new Set(Array.isArray(res.gc_whitelist) ? res.gc_whitelist : []);
      const bl = new Set(Array.isArray(res.gc_blacklist) ? res.gc_blacklist : []);
      wl.add(host);
      bl.delete(host);
      chrome.storage.sync.set({ gc_whitelist: Array.from(wl), gc_blacklist: Array.from(bl) }, updateStatus);
    });
  });
});

blockBtn.addEventListener("click", () => {
  getActiveTab((tab) => {
    const host = new URL(tab.url).hostname;
    chrome.storage.sync.get(["gc_whitelist","gc_blacklist"], (res) => {
      const wl = new Set(Array.isArray(res.gc_whitelist) ? res.gc_whitelist : []);
      const bl = new Set(Array.isArray(res.gc_blacklist) ? res.gc_blacklist : []);
      bl.add(host);
      wl.delete(host);
      chrome.storage.sync.set({ gc_whitelist: Array.from(wl), gc_blacklist: Array.from(bl) }, updateStatus);
    });
  });
});

clearBtn.addEventListener("click", () => {
  getActiveTab((tab) => {
    const host = new URL(tab.url).hostname;
    chrome.storage.sync.get(["gc_whitelist","gc_blacklist"], (res) => {
      const wl = new Set(Array.isArray(res.gc_whitelist) ? res.gc_whitelist : []);
      const bl = new Set(Array.isArray(res.gc_blacklist) ? res.gc_blacklist : []);
      wl.delete(host);
      bl.delete(host);
      chrome.storage.sync.set({ gc_whitelist: Array.from(wl), gc_blacklist: Array.from(bl) }, updateStatus);
    });
  });
});
