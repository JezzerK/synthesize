const toggle = document.getElementById("toggle");
const openOptions = document.getElementById("openOptions");

// Reflect current global enabled state
chrome.storage.sync.get(["gc_enabled"], (res) => {
  toggle.checked = res.gc_enabled !== false;
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ gc_enabled: toggle.checked });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
