// Shading engine for code-drawn graphics: patterns, the raster, iso geometry and
// the drag spring. Used by the shading test (shading.js) and the scene engine
// (graphic.js, for [data-graphic] elements).
//
// Tone t is the amount of ink, 0..1. A spec quantises it to `steps` between
// `lightest` and `darkest`. Every pixel comes out as pure ink or pure ground:
// shading is a pattern (hatching or dither), never a tint.

// ---------- the settled look so far (tuned on the old lab shading page; now the shading store's defaults, presets/shading.json) ----------

export const ISO_STYLE = {
  technique: "hatch",
  hatch: { mode: "density", angle: 45, spacing: 8, lineWidth: 4, steps: 5, lightest: 0, darkest: 1, solidDarkest: true },
  patternAnchor: "object", // pattern sticks to each face
  edges: true,        // draw the face edges
  innerEdges: 4,      // every face edge, outer and inner, emulated pixels, centred on the edge
                      // (the 8 silhouette grown outward was dropped: it cost 5–28% of a repaint)
  inkShows: "shadow", // ink marks shadow, on light and dark grounds alike
  lightAngle: -60,    // degrees, view space; negative = from the left
  lightHeight: 48,    // degrees above the horizon
};

// ISO_STYLE is live: the shading store (js/stores.js) writes into it, then
// bumpStyle(), and painted graphics and hatch tiles key their caches on
// styleRev so they repaint with the new look.
export let styleRev = 0;
export function bumpStyle() { styleRev++; }

// ---------- patterns ----------

const mod = (a, n) => ((a % n) + n) % n;

function bayer(n) {
  let m = [0];
  for (let size = 1; size < n; size *= 2) {
    const next = new Array(size * 2 * size * 2);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = 4 * m[y * size + x];
      next[y * 2 * size + x] = v;
      next[y * 2 * size + x + size] = v + 2;
      next[(y + size) * 2 * size + x] = v + 3;
      next[(y + size) * 2 * size + x + size] = v + 1;
    }
    m = next;
  }
  return m.map((v) => (v + 0.5) / (n * n));
}
const BAYER = { 2: bayer(2), 4: bayer(4), 8: bayer(8) };

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 64x64 blue-noise threshold map by void-and-cluster (Gaussian sigma 1.5, tiled).
// Built on first use.
let BN = null;
function blueNoise() {
  if (BN) return BN;
  const S = 64, N = S * S, sigma = 1.5;
  const kern = new Float32Array(N);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = Math.min(x, S - x), dy = Math.min(y, S - y);
    kern[y * S + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
  }
  const toggle = (E, i, sign) => {
    const cx = i % S, cy = (i / S) | 0;
    for (let y = 0; y < S; y++) {
      const row = ((y - cy) & (S - 1)) * S;
      for (let x = 0; x < S; x++) E[y * S + x] += sign * kern[row + ((x - cx) & (S - 1))];
    }
  };
  const pick = (P, E, want, max) => {
    let best = -1, bv = max ? -Infinity : Infinity;
    for (let i = 0; i < N; i++) {
      if (P[i] !== want) continue;
      if (max ? E[i] > bv : E[i] < bv) { bv = E[i]; best = i; }
    }
    return best;
  };
  const rand = mulberry32(7);
  const init = new Uint8Array(N), E = new Float32Array(N);
  let ones = 0;
  for (let i = 0; i < N; i++) if (rand() < 0.1) { init[i] = 1; ones++; toggle(E, i, 1); }
  for (let guard = 0; guard < 4000; guard++) { // relax into an even pattern
    const c = pick(init, E, 1, true);
    init[c] = 0; toggle(E, c, -1);
    const v = pick(init, E, 0, false);
    init[v] = 1; toggle(E, v, 1);
    if (v === c) break;
  }
  const rank = new Float32Array(N);
  let P = init.slice(), E1 = E.slice();
  for (let r = ones - 1; r >= 0; r--) { const c = pick(P, E1, 1, true); P[c] = 0; toggle(E1, c, -1); rank[c] = r; }
  P = init.slice(); E1 = E.slice();
  for (let r = ones; r < N; r++) { const v = pick(P, E1, 0, false); P[v] = 1; toggle(E1, v, 1); rank[v] = r; }
  BN = rank.map((r) => (r + 0.5) / N);
  return BN;
}

export const DITHERS = [
  "bayer 2x2", "bayer 4x4", "bayer 8x8", "halftone dot", "line screen",
  "white noise", "blue noise", "interleaved gradient", "floyd-steinberg", "atkinson",
];
export const isErrorDiffusion = (pattern) => pattern === "floyd-steinberg" || pattern === "atkinson";

// Ordered / noise dither threshold at pattern coords (U, V); ink where t > threshold.
export function threshold(pattern, U, V, id, sc) {
  const X = Math.floor(U / sc), Y = Math.floor(V / sc);
  switch (pattern) {
    case "bayer 2x2": return BAYER[2][mod(Y, 2) * 2 + mod(X, 2)];
    case "bayer 4x4": return BAYER[4][mod(Y, 4) * 4 + mod(X, 4)];
    case "bayer 8x8": return BAYER[8][mod(Y, 8) * 8 + mod(X, 8)];
    case "halftone dot": {
      const p = 4 * sc, a = ((U + V) * Math.SQRT1_2 * 2 * Math.PI) / p, b = ((V - U) * Math.SQRT1_2 * 2 * Math.PI) / p;
      return (2 - Math.cos(a) - Math.cos(b)) / 4;
    }
    case "line screen": {
      const p = 4 * sc;
      return (1 - Math.cos(((U + V) * Math.SQRT1_2 * 2 * Math.PI) / p)) / 2;
    }
    case "white noise": return hash(X, Y, id);
    case "blue noise": return blueNoise()[mod(Y + id * 17, 64) * 64 + mod(X + id * 29, 64)];
    case "interleaved gradient": {
      const f = 0.06711056 * X + 0.00583715 * Y;
      const g = 52.9829189 * (f - Math.floor(f));
      return g - Math.floor(g);
    }
  }
  return 0.5;
}

// The ink decision for the live style (ISO_STYLE): hatching, or, with
// technique "dither", an ordered or noise pattern (dither.pattern, cell size
// dither.cellSize) on its own tone steps (toneSpec). Full tone is solid. id
// varies the noise patterns per face.
export function shadeInk(t, U, V, id = 0) {
  const s = ISO_STYLE, h = s.hatch;
  if (s.technique !== "dither") return hatchInk(h, t, U, V);
  if (t <= 0) return false;
  if (t >= 1 - 1e-6) return true;
  return t > threshold(s.dither?.pattern ?? "bayer 4x4", U, V, id, s.dither?.cellSize ?? 1);
}

const HATCH_ANGLES = [0, 90, 45, 135]; // cross mode adds layers in this order

// Hatching at pattern coords (U, V). Spacing and width are in emulated pixels.
export function hatchInk(h, t, U, V) {
  if (t <= 0) return false;
  if (h.solidDarkest && t >= h.darkest - 1e-6) return true;
  const base = (h.angle * Math.PI) / 180;
  // Distance is measured in whole pixels along the dominant axis (at 45° that's
  // U + V), so lines repeat on exact pixel periods and coverage is exactly w / pitch.
  const line = (angle, pitch, w, offset = 0) => {
    const c = Math.cos(angle), s = Math.sin(angle), n = Math.max(Math.abs(c), Math.abs(s));
    return mod(Math.floor((U * c + V * s) / n + 1e-6) + offset, pitch) < w;
  };
  // coverage: ink coverage equals the tone (25% steps at 5 steps). Lines stay at
  // `lineWidth` while lineWidth / t is a whole pitch, else they thicken at `spacing`.
  if (h.mode === "coverage") {
    if (t >= 1) return true;
    const pitch = h.lineWidth / t;
    if (Math.abs(pitch - Math.round(pitch)) < 1e-6 && Math.round(pitch) > h.lineWidth) return line(base, Math.round(pitch), h.lineWidth);
    return line(base, h.spacing, Math.max(1, Math.round(t * h.spacing)));
  }
  // density: the densest line step sits at `spacing` (the step below solid when
  // solidDarkest is on); lighter steps spread out, rounded to whole pixels.
  if (h.mode === "density") {
    const top = h.solidDarkest && h.steps > 2 ? stepTone(h, h.steps - 2) : h.darkest;
    return line(base, Math.max(h.lineWidth + 1, Math.round((h.spacing * top) / t)), h.lineWidth);
  }
  if (h.mode === "weight") return line(base, h.spacing, Math.max(1, t * h.spacing));
  const layers = Math.round(t * (h.steps - 1)); // cross: one more layer per step
  for (let i = 0; i < layers; i++) {
    const a = base + (HATCH_ANGLES[i % 4] * Math.PI) / 180;
    if (line(a, h.spacing, h.lineWidth, i >= 4 ? h.spacing / 2 : 0)) return true;
  }
  return false;
}

export const stepTone = (spec, k) => spec.lightest + ((spec.darkest - spec.lightest) * k) / (spec.steps - 1);
export const quantize = (spec, s) => stepTone(spec, Math.round(Math.min(1, Math.max(0, s)) * (spec.steps - 1)));

// The live style's tone steps: the hatch ramp, or with technique "dither" the
// dither's own (dither.steps from lightest to darkest, 6 by default). Bayer
// matrices nest, so on the hatch ramp's quarters a 2x2, 4x4 and 8x8 light the
// same pixels; their own steps fall between and tell them apart.
export function toneSpec() {
  const s = ISO_STYLE;
  if (s.technique !== "dither") return s.hatch;
  const d = s.dither ?? {};
  return { steps: d.steps ?? 6, lightest: d.lightest ?? 0, darkest: d.darkest ?? 1 };
}
// A scene's fill step k (1-3, on the hatch ramp) in the live style: the hatch
// tone, or the dither step nearest it.
export function liveStep(k) {
  const t = stepTone(ISO_STYLE.hatch, k);
  return ISO_STYLE.technique === "dither" ? quantize(toneSpec(), t) : t;
}

// ---------- raster: convex polygons into per-pixel tone + pattern coords ----------

export class Raster {
  constructor(w, h) {
    this.w = w; this.h = h; const n = w * h;
    this.tone = new Float32Array(n); this.U = new Float32Array(n); this.V = new Float32Array(n);
    this.fid = new Int32Array(n); this.edge = new Int32Array(n); // edge: owner id + 1
    this.clear();
  }
  // clip: null, or [x0, y0, x1, y1] in buffer px (x1, y1 exclusive): fills and
  // lines draw only inside it (a flat scene's content wiping in, graphic.js).
  clear() { this.tone.fill(-1); this.fid.fill(-1); this.edge.fill(0); this.count = 0; this.boxes = []; this.clip = null; }

  // pts in buffer px; basis maps buffer px to face-local coords; edgeWidth is the
  // outline in pixels. Returns the shape id.
  fill(pts, t, { edges = false, edgeWidth = 1, basis = null } = {}) {
    const { w, h, tone, U, V, fid, edge } = this, id = this.count++;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, area = 0;
    pts.forEach(([x, y], i) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      const [nx, ny] = pts[(i + 1) % pts.length];
      area += x * ny - nx * y;
    });
    const sign = area >= 0 ? 1 : -1, n = pts.length;
    // A pixel is inside when its centre is on the inner side of every edge
    // (convex polygons). Each edge is a linear test in x, so each row is one
    // span; only the pixels at the span's ends are tested exactly.
    const inside = (px, py) => {
      for (let i = 0; i < n; i++) {
        const a = pts[i], c = pts[(i + 1) % n];
        if (sign * ((c[0] - a[0]) * (py - a[1]) - (c[1] - a[1]) * (px - a[0])) < 0) return false;
      }
      return true;
    };
    const c = this.clip ?? [0, 0, w, h];
    const bx0 = Math.max(0, c[0], Math.floor(x0)), bx1 = Math.min(w - 1, c[2] - 1, Math.ceil(x1));
    const by0 = Math.max(0, c[1], Math.floor(y0)), by1 = Math.min(h - 1, c[3] - 1, Math.ceil(y1));
    for (let y = by0; y <= by1; y++) {
      const py = y + 0.5;
      let lo = -Infinity, hi = Infinity;
      for (let i = 0; i < n && lo <= hi; i++) {
        const a = pts[i], c = pts[(i + 1) % n];
        // sign * ((cx - ax) * (py - ay) - (cy - ay) * (px - ax)) >= 0, i.e. A * px + B >= 0
        const A = -sign * (c[1] - a[1]), B = sign * ((c[0] - a[0]) * (py - a[1]) + (c[1] - a[1]) * a[0]);
        if (A > 0) lo = Math.max(lo, -B / A);
        else if (A < 0) hi = Math.min(hi, -B / A);
        else if (B < 0) { lo = Infinity; break; }
      }
      if (!(lo <= hi + 2)) continue;
      const xa = Math.max(bx0, Math.ceil(lo - 0.5) - 1), xb = Math.min(bx1, Math.floor(hi - 0.5) + 1);
      // Exact test at the span's ends; the pixels between are inside.
      let xs = xa, xe = xb;
      while (xs <= xe && (xs <= xa + 1) && !inside(xs + 0.5, py)) xs++;
      while (xe >= xs && (xe >= xb - 1) && !inside(xe + 0.5, py)) xe--;
      if (xs > xe) continue;
      const row = y * w;
      tone.fill(t, row + xs, row + xe + 1);
      fid.fill(id, row + xs, row + xe + 1);
      edge.fill(0, row + xs, row + xe + 1);
      if (basis) {
        const dy = py - basis.oy, cu = basis.inv[1] * dy, cv = basis.inv[3] * dy;
        for (let x = xs, i = row + xs; x <= xe; x++, i++) {
          const dx = x + 0.5 - basis.ox;
          U[i] = (basis.inv[0] * dx + cu) * basis.la;
          V[i] = (basis.inv[2] * dx + cv) * basis.lb;
        }
      } else {
        for (let x = xs, i = row + xs; x <= xe; x++, i++) { U[i] = x + 0.5; V[i] = py; }
      }
    }
    this.boxes[id] = [bx0, by0, bx1, by1]; // every pixel this shape filled is inside
    if (edges) for (let i = 0; i < pts.length; i++) this.line(pts[i], pts[(i + 1) % pts.length], id, edgeWidth);
    return id;
  }

  // Bresenham line stamped with a lw x lw square, owned by shape id. dash:
  // [on, off] in pixel steps. clear: stamp ground instead (casing).
  line([ax, ay], [cx, cy], id = 0, lw = 1, { dash = null, clear = false } = {}) {
    const { w, h, edge, tone, fid } = this, [cx0, cy0, cx1, cy1] = this.clip ?? [0, 0, w, h];
    const o0 = -(lw >> 1), o1 = lw - (lw >> 1);
    let n = 0;
    const stamp = (x, y) => {
      if (dash && n++ % (dash[0] + dash[1]) >= dash[0]) return;
      for (let sy = o0; sy < o1; sy++) for (let sx = o0; sx < o1; sx++) {
        const px = x + sx, py = y + sy;
        if (px < cx0 || py < cy0 || px >= cx1 || py >= cy1) continue;
        const i = py * w + px;
        if (clear) { tone[i] = 0; fid[i] = -1; edge[i] = 0; } else edge[i] = id + 1;
      }
    };
    let x = Math.floor(ax), y = Math.floor(ay);
    const x2 = Math.floor(cx), y2 = Math.floor(cy);
    const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 10000; guard++) {
      stamp(x, y);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
}

// ---------- isometric object ----------

// Exploded stack: base plate, block, cap and pin, with gaps between.
const BOXES = [
  { c: [0, -0.95, 0], s: [2.4, 0.3, 2.4] },
  { c: [0, 0.05, 0], s: [1.4, 0.9, 1.4] },
  { c: [0, 0.85, 0], s: [1.4, 0.2, 1.4] },
  { c: [0, 1.45, 0], s: [0.3, 0.5, 0.3] },
];
export const ISO_YAW = 45;
export const ISO_PITCH = (Math.asin(Math.tan(Math.PI / 6)) * 180) / Math.PI; // 35.264°

export function boxFaces({ c, s }) {
  const [hx, hy, hz] = s.map((v) => v / 2);
  const p = (x, y, z) => [c[0] + x * hx, c[1] + y * hy, c[2] + z * hz];
  return [
    { n: [0, 1, 0], v: [p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1)] },
    { n: [0, -1, 0], v: [p(-1, -1, 1), p(1, -1, 1), p(1, -1, -1), p(-1, -1, -1)] },
    { n: [1, 0, 0], v: [p(1, 1, 1), p(1, 1, -1), p(1, -1, -1), p(1, -1, 1)] },
    { n: [-1, 0, 0], v: [p(-1, 1, -1), p(-1, 1, 1), p(-1, -1, 1), p(-1, -1, -1)] },
    { n: [0, 0, 1], v: [p(-1, 1, 1), p(1, 1, 1), p(1, -1, 1), p(-1, -1, 1)] },
    { n: [0, 0, -1], v: [p(1, 1, -1), p(-1, 1, -1), p(-1, -1, -1), p(1, -1, -1)] },
  ];
}
const FACES = BOXES.flatMap(boxFaces);

export function rotator(yawDeg, pitchDeg) {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  const cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p);
  return ([x, yy, z]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    return [x1, yy * cp - z1 * sp, yy * sp + z1 * cp];
  };
}

// Light direction (view space) from style.lightAngle / lightHeight in degrees.
export function lightVector(style) {
  const az = (style.lightAngle * Math.PI) / 180, el = (style.lightHeight * Math.PI) / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

// Fills one visible face. n: rotated normal; pts: projected [x, y, z]; f: the
// face (world verts, for face-anchored pattern lengths); k: px per world unit.
export function fillFace(r, f, n, pts, { k, spec, style, L }) {
  const lit = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  const t = quantize(spec, style.inkShows === "shadow" ? 1 - lit : lit);
  const p2 = pts.map(([x, y]) => [x, y]);
  let basis = null;
  if (style.patternAnchor === "object") {
    const ax = p2[1][0] - p2[0][0], ay = p2[1][1] - p2[0][1];
    const bx = p2[3][0] - p2[0][0], by = p2[3][1] - p2[0][1];
    const det = ax * by - bx * ay;
    if (Math.abs(det) > 1e-6) {
      const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * k;
      basis = { ox: p2[0][0], oy: p2[0][1], inv: [by / det, -bx / det, -ay / det, ax / det], la: len(f.v[0], f.v[1]), lb: len(f.v[0], f.v[3]) };
    }
  }
  return r.fill(p2, t, { edges: style.edges, edgeWidth: style.innerEdges ?? 1, basis });
}

// Fills the iso object's visible faces into raster r, back to front.
// cx, cy: centre in buffer px; k: buffer px per world unit; spec: the technique's
// steps; style: patternAnchor, edges, innerEdges, inkShows, lightAngle, lightHeight. Returns the shape ids.
export function fillIso(r, { spin, cx, cy, k, spec, style }) {
  const R = rotator(ISO_YAW + spin.yaw, ISO_PITCH + spin.pitch), L = lightVector(style);
  const proj = (p) => { const q = R(p); return [cx + q[0] * k, cy - (q[1] - 0.25) * k, q[2]]; };
  const vis = [];
  for (const f of FACES) {
    const n = R(f.n);
    if (n[2] <= 1e-4) continue;
    const pts = f.v.map(proj);
    vis.push({ f, n, pts, depth: pts.reduce((a, p) => a + p[2], 0) / 4 });
  }
  vis.sort((a, b) => a.depth - b.depth);
  const ids = vis.map(({ f, n, pts }) => fillFace(r, f, n, pts, { k, spec, style, L }));
  return ids;
}

// ---------- drag to rotate, spring back to the iso pose ----------

export class Spin {
  constructor() { this.yaw = 0; this.pitch = 0; this.vy = 0; this.vp = 0; this.held = false; this.last = 0; }
  grab() { this.held = true; this.vy = this.vp = 0; }
  move(dx, dy) { // CSS px
    this.yaw += dx * 0.4;
    this.pitch = Math.max(-ISO_PITCH, Math.min(90 - ISO_PITCH, this.pitch + dy * 0.4)); // side view to top-down
  }
  release() { this.held = false; }
  get settled() { return !this.held && this.yaw === 0 && this.pitch === 0; }
  // Critically damped spring; call every frame. Returns true while moving.
  step(now) {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.held) return true;
    let busy = false;
    for (const [x, v] of [["yaw", "vy"], ["pitch", "vp"]]) {
      this[v] += (-272 * this[x] - 33 * this[v]) * dt; // critically damped, settles in ~400 ms
      this[x] += this[v] * dt;
      if (Math.abs(this[x]) < 0.01 && Math.abs(this[v]) < 0.01) { this[x] = 0; this[v] = 0; } else busy = true;
    }
    return busy;
  }
}

const rgbCache = new Map();
export function rgb(css) {
  if (!rgbCache.has(css)) {
    const c = document.createElement("canvas").getContext("2d");
    c.fillStyle = css;
    const hex = c.fillStyle; // normalised to #rrggbb or rgba()
    let v;
    if (hex.startsWith("#")) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    else v = hex.match(/[\d.]+/g).slice(0, 3).map(Number);
    rgbCache.set(css, v);
  }
  return rgbCache.get(css);
}
