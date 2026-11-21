// hierarchy.html only: a "Type scale" dial panel that sets each role's size,
// line-height and weight (CSS --r-<role>-size / -lh / -wt, in units), the
// intro/section view switch, presets on keys 1-4 and the grid toggle.
// Sizes are limited to the spacing scale; line-heights step by 4.
// Every change fires `lab:layout` so the raster re-measures.
import { createDialKit } from "../vendor/dialkit/index.js";

const SCALE = ["16", "24", "32", "48", "64", "96", "128"];
const WEIGHTS = ["400", "500", "700"]; // the Chakra Petch weights that ship
const ROLES = ["display", "headline", "statement", "body", "label", "bar", "code"];

const PRESETS = {
  "statement-led": {
    display: [128, 128, 700], headline: [64, 64, 700], statement: [48, 56, 500], body: [32, 40, 400],
    label: [24, 32, 500], bar: [16, 24, 500], code: [24, 32, 400],
  },
  "tight-leading": {
    display: [128, 112, 700], headline: [64, 56, 700], statement: [48, 48, 500], body: [32, 40, 400],
    label: [24, 24, 500], bar: [16, 16, 500], code: [24, 32, 400],
  },
  // The user's tuned spec (4-unit line-heights), kept for comparison.
  tuned: {
    display: [128, 128, 700], headline: [64, 64, 700], statement: [48, 52, 500], body: [32, 36, 400],
    label: [24, 28, 500], bar: [16, 16, 500], code: [24, 32, 400],
  },
  // The tuned spec snapped to 8: tight where lines are short, open for body.
  mixed: {
    display: [128, 128, 700], headline: [64, 64, 700], statement: [48, 48, 500], body: [32, 40, 400],
    label: [24, 24, 500], bar: [16, 16, 500], code: [24, 32, 400],
  },
};
const KEYED = ["statement-led", "tight-leading", "tuned", "mixed"];
const toValues = (preset) => Object.fromEntries(Object.entries(preset).map(([role, [size, lh, wt]]) =>
  [role, { size: String(size), lineHeight: lh, weight: role === "code" ? wt : String(wt) }]));

const base = PRESETS["statement-led"];
const config = Object.fromEntries(ROLES.map((role) => {
  const [size, lh, wt] = base[role];
  return [role, {
    size: { type: "select", options: SCALE, default: String(size) },
    lineHeight: [lh, 8, 160, 4],
    // Code is JetBrains Mono (variable 100-800); the rest is Chakra Petch (400/500/700).
    weight: role === "code" ? [wt, 100, 800, 100] : { type: "select", options: WEIGHTS, default: String(wt) },
  }];
}));
config.presets = {
  statementLed: { type: "action", label: "1 Statement-led" },
  tightLeading: { type: "action", label: "2 Tight leading" },
  tuned: { type: "action", label: "3 Your tuned spec" },
  mixed: { type: "action", label: "4 Snapped to 8 (mixed)" },
  copy: { type: "action", label: "Copy spec" },
};

const site = document.getElementById("content");
const specEl = site.querySelector(".h-spec");
const relayout = () => window.dispatchEvent(new Event("lab:layout"));

function specText(v) {
  return ROLES.map((r) => `${r} ${v[r].size}/${v[r].lineHeight} ${v[r].weight}`).join(" · ");
}

const kit = createDialKit("Type scale", config, {
  id: "lab-type-scale",
  persist: true,
  onAction: async (path) => {
    if (path === "presets.statementLed") kit.setValues(toValues(PRESETS["statement-led"]));
    if (path === "presets.tightLeading") kit.setValues(toValues(PRESETS["tight-leading"]));
    if (path === "presets.tuned") kit.setValues(toValues(PRESETS.tuned));
    if (path === "presets.mixed") kit.setValues(toValues(PRESETS.mixed));
    if (path === "presets.copy") {
      try { await navigator.clipboard.writeText(specText(kit.getValues())); } catch (err) { console.error("[lab]", err); }
    }
  },
});

kit.subscribe((v) => {
  const root = document.documentElement.style;
  for (const role of ROLES) {
    root.setProperty(`--r-${role}-size`, `calc(${v[role].size} * var(--u))`);
    root.setProperty(`--r-${role}-lh`, `calc(${v[role].lineHeight} * var(--u))`);
    root.setProperty(`--r-${role}-wt`, String(v[role].weight));
  }
  specEl.textContent = specText(v);
  relayout();
});

// ---- Views -------------------------------------------------------------------
const viewPicks = [...site.querySelectorAll("[data-view-pick]")];
function view(name) {
  if (name !== "intro" && name !== "section") return;
  document.body.dataset.view = name;
  viewPicks.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.viewPick === name)));
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  relayout();
}
viewPicks.forEach((b) => b.addEventListener("click", () => view(b.dataset.viewPick)));
site.querySelectorAll(".site-tab-label").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); view("section"); }));
window.addEventListener("hashchange", () => view(location.hash.slice(1)));

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panels alone
  const k = e.key.toLowerCase();
  if (/^[1-4]$/.test(k)) kit.setValues(toValues(PRESETS[KEYED[Number(k) - 1]]));
  else if (k === "i") view("intro");
  else if (k === "s") view("section");
});

// ---- Grid toggle (shared state with the other canvas pages) -------------------
const GRID_KEY = "lab-layout-grid";
const gridToggle = site.querySelector(".type-grid-toggle");
const gridOverlay = site.querySelector(".site-grid-overlay");
function showGrid(on) {
  gridOverlay.hidden = !on;
  gridToggle.setAttribute("aria-pressed", String(on));
  gridToggle.firstElementChild.textContent = on ? "Grid: on" : "Grid: off";
  try { localStorage.setItem(GRID_KEY, on ? "1" : "0"); } catch {}
  relayout();
}
gridToggle.addEventListener("click", () => showGrid(gridOverlay.hidden));
try { if (localStorage.getItem(GRID_KEY) === "1") showGrid(true); } catch {}

for (const b of [...viewPicks, gridToggle, ...site.querySelectorAll(".site-tab-label")]) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) b.addEventListener(type, relayout);
}

view(location.hash.slice(1) === "intro" ? "intro" : "section");
