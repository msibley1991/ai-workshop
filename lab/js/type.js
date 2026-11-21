// type.html only: switches the candidate typeface (body[data-type], see
// css/type.css) with keys 1-5, the bottom-bar buttons and the URL hash
// (#saira-wide etc.), remembers it in localStorage, and runs the grid toggle.
// Every change fires `lab:layout` so the raster re-measures.

const NAMES = {
  "saira-wide": "Saira, extended display",
  saira: "Saira, one width",
  "michroma-oxanium": "Michroma display + Oxanium text",
  chakra: "Chakra Petch",
  "michroma-chakra": "Michroma display + Chakra Petch text",
};
const IDS = Object.keys(NAMES);
const TYPE_KEY = "lab-type-candidate";
const GRID_KEY = "lab-layout-grid";

const site = document.getElementById("content");
const picks = [...site.querySelectorAll("[data-pick]")];
const current = site.querySelector(".type-current");
const relayout = () => window.dispatchEvent(new Event("lab:layout"));

function pick(id) {
  if (!(id in NAMES)) return;
  document.body.dataset.type = id;
  current.textContent = NAMES[id];
  picks.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pick === id)));
  if (location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  try { localStorage.setItem(TYPE_KEY, id); } catch {}
  // Re-measure now and again once the new faces have loaded.
  relayout();
  document.fonts.ready.then(relayout);
}

picks.forEach((b) => b.addEventListener("click", () => pick(b.dataset.pick)));

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-5]$/.test(e.key)) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  pick(IDS[Number(e.key) - 1]);
});
window.addEventListener("hashchange", () => pick(location.hash.slice(1)));

// Grid toggle (shares its remembered state with layout.html).
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

// Hover/focus states change ink, so re-measure on them.
for (const b of [...picks, gridToggle]) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) b.addEventListener(type, relayout);
}

let saved = null;
try { saved = localStorage.getItem(TYPE_KEY); } catch {}
pick(location.hash.slice(1) in NAMES ? location.hash.slice(1) : saved in NAMES ? saved : IDS[0]);
