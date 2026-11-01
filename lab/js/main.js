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

createPanel((snapshot) => {
  const values = structuredClone(snapshot);
  for (const key of ["light", "dark"]) {
    for (const role of ["ground", "phosphor", "accent"]) values.theme[key][role] = toHex(values.theme[key][role]);
  }
  values.phosphor.persistenceColor = toHex(values.phosphor.persistenceColor);
  params = values;
  applyType(values.type);
  invalidate();
});

window.addEventListener("resize", invalidate);
document.fonts.ready.then(invalidate);
new ResizeObserver(invalidate).observe(content);
document.addEventListener("selectionchange", () => (selection = selectionRects()));

function frame(t) {
  requestAnimationFrame(frame);
  if (!params) return;

  const ps = params.resolution.pixelScale;
  renderer.resize(ps);

  if (layoutDirty) {
    layout = measure(content, ctx);
    selection = selectionRects();
    const r = viewportEl.getBoundingClientRect();
    viewport = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    layoutDirty = false;
  }

  const { renderY, velocity } = updateScroll(params.grid.pitch * ps, params.grid.snapScroll);
  const theme = params.theme[params.theme.mode];
  const colors = {
    phosphor: theme.phosphor,
    accent: theme.accent,
    dim: mix(theme.ground, theme.phosphor, 0.55),
  };

  draw(ctx, layout, selection, { pixelScale: ps, renderY, colors });
  renderer.render({ params, renderY, velocity, time: t / 1000, viewport });
}

requestAnimationFrame(frame);
