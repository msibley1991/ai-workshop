import { createPanel } from "./panel.js";
import { createRenderer } from "./renderer.js";
import { measure, selectionRects, draw } from "./text-raster.js";
import { updateScroll } from "./scroll.js";

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
// lines are counted in emulated pixels. Elsewhere pixelScale is screen px.
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

createPanel((snapshot) => {
  const values = structuredClone(snapshot);
  for (const key of ["light", "dark"]) {
    for (const role of ["ground", "phosphor", "accent"]) values.theme[key][role] = toHex(values.theme[key][role]);
  }
  for (const key of ["persistenceColor", "persistenceColor2", "persistenceColor3"]) values.phosphor[key] = toHex(values.phosphor[key]);
  params = values;
  applyType(values.type);
  applyLines(values);
  invalidate();
}, panelOptions);

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

  const ps = snapPixel(params.resolution.pixelScale) * unit;
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
    dim: mix(theme.ground, theme.phosphor, 0.55),
    ground: theme.ground, // knock-out ink, e.g. text on a filled shape
  };

  draw(ctx, layout, selection, { pixelScale: ps, renderY, colors });
  renderer.render({ params, renderY, velocity, time: t / 1000, viewport });
}

requestAnimationFrame(frame);
