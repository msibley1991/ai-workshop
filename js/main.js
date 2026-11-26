import { config, defaultsOf, sharedDisplayConfig, loadPreset } from "./params.js";
import { createRenderer } from "./renderer.js";
import { measure, selectionRects, draw } from "./text-raster.js";
import { updateScroll } from "./scroll.js";
import { viewer, enabled as viewerEnabled, applyViewer, palettesReady, paletteValues } from "./viewer.js";
import { trailBoost } from "./genie-warp.js";
import "./stores.js"; // the genie, shading and type settings, saved look + viewer changes
import { bindResetRow } from "./settings.js";

const content = document.getElementById("content");
const viewportEl = document.getElementById("viewport3d");
const contentCanvas = document.createElement("canvas");
const ctx = contentCanvas.getContext("2d");
const renderer = createRenderer(document.getElementById("screen"), contentCanvas);

let params = null;
let layout = null;
let selection = [];
let viewport = null;
let layoutDirty = true;

const invalidate = () => (layoutDirty = true);

// body[data-canvas] (the talk and the glossary): the page is a scaled canvas measured in units
// (CSS --u = screen px per unit). The emulated pixel is then pixels.size units,
// snapped down to 1/2/4/8 so the 8-unit spacing lands on whole pixels, and
// lines are counted in emulated pixels (rounded to whole device pixels in
// frame()). Elsewhere pixels.size is screen px.
const canvasMode = "canvas" in document.body.dataset;
const readUnit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;
let unit = canvasMode ? readUnit() : 1;
const snapPixel = (v) => (canvasMode ? [8, 4, 2, 1].find((n) => n <= v) ?? 1 : v);

function applyLines(values) {
  const root = document.documentElement.style;
  if (!canvasMode) return root.setProperty("--line", `${values.interface.lineWeight}px`);
  const px = snapPixel(values.pixels.size);
  root.setProperty("--line", `calc(${values.interface.lineWeight * px} * var(--u))`);
  root.setProperty("--line-dashed", `calc(${px} * var(--u))`);
}

// Type dials drive CSS variables, so the invisible DOM lays out exactly what gets drawn.
function applyType(type) {
  const root = document.documentElement.style;
  const fallback = type.family === "Inter" ? "sans-serif" : "monospace";
  root.setProperty("--font", `"${type.family}", ${fallback}`);
  for (const level of ["h1", "h2", "h3", "body", "small"]) {
    root.setProperty(`--${level}-size`, `${type[level].size}px`);
    root.setProperty(`--${level}-lh`, type[level].lineHeight);
  }
  root.setProperty("--gap", `${type.gap}px`);
  document.fonts.load(`16px "${type.family}"`).then(invalidate);
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return `rgb(${c.join(",")})`;
}

// The color dial accepts any CSS color; the renderer needs hex.
const probe = document.createElement("canvas").getContext("2d");
function toHex(color) {
  probe.fillStyle = "#000";
  probe.fillStyle = color;
  const v = probe.fillStyle;
  if (v.startsWith("#")) return v;
  const [r, g, b] = v.match(/[\d.]+/g).map(Number);
  return "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}

// <body data-display> (the talk, the glossary, the lab's genie and hierarchy
// pages): the shared display settings from presets/display.json, with every
// colour and effect from the active palette (js/viewer.js).
const displayMode = "display" in document.body.dataset;
const SPECIMEN_DEFAULTS = defaultsOf(config);
// The invisible-DOM type on display pages (css/text-layer.css). Their own CSS
// sets the type that shows; these only keep the base styles as they were.
const DISPLAY_PAGE_TYPE = {
  family: "JetBrains Mono", gap: 32,
  h1: { size: 72, lineHeight: 1.05 }, h2: { size: 44, lineHeight: 1.15 }, h3: { size: 32, lineHeight: 1.25 },
  body: { size: 28, lineHeight: 1.45 }, small: { size: 20, lineHeight: 1.4 },
};

// dialValues: the dials as set. params: what renders (palette colours on
// display pages, then the viewer's motion, blur and lines on top; js/viewer.js).
let dialValues = null;
// A new ground (palette switch, mode or ground dial) clears the trail history
// for a couple of frames: trails carried across a ground change smear the old
// ground over the whole screen.
let groundKey = "";
let clearTrailFrames = 0;

function compose() {
  if (!dialValues) return;
  let values = structuredClone(dialValues);
  if (displayMode) {
    const pal = paletteValues(viewer.get().palette);
    values = { ...structuredClone(SPECIMEN_DEFAULTS), ...values, type: DISPLAY_PAGE_TYPE, theme: pal.theme };
    // The palette's effects, group by group over the shared dials (pixels
    // gets the palette's sharpText beside the shared size).
    for (const [group, v] of Object.entries(pal.display)) values[group] = { ...values[group], ...v };
  }
  for (const key of ["light", "dark"]) {
    if (!values.theme[key]) continue;
    for (const role of ["ground", "ink", "accent", "link"]) values.theme[key][role] = toHex(values.theme[key][role]);
  }
  for (const key of ["trail1", "trail2", "trail3"]) values.trails[key] = toHex(values.trails[key]);
  const key = `${values.theme.mode} ${values.theme[values.theme.mode].ground}`;
  if (groundKey && key !== groundKey) clearTrailFrames = 2;
  groundKey = key;
  params = applyViewer(values);
  applyType(values.type);
  applyLines(values);
  invalidate();
}

// The saved display settings, on every host (the published site is static, so
// this file is all it gets), defaults filling any group the file lacks.
const SHARED_DEFAULTS = defaultsOf(sharedDisplayConfig);
const withDefaults = (v) => ({ ...v, ...Object.fromEntries(Object.entries(SHARED_DEFAULTS).map(([g, d]) => [g, { ...d, ...v?.[g] }])) });
const setDials = (values) => { dialValues = withDefaults(values); compose(); };
loadPreset("display").catch((err) => { console.error("[lab]", err); return {}; }).then((v) => { if (!dialValues) setDials(v); });
palettesReady.then(compose);

// Localhost only: the dialkit Display and Palette panels, to tune the look and
// save it into presets/ (serve.py). The published site never loads dialkit.
// Display above Palette, both collapsed on load, so ← → step the page until
// one is opened. They're hidden until d shows them (and the playground's
// panels and graph editor with them); d hides them again, remembered here.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
if (displayMode && LOCAL_HOSTS.includes(location.hostname)) {
  const DIALS_KEY = "site-dials-shown";
  const hide = document.createElement("style");
  hide.textContent = ".dials-hidden :is(.dialkit-root, .genie-graphs) { display: none !important; }";
  document.head.append(hide);
  const showDials = (on) => {
    document.documentElement.classList.toggle("dials-hidden", !on);
    try { localStorage.setItem(DIALS_KEY, on ? "1" : "0"); } catch {}
  };
  let shown = false;
  try { shown = localStorage.getItem(DIALS_KEY) === "1"; } catch {}
  showDials(shown);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "d" && e.key !== "D") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable], .dialkit-root")) return;
    shown = !shown;
    showDials(shown);
  });
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("../vendor/dialkit/styles.css", import.meta.url);
  document.head.append(css);
  Promise.all([import("./panel.js"), import("./palette-panel.js"), import("../vendor/dialkit/index.js")])
    .then(([{ createPanel }, { createPalettePanel }, { DialStore }]) => {
      createPanel(setDials);
      // Palette edits and switches recolour the render (js/palette-panel.js).
      createPalettePanel(compose);
      setTimeout(() => { for (const id of ["lab-display", "lab-palette"]) DialStore.setPanelOpen(id, false); });
    })
    .catch((err) => console.error("[lab]", err));
}
// The Controls panel's playground reset row (js/settings.js).
bindResetRow();
// The viewer's palette, motion, blur and lines (pages with data-viewer).
viewer.subscribe(() => { compose(); invalidate(); });

window.addEventListener("resize", () => {
  if (canvasMode) unit = readUnit();
  invalidate();
});
// Pages fire this when layout changes without a resize (view switches, hover states).
window.addEventListener("lab:layout", invalidate);
document.fonts.ready.then(invalidate);
new ResizeObserver(invalidate).observe(content);
document.addEventListener("selectionchange", () => (selection = selectionRects()));

function frame(t) {
  requestAnimationFrame(frame);
  if (!params) return;

  // In canvas mode the emulated pixel is rounded to whole device pixels: a
  // fractional size (1.034 CSS px per unit on a 1728x1117 screen) makes some
  // rows and scanlines a device pixel taller, which reads as darker bands.
  const dpr = window.devicePixelRatio || 1;
  const ps = canvasMode
    ? Math.max(1, Math.round(snapPixel(params.pixels.size) * unit * dpr)) / dpr
    : params.pixels.size;
  renderer.resize(ps);

  if (layoutDirty) {
    layout = measure(content, ctx);
    selection = selectionRects();
    const r = viewportEl?.getBoundingClientRect();
    viewport = r ? { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height } : null;
    layoutDirty = false;
  }

  const { renderY, velocity } = updateScroll(params.lines.spacing * ps, params.lines.snapScroll);
  const theme = params.theme[params.theme.mode];
  const colors = {
    ink: theme.ink,
    accent: theme.accent,
    link: theme.link,
    dim: mix(theme.ground, theme.ink, 0.55),
    ground: theme.ground, // knock-out ink, e.g. text on a filled shape
  };

  draw(ctx, layout, selection, { pixelSize: ps, renderY, colors });
  let renderParams = params;
  if (clearTrailFrames > 0) {
    clearTrailFrames--;
    renderParams = { ...params, trails: { ...params.trails, length: 0, scrollBoost: 0 } };
  } else {
    // A running genie (js/genie-warp.js) lengthens the trails.
    const boost = trailBoost(t);
    if (boost > 0) renderParams = { ...params, trails: { ...params.trails, length: Math.min(0.98, params.trails.length + boost) } };
  }
  renderer.render({ params: renderParams, renderY, velocity, time: t / 1000, viewport });
}

requestAnimationFrame(frame);
