// Shading test: dither vs hatching, side by side. Each column shows a step
// ramp, a flat diagram and an isometric object (drag to rotate; it springs back
// to the isometric pose on release). Everything is drawn in two colours only,
// the palette's ground and ink, at the emulated pixel size, into a low-res
// canvas scaled up nearest-neighbour. Standalone: no glow, ghosting or scanlines.
// The engine (patterns, raster, iso object, spring) is js/shade.js, which the
// layout page's raster also uses for [data-iso] graphics.
//
// Tone t is "amount of ink" from 0 to 1. Each technique quantises it to its own
// steps between its lightest and darkest values. "Ink means" picks whether ink
// marks shadow or light.
import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { DITHERS, isErrorDiffusion, threshold, hatchInk, stepTone, Raster, fillIso, Spin, ISO_STYLE } from "./shade.js";

const H = ISO_STYLE.hatch;
const config = {
  page: {
    palette: { type: "select", options: ["ink", "blueprint", "plasma", "vector"], default: "plasma" },
    pixel: [1, 1, 8, 1],          // emulated pixel in layout units, snapped to 1/2/4/8
    anchor: { type: "select", options: ["object", "screen"], default: ISO_STYLE.anchor }, // iso faces only
    edges: { type: "select", options: ["all", "iso only", "off"], default: "all" },
    inner: [ISO_STYLE.inner, 1, 8, 1],           // iso edges between faces
    inkMeans: { type: "select", options: ["shadow", "light", "auto"], default: ISO_STYLE.inkMeans },
    lightAz: [ISO_STYLE.lightAz, -180, 180, 1], // degrees, view space; negative = from the left
    lightEl: [ISO_STYLE.lightEl, 0, 90, 1],
  },
  dither: {
    pattern: { type: "select", options: DITHERS, default: "white noise" },
    scale: [1, 1, 8, 1],          // pattern cell, in emulated pixels
    steps: [6, 2, 8, 1],
    lightest: [0, 0, 1, 0.05],
    darkest: [1, 0, 1, 0.05],
  },
  hatch: {
    mode: { type: "select", options: ["density", "coverage", "cross", "weight"], default: H.mode },
    angle: [H.angle, 0, 180, 1],
    spacing: [H.spacing, 2, 32, 1], // emulated pixels between lines
    width: [H.width, 1, 8, 1],      // emulated pixels
    steps: [H.steps, 2, 8, 1],
    lightest: [H.lightest, 0, 1, 0.05],
    darkest: [H.darkest, 0, 1, 0.05],
    solidTop: H.solidTop,           // the darkest step is solid ink
  },
};

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const labels = document.getElementById("labels");
const stage = document.getElementById("stage");

let PALETTES = null;
let values = null;
let geo = null; // sizing, recomputed on resize / pixel change
const spins = [new Spin(), new Spin()];
let drag = null;
let animating = false;

const snapPixel = (v) => [1, 2, 4, 8].filter((p) => p <= v).pop();

function hexRGB(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const isLight = (hex) => {
  const [r, g, b] = hexRGB(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

function measure() {
  const dpr = devicePixelRatio || 1;
  const uCss = Math.min(innerHeight / 1080, innerWidth / 1440);
  const W = Math.min(1920, Math.max(1440, innerWidth / uCss));
  const P = snapPixel(values.page.pixel);
  const devPx = Math.max(1, Math.round(P * uCss * dpr));
  const bw = Math.floor(W / P), bh = Math.floor(1080 / P);
  canvas.width = bw; canvas.height = bh;
  const cssW = (bw * devPx) / dpr, cssH = (bh * devPx) / dpr;
  canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`;
  stage.style.width = `${cssW}px`; stage.style.height = `${cssH}px`;
  const uu = devPx / dpr / P; // CSS px per layout unit
  document.documentElement.style.setProperty("--uu", `${uu}px`);
  const M = 64, colW = (W - 3 * M) / 2;
  geo = { P, bw, bh, uu, W, M, colW, cols: [M, 2 * M + colW], n: bw * bh, raster: new Raster(bw, bh), image: ctx.createImageData(bw, bh) };
}

// Iso region of a column, in units.
const isoRegion = (col) => ({ x: geo.cols[col], y: 640, w: geo.colW, h: 384 });

function render() {
  if (!PALETTES || !geo) return;
  const { P, bw, bh, raster: r } = geo;
  const pal = PALETTES[values.page.palette] ?? PALETTES.ink;
  const inkMeans = values.page.inkMeans === "auto" ? (isLight(pal.ground) ? "shadow" : "light") : values.page.inkMeans;
  document.documentElement.style.setProperty("--ground", pal.ground);
  document.documentElement.style.setProperty("--ink", pal.ink);

  r.clear();
  const colOf = []; // shape id -> column
  const specs = [values.dither, values.hatch];
  const edgesMode = values.page.edges;
  const B = (v) => v / P;
  const fill = (col, pts, t, opts) => { colOf[r.fill(pts, t, opts)] = col; };
  const rect = (x, y, w, h) => [[B(x), B(y)], [B(x + w), B(y)], [B(x + w), B(y + h)], [B(x), B(y + h)]];
  const circle = (cx, cy, rad) => Array.from({ length: 48 }, (_, i) => [B(cx + rad * Math.cos((i / 48) * 2 * Math.PI)), B(cy + rad * Math.sin((i / 48) * 2 * Math.PI))]);
  const labelList = [];
  const label = (text, x, y, small) => labelList.push({ text, x, y, small });

  for (let col = 0; col < 2; col++) {
    const spec = specs[col], N = spec.steps, x0 = geo.cols[col], cw = geo.colW;
    const flatEdges = edgesMode === "all";

    // Ramp: one swatch per step, framed so T0 is visible.
    const gap = 8, sw = (cw - gap * (N - 1)) / N;
    for (let k = 0; k < N; k++) {
      const sx = x0 + k * (sw + gap);
      fill(col, rect(sx, 128, sw, 64), stepTone(spec, k), { edges: true });
      label(`T${k} · ${Math.round(stepTone(spec, k) * 100)}%`, sx, 200, true);
    }

    // Flat diagram: bars for steps 1..N-1, plus an overlapping composition.
    const base = 600, barW = 40, barGap = 16;
    for (let k = 1; k < N; k++) {
      const h = (320 * k) / (N - 1);
      fill(col, rect(x0 + (k - 1) * (barW + barGap), base - h, barW, h), stepTone(spec, k), { edges: flatEdges });
    }
    const kx = x0 + cw * 0.5;
    const at = (f) => stepTone(spec, Math.max(1, Math.round(f * (N - 1))));
    fill(col, circle(kx + 130, 400, 130), at(1 / 3), { edges: flatEdges });
    fill(col, rect(kx + 150, 360, cw * 0.5 - 150, 240), at(2 / 3), { edges: flatEdges });
    fill(col, [[B(kx + cw * 0.5), B(280)], [B(kx + cw * 0.5), B(600)], [B(kx + 60), B(600)]], at(1), { edges: flatEdges });

    // Iso object.
    const reg = isoRegion(col);
    const style = { ...values.page, inkMeans, edges: edgesMode !== "off" };
    for (const id of fillIso(r, { spin: spins[col], cx: B(reg.x + reg.w / 2), cy: B(reg.y + reg.h / 2 + 24), k: B(104), spec, style })) colOf[id] = col;
    label("Drag to rotate", reg.x + reg.w / 2 - 64, 1032, true);
  }

  const d = values.dither, h = values.hatch;
  label(`Dither · ${d.pattern} · scale ${d.scale}`, geo.cols[0], 56);
  label(`Hatching · ${h.mode} · ${h.angle}° · spacing ${h.spacing} · width ${h.width}`, geo.cols[1], 56);
  label(`${values.page.anchor === "object" ? "Pattern anchored to faces" : "Pattern anchored to screen"} · ink means ${inkMeans}${isErrorDiffusion(d.pattern) ? " · error diffusion is always screen-anchored" : ""}`, geo.cols[0], 88, true);

  // Pattern pass.
  const ink = new Uint8Array(geo.n);
  const ed = isErrorDiffusion(d.pattern);
  if (ed) errorDiffuse(ink, colOf, d);
  for (let i = 0; i < geo.n; i++) {
    if (r.edge[i]) { ink[i] = 1; continue; }
    const t = r.tone[i];
    if (t < 0) continue;
    if (colOf[r.fid[i]] === 0) {
      if (ed) continue;
      if (t >= 1) { ink[i] = 1; continue; }
      const objectId = values.page.anchor === "object" ? r.fid[i] : 0;
      ink[i] = t > threshold(d.pattern, r.U[i], r.V[i], objectId, d.scale) ? 1 : 0;
    } else {
      ink[i] = hatchInk(h, t, r.U[i], r.V[i]) ? 1 : 0;
    }
  }

  const g = hexRGB(pal.ground), k = hexRGB(pal.ink), data = geo.image.data;
  for (let i = 0; i < geo.n; i++) {
    const c = ink[i] ? k : g, o = i * 4;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  ctx.putImageData(geo.image, 0, 0);

  labels.innerHTML = "";
  for (const l of labelList) {
    const el = document.createElement("span");
    el.textContent = l.text;
    if (l.small) el.className = "small";
    el.style.left = `${l.x * geo.uu}px`;
    el.style.top = `${l.y * geo.uu}px`;
    labels.append(el);
  }
}

// Error diffusion over cells of `scale` pixels, dither column only. Error never
// spills into the ground, so shapes keep clean edges.
function errorDiffuse(ink, colOf, d) {
  const { bw, bh } = geo, { tone, fid } = geo.raster, sc = d.scale;
  const gw = Math.ceil(bw / sc), gh = Math.ceil(bh / sc);
  const val = new Float32Array(gw * gh).fill(-1);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const x = Math.min(bw - 1, gx * sc + (sc >> 1)), y = Math.min(bh - 1, gy * sc + (sc >> 1)), i = y * bw + x;
    if (tone[i] >= 0 && colOf[fid[i]] === 0) val[gy * gw + gx] = tone[i];
  }
  const kernel = d.pattern === "atkinson"
    ? [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]]
    : [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
  const out = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const j = gy * gw + gx, v = val[j];
    if (v < 0) continue;
    const o = v >= 0.5 ? 1 : 0;
    out[j] = o;
    const err = v - o;
    for (const [dx, dy, w] of kernel) {
      const x = gx + dx, y = gy + dy;
      if (x < 0 || x >= gw || y >= gh) continue;
      const q = y * gw + x;
      if (val[q] >= 0) val[q] += err * w;
    }
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x;
    if (tone[i] < 0 || colOf[fid[i]] !== 0) continue;
    ink[i] = out[Math.floor(y / sc) * gw + Math.floor(x / sc)];
  }
}

// ---------- interaction ----------

function regionAt(ev) {
  const r = canvas.getBoundingClientRect();
  const ux = (ev.clientX - r.left) / geo.uu, uy = (ev.clientY - r.top) / geo.uu;
  for (let col = 0; col < 2; col++) {
    const g = isoRegion(col);
    if (ux >= g.x && ux <= g.x + g.w && uy >= g.y && uy <= g.y + g.h) return col;
  }
  return -1;
}

canvas.addEventListener("pointerdown", (ev) => {
  const col = regionAt(ev);
  if (col < 0) return;
  canvas.setPointerCapture(ev.pointerId);
  drag = { col, x: ev.clientX, y: ev.clientY };
  spins[col].grab();
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (ev) => {
  if (!drag) { canvas.style.cursor = regionAt(ev) >= 0 ? "grab" : ""; return; }
  spins[drag.col].move(ev.clientX - drag.x, ev.clientY - drag.y);
  drag.x = ev.clientX; drag.y = ev.clientY;
  render();
});
const release = () => {
  if (!drag) return;
  spins[drag.col].release();
  drag = null;
  canvas.style.cursor = "";
  if (animating) return;
  animating = true;
  for (const s of spins) s.last = 0;
  const tick = (now) => {
    let busy = false;
    for (const s of spins) busy = s.step(now) || busy;
    render();
    if (busy) requestAnimationFrame(tick); else animating = false;
  };
  requestAnimationFrame(tick);
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

// ---------- boot ----------

createDialRoot({ position: "top-right", theme: "dark" });
const kit = createDialKit("Shading", config, { id: "lab-shading", persist: true });
let lastPixel = null;
kit.subscribe((v) => {
  values = v;
  if (v.page.pixel !== lastPixel || !geo) { lastPixel = v.page.pixel; measure(); }
  render();
});
addEventListener("resize", () => { measure(); render(); });
fetch("presets/palettes.json").then((r) => r.json()).then((p) => { PALETTES = p; render(); });
document.fonts.ready.then(render);
