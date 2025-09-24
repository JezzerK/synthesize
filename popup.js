
const toggle = document.getElementById("toggle");
const openOptions = document.getElementById("openOptions");
const openDrill = document.getElementById("openDrill");
const hostEl = document.getElementById("host");
const hostStatus = document.getElementById("hostStatus");
const allowBtn = document.getElementById("allowBtn");
const blockBtn = document.getElementById("blockBtn");
const clearBtn = document.getElementById("clearBtn");

function getActiveTab(cb) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => cb(tabs[0]));
}

function isHttpUrl(url) {
  try { const u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function safeSendMessage(tabId, msg, cb) {
  try {
    chrome.tabs.sendMessage(tabId, msg, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        cb({ error: chrome.runtime.lastError?.message || "no receiver" });
      } else {
        cb(resp);
      }
    });
  } catch (e) {
    cb({ error: String(e) });
  }
}

function setUiForUnsupported(hostLabel) {
  hostEl.textContent = hostLabel;
  hostStatus.textContent = "— unsupported tab";
  allowBtn.disabled = true;
  blockBtn.disabled = true;
  clearBtn.disabled = true;
}

function setUiForHost(host, status) {
  hostEl.textContent = host;
  hostStatus.textContent = `— ${status}`;
  allowBtn.disabled = false;
  blockBtn.disabled = false;
  clearBtn.disabled = false;
}

function updateStatus() {
  chrome.storage.sync.get(["gc_enabled"], (res) => {
    toggle.checked = res.gc_enabled !== false;
    getActiveTab((tab) => {
      if (!tab || !isHttpUrl(tab.url)) {
        setUiForUnsupported("(no http/https page)");
        return;
      }
      safeSendMessage(tab.id, {type:"GET_HOST_STATUS"}, (resp) => {
        if (resp && !resp.error) {
          const status = resp.enabled ? (resp.allowed ? "Allowed" : "Blocked") : "Disabled";
          setUiForHost(resp.host || "(no host)", status);
        } else {
          setUiForUnsupported("(page not scriptable)");
        }
      });
    });
  });
}
updateStatus();

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ gc_enabled: toggle.checked }, updateStatus);
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

openDrill.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("drill.html") });
});

function modifyHost(action) {
  getActiveTab((tab) => {
    if (!tab || !isHttpUrl(tab.url)) return;
    safeSendMessage(tab.id, {type:"GET_HOST_STATUS"}, (resp) => {
      const host = resp && resp.host;
      if (!host) return;
      chrome.storage.sync.get(["gc_whitelist","gc_blacklist"], (res) => {
        const wl = new Set(Array.isArray(res.gc_whitelist) ? res.gc_whitelist : []);
        const bl = new Set(Array.isArray(res.gc_blacklist) ? res.gc_blacklist : []);
        if (action === "allow") { wl.add(host); bl.delete(host); }
        if (action === "block") { bl.add(host); wl.delete(host); }
        if (action === "clear") { wl.delete(host); bl.delete(host); }
        chrome.storage.sync.set({ gc_whitelist: Array.from(wl), gc_blacklist: Array.from(bl) }, updateStatus);
      });
    });
  });
}

allowBtn.addEventListener("click", () => modifyHost("allow"));
blockBtn.addEventListener("click", () => modifyHost("block"));
clearBtn.addEventListener("click", () => modifyHost("clear"));
