import { createPanel } from "./panel.js";
import { createRenderer } from "./renderer.js";
import { measure, selectionRects, draw } from "./text-raster.js";
import { updateScroll } from "./scroll.js";
import { viewer, enabled as viewerEnabled, applyViewer } from "./viewer.js";
import { createPalettePanel } from "./palette-panel.js";
import { ghostBoost } from "./genie-warp.js";

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

// body[data-canvas] (layout.html): the page is a scaled canvas measured in units
// (CSS --u = screen px per unit). The emulated pixel is then pixelScale units,
// snapped down to 1/2/4/8 so the 8-unit spacing lands on whole pixels, and
// lines are counted in emulated pixels (rounded to whole device pixels in
// frame()). Elsewhere pixelScale is screen px.
const canvasMode = "canvas" in document.body.dataset;
const readUnit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;
let unit = canvasMode ? readUnit() : 1;
const snapPixel = (v) => (canvasMode ? [8, 4, 2, 1].find((n) => n <= v) ?? 1 : v);

function applyLines(values) {
  const root = document.documentElement.style;
  if (!canvasMode) return root.setProperty("--line", `${values.outline.width}px`);
  const px = snapPixel(values.resolution.pixelScale);
  root.setProperty("--line", `calc(${values.outline.width * px} * var(--u))`);
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

// Pages can pin a preset and keep their own saved dial values (see layout.html).
const panelOptions = { id: document.body.dataset.panelId, preset: document.body.dataset.preset };

// dialValues: the effects dials as set. params: what renders, with the viewer's
// motion and blur choices on top (js/viewer.js; only on pages with data-viewer).
let dialValues = null;
// A new ground (palette switch, mode or ground dial) clears the ghost history
// for a couple of frames: trails carried across a ground change smear the old
// ground over the whole screen.
let groundKey = "";
let clearGhostFrames = 0;
const kit = createPanel((snapshot) => {
  const values = structuredClone(snapshot);
  for (const key of ["light", "dark"]) {
    for (const role of ["ground", "phosphor", "accent", "link"]) values.theme[key][role] = toHex(values.theme[key][role]);
  }
  for (const key of ["persistenceColor", "persistenceColor2", "persistenceColor3"]) values.phosphor[key] = toHex(values.phosphor[key]);
  const key = `${values.theme.mode} ${values.theme[values.theme.mode].ground}`;
  if (groundKey && key !== groundKey) clearGhostFrames = 2;
  groundKey = key;
  dialValues = values;
  params = applyViewer(values);
  applyType(values.type);
  applyLines(values);
  invalidate();
}, panelOptions);

if (viewerEnabled) {
  // Palettes write into the effects dials (js/palette-panel.js); motion and
  // blur re-apply as overrides.
  createPalettePanel(kit);
  viewer.subscribe((state, patch) => {
    if (!("palette" in patch) && dialValues) params = applyViewer(dialValues);
    invalidate();
  });
}

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
    ? Math.max(1, Math.round(snapPixel(params.resolution.pixelScale) * unit * dpr)) / dpr
    : params.resolution.pixelScale;
  renderer.resize(ps);

  if (layoutDirty) {
    layout = measure(content, ctx);
    selection = selectionRects();
    const r = viewportEl?.getBoundingClientRect();
    viewport = r ? { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height } : null;
    layoutDirty = false;
  }

  const { renderY, velocity } = updateScroll(params.grid.pitch * ps, params.grid.snapScroll);
  const theme = params.theme[params.theme.mode];
  const colors = {
    phosphor: theme.phosphor,
    accent: theme.accent,
    link: theme.link,
    dim: mix(theme.ground, theme.phosphor, 0.55),
    ground: theme.ground, // knock-out ink, e.g. text on a filled shape
  };

  draw(ctx, layout, selection, { pixelScale: ps, renderY, colors });
  let renderParams = params;
  if (clearGhostFrames > 0) {
    clearGhostFrames--;
    renderParams = { ...params, ghost: { ...params.ghost, decay: 0, scrollGain: 0 } };
  } else {
    // A running genie (js/genie-warp.js) lengthens the phosphor trail.
    const boost = ghostBoost(t);
    if (boost > 0) renderParams = { ...params, ghost: { ...params.ghost, decay: Math.min(0.98, params.ghost.decay + boost) } };
  }
  renderer.render({ params: renderParams, renderY, velocity, time: t / 1000, viewport });
}

requestAnimationFrame(frame);
