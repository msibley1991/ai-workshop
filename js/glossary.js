// glossary.html only (in place of layout.js, which drives the talk's accordion
// and slides). The entries column scrolls inside its box; the index, the footer
// strip and the URL (#<slug>) follow the entry at the top of the column.
// Clicking a term (in the index or a cross-link), ↑ ↓, or a pasted #slug brings
// that entry to the top, on ease or, with motion off, at once. The bars and
// the panels work as on index.html (n, c, g, f, Esc).
import { viewer } from "./viewer.js";
import { fetchTalkOutline, buildNavTree } from "./site-nav.js";

const JUMP_MS = 400;   // motion.md: the "step" duration
const PANEL_MS = 250;
const GRID_KEY = "lab-layout-grid";

const site = document.getElementById("content");
const root = document.documentElement;
const column = site.querySelector(".glossary-entries");
const entries = [...column.querySelectorAll(".glossary-entry")];
const indexLinks = new Map([...site.querySelectorAll(".glossary-index a")].map((a) => [a.hash.slice(1), a]));
const groupTitle = site.querySelector(".glossary-group-title");
const numberEl = site.querySelector(".glossary-number");

const reduceMotion = () => !viewer.get().motion;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // easeInOutCubic, as in layout.js

let frameQueued = false;
function relayout() {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => { frameQueued = false; window.dispatchEvent(new Event("lab:layout")); });
}

// ---- Every entry can reach the top ----------------------------------------------
// Room under the last entry, so it too can scroll to the top of the column:
// then the entry at the top is always the current one.
function padEnd() {
  const last = entries[entries.length - 1];
  column.style.paddingBottom = `${Math.max(0, column.clientHeight - last.offsetHeight)}px`;
}

// ---- Current entry (the scroll-spy) -------------------------------------------
const topOf = (el) => el.getBoundingClientRect().top - column.getBoundingClientRect().top + column.scrollTop;
let current = -1;

function spy() {
  const y = column.scrollTop + 1;
  let i = 0;
  for (let k = 0; k < entries.length; k++) if (topOf(entries[k]) <= y) i = k;
  if (i !== current) show(i);
}

function show(i) {
  current = i;
  const entry = entries[i];
  for (const [slug, a] of indexLinks) a.setAttribute("aria-current", String(slug === entry.id));
  groupTitle.textContent = `${entry.closest("[data-group]").dataset.group}/`;
  numberEl.textContent = String(i + 1).padStart(2, "0");
  if (location.hash !== `#${entry.id}`) history.replaceState(null, "", `#${entry.id}`);
  relayout();
}

column.addEventListener("scroll", () => { spy(); relayout(); }, { passive: true });
// The canvas never scrolls: wheel and touch move only the entries column.
site.addEventListener("wheel", (e) => {
  if (!column.contains(e.target)) { e.preventDefault(); column.scrollTop += e.deltaY; }
}, { passive: false });

// ---- Jumping to an entry ------------------------------------------------------------
let anim = 0;
function jump(i, animate = true) {
  i = Math.max(0, Math.min(entries.length - 1, i));
  cancelAnimationFrame(anim);
  const to = topOf(entries[i]), from = column.scrollTop;
  show(i);
  if (!animate || reduceMotion() || Math.abs(to - from) < 1) { column.scrollTop = to; return; }
  const start = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - start) / JUMP_MS);
    column.scrollTop = from + (to - from) * ease(t);
    if (t < 1) anim = requestAnimationFrame(frame);
  };
  anim = requestAnimationFrame(frame);
}
const indexOfSlug = (slug) => entries.findIndex((e) => e.id === slug);

// Index entries and cross-links are in-page links: animate instead of the browser's jump.
site.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='#']");
  if (!a) return;
  const i = indexOfSlug(a.hash.slice(1));
  if (i < 0) return;
  e.preventDefault();
  jump(i);
});
window.addEventListener("hashchange", () => {
  const i = indexOfSlug(location.hash.slice(1));
  if (i >= 0 && i !== current) jump(i);
});

const stepBy = (dir) => jump((current < 0 ? 0 : current) + dir);
site.querySelectorAll(".glossary-step").forEach((b) => b.addEventListener("click", () => stepBy(Number(b.dataset.step))));

// ---- Grid overlay ----------------------------------------------------------------------
const gridToggle = site.querySelector(".site-grid-toggle");
const gridOverlay = site.querySelector(".site-grid-overlay");
function showGrid(on) {
  gridOverlay.hidden = !on;
  gridToggle.setAttribute("aria-pressed", String(on));
  try { localStorage.setItem(GRID_KEY, on ? "1" : "0"); } catch {}
  relayout();
}
gridToggle.addEventListener("click", () => showGrid(gridOverlay.hidden));
try { if (localStorage.getItem(GRID_KEY) === "1") showGrid(true); } catch {}

// ---- Fullscreen ---------------------------------------------------------------------------
const fullscreenToggle = site.querySelector(".site-fullscreen-toggle");
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else root.requestFullscreen?.().catch(() => {});
}
fullscreenToggle.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  fullscreenToggle.setAttribute("aria-pressed", String(!!document.fullscreenElement));
  relayout();
});

// ---- Panels: the controls (columns 11-12, which the glossary leaves empty) and
// the left nav (1-2, js/site-nav.js). Only one is open at a time. Opening the
// nav moves the index and the entries two columns right first (to 3-4 and
// 6-11; css/glossary.css keeps the grid on the canvas's columns), then slides
// it in; closing slides it out, then moves them back, as on index.html.
const indexEl = site.querySelector(".glossary-index");
function coverLeft(on) {
  root.style.setProperty("--nav-cols", on ? "2" : "0");
  indexEl.style.gridColumn = on ? "3 / 5" : "";
  column.style.gridColumn = on ? "6 / 12" : "";
  relayout();
}

let highlighted = null, active = null;
function highlight(b) {
  highlighted?.removeAttribute("data-highlight");
  highlighted = b;
  if (b) { b.setAttribute("data-highlight", ""); b.focus({ preventScroll: true }); }
  active?.onHighlight?.(b);
  relayout();
}

function makePanel({ el, toggle, toggles, cssVar, items, jumps, cover = () => {}, onHighlight }) {
  let open = 0, target = 0, raf = 0;
  const set = (v) => { open = v; root.style.setProperty(cssVar, v.toFixed(4)); relayout(); };
  const panel = {
    items, jumps, onHighlight,
    get isOpen() { return target === 1; },
    toggle(want = target === 0) {
      if (want && active && active !== panel) active.toggle(false);
      target = want ? 1 : 0;
      el.inert = !want;
      toggle.setAttribute("aria-expanded", String(want));
      if (want) {
        active = panel;
        cover(true);
        highlight(el.querySelector("[aria-current='page'], [aria-current='true'], [aria-pressed='true']") ?? items()[0] ?? null);
      } else if (active === panel) {
        highlight(null);
        active = null;
        toggle.focus({ preventScroll: true });
      }
      const closed = () => { if (target === 0) cover(false); };
      cancelAnimationFrame(raf);
      if (reduceMotion()) { set(target); return closed(); }
      const from = open, start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / PANEL_MS);
        set(from + (target - from) * ease(t));
        if (t < 1) raf = requestAnimationFrame(frame);
        else closed();
      };
      raf = requestAnimationFrame(frame);
    },
  };
  toggles.forEach((t) => t?.addEventListener("click", () => panel.toggle()));
  return panel;
}

const panel = site.querySelector(".site-controls");
const controlsToggle = site.querySelector(".site-controls-toggle");
const controls = makePanel({
  el: panel, toggle: controlsToggle, toggles: [controlsToggle, site.querySelector(".site-palette")], cssVar: "--controls-open",
  items: () => [...panel.querySelectorAll("button")].filter((b) => !b.closest("[hidden]")),
  jumps: () => [...panel.querySelectorAll(".site-controls-group:not([hidden])")].map((g) => g.querySelector("button")),
});

const navEl = site.querySelector(".site-nav");
const navToggle = site.querySelector(".site-nav-toggle");
let navTree = null;
fetchTalkOutline()
  .then((outline) => { navTree = buildNavTree(navEl.querySelector(".site-nav-tree"), outline, { page: "glossary.html", relayout }); })
  .catch((err) => console.error("[site] nav", err));
const nav = makePanel({
  el: navEl, toggle: navToggle, toggles: [navToggle], cssVar: "--nav-open", cover: coverLeft,
  items: () => navTree?.items() ?? [], jumps: () => navTree?.jumps() ?? [], onHighlight: (b) => navTree?.highlight(b),
});

const paletteButtons = [...panel.querySelectorAll("[data-palette]")];
const settingButtons = [...panel.querySelectorAll("[data-setting]")];
paletteButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ palette: b.dataset.palette })));
settingButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ [b.dataset.setting]: b.dataset.value === "on" })));
function showViewer(state) {
  paletteButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === state.palette)));
  for (const b of settingButtons) b.setAttribute("aria-pressed", String((b.dataset.value === "on") === state[b.dataset.setting]));
  const name = paletteButtons.find((b) => b.dataset.palette === state.palette)?.textContent.trim();
  if (name) site.querySelector(".site-palette-name").textContent = name;
  relayout();
}
viewer.subscribe(showViewer);
showViewer(viewer.get());

// ---- Keys ---------------------------------------------------------------------------------------
// While a panel is open it takes ↑ ↓ (highlight, wrapping), Tab (next group),
// Enter and Space (select), as on index.html; Esc or its own key closes it, and
// the other's key swaps to it. Otherwise ↑ ↓ step terms.
document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  const k = e.key.toLowerCase();
  if (active) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = active.items(), i = items.indexOf(highlighted), dir = e.key === "ArrowDown" ? 1 : -1;
      if (items.length) highlight(i < 0 ? items[dir > 0 ? 0 : items.length - 1] : items[(i + dir + items.length) % items.length]);
      return e.preventDefault();
    }
    if (e.key === "Tab") {
      const jumps = active.jumps(), items = active.items(), at = items.indexOf(highlighted);
      let g = jumps.map((j) => items.indexOf(j)).findLastIndex((s) => s >= 0 && s <= at);
      g = e.shiftKey ? (highlighted === jumps[g] ? g - 1 : g) : g + 1;
      if (jumps.length) highlight(jumps[(g + jumps.length) % jumps.length]);
      return e.preventDefault();
    }
    if (e.key === "Enter" || e.key === " ") { highlighted?.click(); return e.preventDefault(); }
    if (e.key === "Escape") { active.toggle(false); return e.preventDefault(); }
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    stepBy(e.key === "ArrowDown" ? 1 : -1);
    return e.preventDefault();
  }
  if (k === "c") controls.toggle();
  else if (k === "n") nav.toggle();
  else if (k === "g") showGrid(gridOverlay.hidden);
  else if (k === "f") toggleFullscreen();
});

// Hover states change what's drawn: re-measure.
for (const el of site.querySelectorAll("button, a")) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) el.addEventListener(type, relayout);
}

// ---- Start where the URL says ------------------------------------------------------------
function start() {
  padEnd();
  const i = indexOfSlug(location.hash.slice(1));
  if (i >= 0) jump(i, false);
  else spy();
}
window.addEventListener("resize", () => { padEnd(); if (current >= 0) column.scrollTop = topOf(entries[current]); relayout(); });
document.fonts.ready.then(start);
