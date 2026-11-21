// layout.html only: the intro and the two tabs form an accordion driven by scroll.
//
// State is a weight per panel (intro, then each tab), summing to 1; layout.css
// turns each weight (--w) into that panel's share of the free height. Scrolling
// scrubs a position p from 0 (intro) to 2 (last tab): at p = 1.4 the first tab is
// 0.6 open and the second 0.4. When the wheel goes quiet, p eases to a whole
// section. Clicks, keys and the URL hash animate straight to a section instead.
// Every change fires `lab:layout` so the raster re-measures (nothing resizes #content).

const SECTION_DELTA = 500;   // wheel delta (px) to move one full section
const TOUCH_DELTA = 300;     // finger travel (px) to move one full section
const SNAP_BIAS = 0.2;       // move this far from the start of a gesture to advance
const QUIET_MS = 150;        // no wheel input this long = gesture over, snap
const SNAP_MS = 250;
const GOTO_MS = 500;
import { viewer } from "./viewer.js";
import { stepGraphics, setMotion } from "./graphic.js";

// Motion off (viewer controls; it starts off when the OS asks for reduced motion)
// makes the accordion and the controls panel jump instead of animating.
const reduceMotion = () => !viewer.get().motion;

const site = document.getElementById("content");
const panels = [...site.querySelectorAll(".site-panel")]; // intro first, then tabs
const ids = panels.map((p) => p.dataset.panel);            // "" = intro
const labels = [...site.querySelectorAll(".site-tab-label")];
const last = panels.length - 1;
const relayout = () => window.dispatchEvent(new Event("lab:layout"));

const clamp = (v) => Math.min(last, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // easeInOutCubic

function weightsAt(p) {
  const w = panels.map(() => 0);
  const k = Math.floor(p);
  const f = p - k;
  w[k] = 1 - f;
  if (f > 0) w[k + 1] = f;
  return w;
}

let weights = weightsAt(0);
let p = 0;          // scroll position; meaningful while scrubbing or settled
let settled = 0;    // section index last landed on
let anim = null;    // { from, to, target, start, dur } — weight tween in progress

function apply(w) {
  weights = w;
  panels.forEach((el, i) => el.style.setProperty("--w", w[i].toFixed(4)));
  relayout();
}

function settle(index) {
  p = settled = index;
  const hash = ids[index] ? `#${ids[index]}` : "";
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
  labels.forEach((a, i) => (i + 1 === index ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
}

// Tween the weights to a target (whole section index or, for snapping, the same).
function animateTo(index, dur) {
  index = clamp(index);
  if (reduceMotion() || dur === 0) {
    anim = null;
    apply(weightsAt(index));
    settle(index);
    return;
  }
  anim = { from: weights, to: weightsAt(index), target: index, start: performance.now(), dur };
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!anim) return;
  const t = Math.min(1, (now - anim.start) / anim.dur);
  const k = ease(t);
  apply(anim.from.map((a, i) => a + (anim.to[i] - a) * k));
  if (t < 1) return requestAnimationFrame(tick);
  const { target } = anim;
  anim = null;
  settle(target);
}

const isGoto = () => anim && anim.dur === GOTO_MS;

// ---- Scrubbing (wheel + touch) ---------------------------------------------
let gestureStart = null;
let quietTimer = 0;

function scrub(delta) {
  if (isGoto()) return;               // a click/key animation owns the layout
  if (anim) anim = null;              // cancel a snap; keep scrubbing from here
  if (gestureStart === null) gestureStart = settled;
  p = clamp(p + delta);
  apply(weightsAt(p));
}

function snap() {
  if (gestureStart === null) return;
  const d = p - gestureStart;
  // Past the bias, lean toward the scroll direction (1e-6 absorbs float error, e.g. 2.2 - 0.2).
  const target = d > SNAP_BIAS ? Math.ceil(p - SNAP_BIAS - 1e-6) : d < -SNAP_BIAS ? Math.floor(p + SNAP_BIAS + 1e-6) : Math.round(p);
  gestureStart = null;
  animateTo(target, SNAP_MS);
}

site.addEventListener("wheel", (e) => {
  e.preventDefault();
  const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
  scrub(px / SECTION_DELTA);
  clearTimeout(quietTimer);
  quietTimer = setTimeout(snap, QUIET_MS);
}, { passive: false });

let touchY = null;
site.addEventListener("touchstart", (e) => (touchY = e.touches[0].clientY), { passive: true });
site.addEventListener("touchmove", (e) => {
  if (touchY === null) return;
  e.preventDefault();
  const y = e.touches[0].clientY;
  scrub((touchY - y) / TOUCH_DELTA);
  touchY = y;
}, { passive: false });
site.addEventListener("touchend", () => {
  touchY = null;
  snap();
});

// ---- Direct navigation (click, keys, hash) ------------------------------------
labels.forEach((a, i) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    animateTo(settled === i + 1 ? 0 : i + 1, GOTO_MS); // clicking the open tab closes it
  });
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) a.addEventListener(type, relayout);
});

site.querySelector(".site-title").addEventListener("click", (e) => {
  e.preventDefault();
  animateTo(0, GOTO_MS);
});

const KEYS = { ArrowDown: 1, PageDown: 1, " ": 1, ArrowUp: -1, PageUp: -1 };
document.addEventListener("keydown", (e) => {
  if (!(e.key in KEYS) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (controlsPanel.contains(e.target)) return; // the panel's own buttons take Space
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (e.target.closest("button")) return; // let buttons take Space
  e.preventDefault();
  const dir = e.key === " " && e.shiftKey ? -1 : KEYS[e.key];
  animateTo((anim ? anim.target : settled) + dir, GOTO_MS);
});

// ---- Graphic steps: ← and → move the graphics on screen between states --------
setMotion(viewer.get().motion);
viewer.subscribe((state) => setMotion(state.motion));
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (stepGraphics(e.key === "ArrowRight" ? 1 : -1)) e.preventDefault();
});

// ---- Column-grid toggle (bottom bar) ------------------------------------------
const gridToggle = site.querySelector(".site-grid-toggle");
const gridOverlay = site.querySelector(".site-grid-overlay");
const GRID_KEY = "lab-layout-grid";

function showGrid(on) {
  gridOverlay.hidden = !on;
  gridToggle.setAttribute("aria-pressed", String(on));
  gridToggle.firstElementChild.textContent = on ? "Grid: on" : "Grid: off";
  try { localStorage.setItem(GRID_KEY, on ? "1" : "0"); } catch {}
  relayout();
}
gridToggle.addEventListener("click", () => showGrid(gridOverlay.hidden));
for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) gridToggle.addEventListener(type, relayout);
try { if (localStorage.getItem(GRID_KEY) === "1") showGrid(true); } catch {}

// ---- Viewer controls panel ([c]) -------------------------------------------------
// Opening tweens --controls-open 0 -> 1, which pushes the panels left by the
// panel's width (layout.css) and slides the panel in.
const CONTROLS_MS = 250;
const root = document.documentElement;
const controlsPanel = site.querySelector(".site-controls");
const controlsToggle = site.querySelector(".site-controls-toggle");
const paletteButtons = [...controlsPanel.querySelectorAll("[data-palette]")];
const settingButtons = [...controlsPanel.querySelectorAll("[data-setting]")];
let controlsOpen = 0;   // current 0..1
let controlsTarget = 0;
let controlsAnim = 0;

function setControlsOpen(v) {
  controlsOpen = v;
  root.style.setProperty("--controls-open", v.toFixed(4));
  relayout();
}

function toggleControls(open = controlsTarget === 0) {
  controlsTarget = open ? 1 : 0;
  controlsPanel.inert = !open;
  controlsToggle.setAttribute("aria-expanded", String(open));
  cancelAnimationFrame(controlsAnim);
  if (reduceMotion()) return setControlsOpen(controlsTarget);
  const from = controlsOpen;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / CONTROLS_MS);
    setControlsOpen(from + (controlsTarget - from) * ease(t));
    if (t < 1) controlsAnim = requestAnimationFrame(step);
  };
  controlsAnim = requestAnimationFrame(step);
  if (open) controlsPanel.querySelector("[aria-pressed='true']")?.focus({ preventScroll: true });
}

function showViewer(state) {
  paletteButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === state.palette)));
  for (const b of settingButtons) {
    const on = state[b.dataset.setting];
    b.setAttribute("aria-pressed", String((b.dataset.value === "on") === on));
  }
  relayout();
}

controlsToggle.addEventListener("click", () => toggleControls());
paletteButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ palette: b.dataset.palette })));
settingButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ [b.dataset.setting]: b.dataset.value === "on" })));
viewer.subscribe(showViewer);
showViewer(viewer.get());
for (const b of [controlsToggle, ...paletteButtons, ...settingButtons]) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) b.addEventListener(type, relayout);
}

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (e.key === "c" || e.key === "C") toggleControls();
  else if (e.key === "Escape" && controlsTarget === 1) {
    toggleControls(false);
    controlsToggle.focus({ preventScroll: true });
  }
});

const indexFromHash = () => Math.max(0, ids.indexOf(location.hash.slice(1)));
window.addEventListener("hashchange", () => animateTo(indexFromHash(), GOTO_MS));

// Start where the URL says, without animating.
animateTo(indexFromHash(), 0);
