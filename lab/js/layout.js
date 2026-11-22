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
import { stepGraphics, setMotion, graphicSpan } from "./graphic.js";
import { genie } from "./genie-play.js";
import { createSlides } from "./slides.js";

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

// goPanel (slides.js) moves the accordion itself; any other landing (a click,
// the hash, a scroll snap) sends the slides to that panel's first slide.
let silentTarget = -1;
function settle(index) {
  p = settled = index;
  if (index !== silentTarget) slides?.land(index);
  silentTarget = -1;
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

// PageDown and PageUp are not here: presentation clickers send them, so they
// step beats like → and ← (below). ↑ ↓ and Space jump whole tabs.
const KEYS = { ArrowDown: 1, " ": 1, ArrowUp: -1 };
document.addEventListener("keydown", (e) => {
  if (!(e.key in KEYS) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest?.(".site-controls, .site-nav")) return; // the panels' own buttons take Space
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (e.target.closest("button")) return; // let buttons take Space
  e.preventDefault();
  const dir = e.key === " " && e.shiftKey ? -1 : KEYS[e.key];
  animateTo((anim ? anim.target : settled) + dir, GOTO_MS);
});

// ---- Steps: ← and →, and PageDown / PageUp from clickers -----------------------------------------------------------
// With slides on the page (js/slides.js), they step through every slide's beats
// and on across sections and tabs. Without (genie.html), they step the graphics
// on screen between states.
const slides = createSlides({
  site, panels, relayout,
  onMove: (pos) => { showStepEnds(pos); nav?.show(pos); },
  goPanel(index, dur) {
    silentTarget = index;
    animateTo(index, dur);
    return new Promise((r) => setTimeout(r, reduceMotion() || dur === 0 ? 0 : dur + 16));
  },
});
setMotion(viewer.get().motion);
viewer.subscribe((state) => setMotion(state.motion));
const STEP_KEYS = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
const stepBy = (dir) => (slides.enabled ? slides.step(dir) : stepGraphics(dir));
document.addEventListener("keydown", (e) => {
  const dir = STEP_KEYS[e.key];
  if (!dir) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (stepBy(dir)) e.preventDefault();
});

// The bottom bar's [←] [→]: click to step. At either end of the talk, that
// arrow dims and does nothing (docs/design-system/components.md).
const stepButtons = [...site.querySelectorAll(".site-step")];
stepButtons.forEach((b) => b.addEventListener("click", () => stepBy(Number(b.dataset.step))));
function showStepEnds(pos) {
  if (!slides.enabled) return;
  for (const b of stepButtons) b.disabled = Number(b.dataset.step) < 0 ? pos.first : pos.last;
  relayout();
}

// ---- Text genie: l funnels the open panel's text into its sink square and back --
// (js/genie-play.js, settled defaults). On genie.html, js/genie.js takes these
// keys first, in the capture phase.
document.addEventListener("keydown", (e) => {
  if (slides.enabled) return; // slides fire the genie themselves
  if (e.key !== "l" && e.key !== "L") return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  e.preventDefault();
  genie("toggle");
});

// ---- Column-grid toggle (bottom bar) ------------------------------------------
const gridToggle = site.querySelector(".site-grid-toggle");
const gridOverlay = site.querySelector(".site-grid-overlay");
const GRID_KEY = "lab-layout-grid";

function showGrid(on) {
  gridOverlay.hidden = !on;
  gridToggle.setAttribute("aria-pressed", String(on));
  try { localStorage.setItem(GRID_KEY, on ? "1" : "0"); } catch {}
  relayout();
}
gridToggle.addEventListener("click", () => showGrid(gridOverlay.hidden));
for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) gridToggle.addEventListener(type, relayout);
try { if (localStorage.getItem(GRID_KEY) === "1") showGrid(true); } catch {}

// ---- Reflow on the column grid ---------------------------------------------------
// The 12 columns never change; panels cover whole columns (controls: 11-12; a
// left nav would set --nav-cols on :root). Content moves off covered columns:
// the text gives way first, down to TEXT_MIN columns, then the graphic drops
// toward its scene's minimum span (docs/design-system/layout-grid.md).
const COLUMNS = 12, TEXT_MIN = 4, CONTROLS_COLS = 2, DEFAULT_SPAN = [4, 4];
const root = document.documentElement;
const splits = [...site.querySelectorAll(".site-split")];
let coverRight = 0;

function reflow() {
  const left = parseInt(getComputedStyle(root).getPropertyValue("--nav-cols"), 10) || 0;
  const avail = COLUMNS - left - coverRight;
  for (const split of splits) {
    const graphic = split.querySelector(".site-graphic"), text = split.lastElementChild;
    const [min, max] = graphicSpan(graphic) ?? DEFAULT_SPAN;
    const span = Math.max(min, Math.min(max, avail - TEXT_MIN));
    graphic.style.gridColumn = `${1 + left} / span ${span}`;
    text.style.gridColumn = `${1 + left + span} / ${COLUMNS + 1 - coverRight}`;
  }
  slides.reflow(left, coverRight);
  relayout();
}
window.addEventListener("resize", () => reflow());
reflow();

// ---- Panels: viewer controls ([c], columns 11-12) and left nav ([n], 1-2) ------
// Opening reflows the content off the panel's columns, then tweens its --*-open
// 0 -> 1, which stops the content boxes short of it (layout.css) and slides the
// panel in. Closing slides it out, then reflows the content back. Only one is
// open at a time: opening one closes the other, and Esc closes it.
const PANEL_MS = 250, PANEL_COLS = 2;
const openOrder = [];   // open panels, most recent last

function makePanel({ el, toggles, cssVar, side, items, jumps, onHighlight = () => {} }) {
  let open = 0, target = 0, raf = 0;
  const set = (v) => { open = v; root.style.setProperty(cssVar, v.toFixed(4)); relayout(); };
  const cover = (on) => {
    if (side === "left") root.style.setProperty("--nav-cols", on ? String(PANEL_COLS) : "0");
    else coverRight = on ? PANEL_COLS : 0;
    reflow();
  };
  const panel = {
    el, items, jumps, onHighlight,
    get isOpen() { return target === 1; },
    toggle(want = target === 0) {
      if (want) for (const other of [...openOrder]) if (other !== panel) other.toggle(false);
      target = want ? 1 : 0;
      el.inert = !want;
      toggles.forEach((t) => t.hasAttribute("aria-expanded") && t.setAttribute("aria-expanded", String(want)));
      const i = openOrder.indexOf(panel);
      if (i >= 0) openOrder.splice(i, 1);
      if (want) openOrder.push(panel);
      cancelAnimationFrame(raf);
      if (want) menu.open(panel);
      else menu.close(panel);
      if (want) cover(true);
      const closed = () => { if (target === 0) cover(false); };
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
  toggles.forEach((t) => t.addEventListener("click", () => panel.toggle()));
  return panel;
}

const controlsPanel = site.querySelector(".site-controls");
const controlsToggle = site.querySelector(".site-controls-toggle");
const paletteIndicator = site.querySelector(".site-palette");
const controls = makePanel({
  el: controlsPanel,
  toggles: [controlsToggle, paletteIndicator].filter(Boolean),
  cssVar: "--controls-open",
  side: "right",
  items: () => [...controlsPanel.querySelectorAll("button")],
  jumps: () => [...controlsPanel.querySelectorAll(".site-controls-group")].map((g) => g.querySelector("button")).filter(Boolean),
});
const paletteButtons = [...controlsPanel.querySelectorAll("[data-palette]")];
const settingButtons = [...controlsPanel.querySelectorAll("[data-setting]")];

function showViewer(state) {
  paletteButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === state.palette)));
  for (const b of settingButtons) {
    const on = state[b.dataset.setting];
    b.setAttribute("aria-pressed", String((b.dataset.value === "on") === on));
  }
  const name = paletteButtons.find((b) => b.dataset.palette === state.palette)?.textContent.trim();
  const nameEl = site.querySelector(".site-palette-name");
  if (nameEl && name) nameEl.textContent = name;
  relayout();
}

paletteButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ palette: b.dataset.palette })));
settingButtons.forEach((b) => b.addEventListener("click", () => viewer.set({ [b.dataset.setting]: b.dataset.value === "on" })));
viewer.subscribe(showViewer);
showViewer(viewer.get());

// ---- Left nav: the talk as a subtree ---------------------------------------------
// The hero is a root entry; each tab is a folder ("Max's Section/") whose
// sections hang from its trunk. A folder opens while the pointer (or the menu
// highlight) is on it, and the one you're in stays open; the rest are closed
// and end in "…". Clicking a section lands on its first slide, and clicking a
// folder lands on its tab's first slide. The current section stays pressed.
const nav = (() => {
  const el = site.querySelector(".site-nav");
  const tree = el?.querySelector(".site-nav-tree");
  if (!el || !tree || !slides.enabled) return null;
  const button = (text, cls = "") => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `site-bar-button ${cls}`.trim();
    b.dataset.fill = "";
    const span = document.createElement("span");
    span.textContent = text;
    b.append(span);
    return b;
  };
  const line = (cls) => { const l = document.createElement("span"); l.className = cls; l.dataset.fill = ""; return l; };

  const entries = [];   // { button, pi, section }
  const folders = [];   // { el, nameEl, name, pi, first }
  let currentPi = -1, hovered = null, highlighted = null;

  const hero = button(site.querySelector(".site-title")?.textContent.trim() || "Home");
  hero.addEventListener("click", () => slides.goto(0));
  tree.append(hero);
  entries.push({ button: hero, pi: 0, section: null });

  // A folder is open if you're in it, the pointer is on it, or the menu
  // highlight is on it or one of its sections.
  function showFolders() {
    for (const f of folders) {
      const open = f.pi === currentPi || f === hovered || f === highlighted;
      f.el.toggleAttribute("data-collapsed", !open);
      f.nameEl.firstElementChild.textContent = open ? `${f.name}/` : `${f.name}/…`;
    }
    relayout();
  }

  panels.forEach((panel, pi) => {
    if (pi === 0) return; // the intro is the root entry
    const name = panel.querySelector(".site-tab-label")?.textContent.trim() ?? "";
    const folder = document.createElement("div");
    folder.className = "site-nav-folder";
    const nameEl = button(`${name}/`, "site-nav-folder-name");
    const list = document.createElement("ul");
    folder.append(nameEl, list);
    const f = { el: folder, nameEl, name, pi, first: null };
    folders.push(f);
    folder.addEventListener("pointerenter", () => { hovered = f; showFolders(); });
    folder.addEventListener("pointerleave", () => { if (hovered === f) hovered = null; showFolders(); });
    const seen = new Set();
    slides.stops.forEach((stop, i) => {
      if (stop.pi !== pi || !stop.section || seen.has(stop.section)) return;
      seen.add(stop.section);
      const li = document.createElement("li");
      li.className = "site-nav-entry";
      const b = button(stop.section);
      b.addEventListener("click", () => slides.goto(i));
      li.append(line("site-nav-trunk"), line("site-nav-tick"), b);
      list.append(li);
      entries.push({ button: b, pi, section: stop.section });
      f.first ??= { button: b, i };
    });
    nameEl.addEventListener("click", () => slides.goto(slides.stops.findIndex((s) => s.pi === pi)));
    tree.append(folder);
  });

  for (const b of el.querySelectorAll("button")) {
    for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) b.addEventListener(type, relayout);
  }

  return {
    el,
    // Every button you can see, top to bottom (a closed folder's sections are hidden).
    items: () => [...tree.querySelectorAll("button")].filter((b) => b.offsetParent !== null),
    // Tab: the hero, then each folder's first section.
    jumps: () => [hero, ...folders.map((f) => f.first?.button ?? f.nameEl)],
    highlight(b) {
      highlighted = b ? folders.find((f) => f.el.contains(b)) ?? null : null;
      showFolders();
    },
    show(pos) {
      const { pi, section } = pos.stop;
      currentPi = pi;
      for (const e of entries) {
        const on = e.pi === pi && (e.section === null ? pi === 0 : e.section === section);
        e.button.setAttribute("aria-current", String(on));
        e.button.setAttribute("aria-pressed", String(on));
      }
      showFolders();
    },
  };
})();
const navToggle = site.querySelector(".site-nav-toggle");
const navPanel = nav && makePanel({
  el: nav.el, toggles: [navToggle].filter(Boolean), cssVar: "--nav-open", side: "left",
  items: nav.items, jumps: nav.jumps, onHighlight: nav.highlight,
});
if (!nav) navToggle?.remove();

// ---- Menu keys ----------------------------------------------------------------------
// While a panel is open it takes the keys (capture phase, so nothing else
// steps): ↑ ↓ move the highlight through its buttons top to bottom (wrapping),
// Tab and Shift+Tab jump between its groups (the nav: the hero, then each
// tab's first section; the controls: Palette, Display), Enter selects, and Esc
// closes it. Its own key closes it; the other panel's key swaps to that panel.
// f and g still work. The highlight is the hover look, and the button has focus.
const menu = (() => {
  let active = null, cur = null;
  const mark = (b) => {
    if (cur) cur.removeAttribute("data-highlight");
    cur = b;
    if (b) { b.setAttribute("data-highlight", ""); b.focus({ preventScroll: true }); }
    active?.onHighlight(b);
    relayout();
  };
  // The next button in a direction, wrapping; from nothing, the first or last.
  const move = (list, from, dir) => {
    if (!list.length) return null;
    const i = list.indexOf(from);
    if (i < 0) return dir > 0 ? list[0] : list[list.length - 1];
    return list[(i + dir + list.length) % list.length];
  };
  return {
    get active() { return active; },
    open(panel) {
      active = panel;
      mark(panel.el.querySelector("[aria-current='true'], [aria-pressed='true']") ?? panel.items()[0] ?? null);
    },
    close(panel) {
      if (active !== panel) return;
      mark(null);
      active = null;
    },
    key(e) {
      if (!active) return false;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        mark(move(active.items(), cur, e.key === "ArrowDown" ? 1 : -1));
      } else if (e.key === "Tab") {
        const jumps = active.jumps();
        // From inside a group, Tab goes to the next group's first button.
        const items = active.items(), at = items.indexOf(cur);
        const starts = jumps.map((j) => items.indexOf(j));
        let g = starts.findLastIndex((s) => s >= 0 && s <= at);
        if (e.shiftKey) g = cur === jumps[g] ? g - 1 : g;
        else g = g + 1;
        mark(jumps[(g + jumps.length) % jumps.length]);
      } else if (e.key === "Enter" || e.key === " ") {
        cur?.click();
      } else {
        return false;
      }
      return true;
    },
  };
})();

// ---- Bar buttons and keys ----------------------------------------------------------
const fullscreenToggle = site.querySelector(".site-fullscreen-toggle");
fullscreenToggle?.addEventListener("click", () => toggleFullscreen());
document.addEventListener("fullscreenchange", () => {
  fullscreenToggle?.setAttribute("aria-pressed", String(!!document.fullscreenElement));
  relayout();
});

for (const b of site.querySelectorAll(".site-bar button, .site-controls button")) {
  for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) b.addEventListener(type, relayout);
}

const MENU_STEALS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " ", "Tab", "Enter"]);
document.addEventListener("keydown", (e) => {
  if (!menu.active || e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  if (!MENU_STEALS.has(e.key)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  menu.key(e);
}, { capture: true });

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panel alone
  const k = e.key.toLowerCase();
  if (k === "c") controls.toggle();
  else if (k === "n" && navPanel) navPanel.toggle();
  else if (k === "g") showGrid(gridOverlay.hidden);
  else if (k === "f") toggleFullscreen();
  else if (e.key === "Escape" && menu.active) {
    const panel = menu.active;
    panel.toggle(false);
    (panel === controls ? controlsToggle : navToggle)?.focus({ preventScroll: true });
  }
});

// f: fullscreen on and off (Esc also leaves it, as the browser does). The canvas
// unit follows the new screen height through the resize.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

const indexFromHash = () => Math.max(0, ids.indexOf(location.hash.slice(1)));
window.addEventListener("hashchange", () => animateTo(indexFromHash(), GOTO_MS));

// Start where the URL says, without animating.
animateTo(indexFromHash(), 0);
if (slides.enabled) { showStepEnds(slides.position()); nav?.show(slides.position()); }
