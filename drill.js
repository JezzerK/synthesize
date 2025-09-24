
const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;
const DEFAULT_KEYS_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEFAULT_KEYS_DIGITS = "0123456789".split("");

const stim = document.getElementById("stim");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const note = document.getElementById("note");
const progress = document.getElementById("progress");

let abortRun = false;

function validateMap(m) {
  const out = {};
  if (!m || typeof m !== "object") return out;
  for (const [k, v] of Object.entries(m)) {
    const K = (k.length === 1 ? k.toUpperCase() : k);
    if (typeof v === "string" && (HEX_RE.test(v) || v.toLowerCase() === "transparent")) {
      out[K] = v;
    }
  }
  return out;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function runDrill(mode, map) {
  abortRun = false;
  startBtn.classList.add("hidden");
  stopBtn.classList.remove("hidden");
  progress.textContent = "";
  note.textContent = "";

  const keys = (mode === "numbers" ? DEFAULT_KEYS_DIGITS : DEFAULT_KEYS_LETTERS)
    .filter(k => typeof map[k] === "string" && map[k].toLowerCase() !== "transparent")
    .sort((a,b) => a.localeCompare(b));

  if (keys.length === 0) {
    note.textContent = "No characters have colors assigned for this mode.";
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
    return;
  }

  let totalSteps = 0;
  const schedule = [];
  for (let cycle = 1; cycle <= 2; cycle++) {
    for (const k of keys) {
      const color = map[k];
      const reps = Math.floor(Math.random() * 8) + 3; // 3..10
      for (let r = 0; r < reps; r++) {
        schedule.push({ type: "char", char: k, color, ms: 1000 });
        schedule.push({ type: "bg", color, ms: 500 });
        totalSteps += 2;
      }
    }
  }

  let stepIndex = 0;
  const originalBg = document.body.style.backgroundColor || "";
  const originalColor = stim.style.color || "";
  const originalHtmlBg = document.documentElement.style.backgroundColor || "";

  try {
    for (const step of schedule) {
      if (abortRun) break;
      stepIndex++;

      if (step.type === "char") {
        document.documentElement.style.backgroundColor = "#ffffff";
        document.body.style.backgroundColor = "#ffffff";
        stim.textContent = step.char;
        stim.style.color = step.color;
      } else if (step.type === "bg") {
        stim.textContent = "";
        document.documentElement.style.backgroundColor = step.color;
        document.body.style.backgroundColor = step.color;
      }

      progress.textContent = `Step ${stepIndex}/${totalSteps}`;
      await sleep(step.ms);
    }
  } finally {
    stim.textContent = "";
    stim.style.color = originalColor;
    document.body.style.backgroundColor = originalBg;
    document.documentElement.style.backgroundColor = originalHtmlBg;
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
    progress.textContent = "";
  }
}

startBtn.addEventListener("click", () => {
  const mode = (document.querySelector('input[name="mode"]:checked')?.value || "letters");
  chrome.storage.sync.get(["gc_map"], (res) => {
    const map = validateMap(res.gc_map || {});
    runDrill(mode, map);
  });
});

stopBtn.addEventListener("click", () => { abortRun = true; });
