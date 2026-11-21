// Genie: a text block funnels into the bottom-right corner of its panel's box
// and pours back out of it. Rules are in docs/design-system/motion.md; the test
// page is genie.html (js/genie.js, graph editor in js/genie-graphs.js).
//
// text-raster.js draws a genie block's words into an offscreen canvas at the
// same low-res scale, then warpBlock() copies it into the frame row by row.
// The block goes line by line, bottom line out first (so stepping back brings
// the top line in first): each line starts (1 + follow) x duration after the
// one below it (-1 = all together, 0 = one right after another, 1 = a pause of
// one duration between lines). Within a line:
//   - slit-scan: each source row runs at its own time, ahead toward the
//     line's bottom (tRow = t * (1 + slit) - slit * (1 - v), v = 0 at the
//     line's top row, 1 at its bottom row). Rows pull apart as they travel,
//     and each one stretches to fill the gap below it: the smear.
//   - narrowing: the narrow graph (over tRow) sets how far the funnel's sides
//     have pulled in toward the sink's width, shaped down the funnel by the
//     edge profile through (0, 0), (0.25, p25), (0.5, p50), (0.75, p75), (1, 1)
//   - arc: the arc graph (over tRow) sets how far the funnel's spine swings
//     sideways, up to `arc` units, in `bends` S-bends down the funnel (0 at
//     both ends), from a rounded sine (severity 0) to a kinked triangle (1)
//   - slide: from slideStart on, the row travels down the funnel into the
//     sink; rows past the sink are hidden
// Rows are emulated pixels; rowBand groups them so the funnel's sides step.

// A graph: anchors sorted by x (0..1, a row's time), y the level. Segments are
// cubic beziers from each anchor's out-handle to the next one's in-handle.
// The defaults are the user's tuned graphs:
//   arc: eases up to full swing by 0.75 of a row's time, then holds
//   narrow: stays wide until about 0.16, then pulls in gradually to full at the end
const DEFAULT_GRAPHS = {
  arc: [
    { x: 0, y: 0, hin: [0, 0], hout: [0.1, 0] },
    { x: 0.752, y: 1, hin: [-0.1, 0], hout: [0.248, 0] },
    { x: 1, y: 1, hin: [-0.248, 0], hout: [0, 0] },
  ],
  narrow: [
    { x: 0, y: 0, hin: [0, 0], hout: [0.1, 0] },
    { x: 0.164, y: 0, hin: [-0.099, -0.011], hout: [0.192, 0.021] },
    { x: 1, y: 1, hin: [-0.322, 0.009], hout: [0, 0] },
  ],
};
export const defaultGraph = (key) => structuredClone(DEFAULT_GRAPHS[key]);

export const settings = {
  duration: 300,     // ms per line
  follow: -0.5,      // -1 all lines together .. 0 one after another .. 1 a duration's pause between
  curve: "ease",     // ease (in-out cubic) | out (decelerating), for each row's slide
  slideStart: 0.67,  // when, in a row's time, the slide down the funnel begins
  p25: 0.8,          // edge profile: how far the sides have narrowed a quarter of the way down
  p50: 0.79,         //   ... halfway
  p75: 0.77,         //   ... three quarters
  slit: 1,           // slit-scan spread: how far ahead rows lower in a line run
  rowBand: 1,        // emulated pixel rows per step of the funnel's sides
  sinkWidth: 8,      // units: the funnel's width where it meets the panel's corner
  arc: -48,          // maximum spine swing, units (scaled by the arc graph)
  bends: 3,          // S-bends along the spine
  severity: 0,       // 0 rounded .. 1 kinked
  trailBoost: 0,     // extra ghost decay while a genie runs (phosphor trail)
  hold: false,       // freeze every block at `scrub` (a fraction of the whole run)
  scrub: 0,
  graphs: { arc: defaultGraph("arc"), narrow: defaultGraph("narrow") },
  graphsRev: 0,      // bump after editing graphs, so their lookups are rebuilt
};

const CURVES = {
  ease: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  out: (p) => 1 - (1 - p) ** 3,
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ---------- graphs ----------

// Points along a graph's bezier segments, x never decreasing.
export function graphPoints(anchors, steps = 48) {
  const pts = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i], b = anchors[i + 1];
    const p0 = [a.x, a.y], p1 = [a.x + a.hout[0], a.y + a.hout[1]], p2 = [b.x + b.hin[0], b.y + b.hin[1]], p3 = [b.x, b.y];
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const t = s / steps, m = 1 - t;
      const c = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
      pts.push([c[0] * p0[0] + c[1] * p1[0] + c[2] * p2[0] + c[3] * p3[0], c[0] * p0[1] + c[1] * p1[1] + c[2] * p2[1] + c[3] * p3[1]]);
    }
  }
  for (let i = 1; i < pts.length; i++) pts[i][0] = Math.max(pts[i][0], pts[i - 1][0]);
  return pts;
}

// A 257-entry lookup of y by x (0..1).
export function sampleGraph(anchors) {
  const pts = graphPoints(anchors), N = 256, out = new Float32Array(N + 1);
  let j = 0;
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    while (j + 1 < pts.length - 1 && pts[j + 1][0] < x) j++;
    const [x0, y0] = pts[j], [x1, y1] = pts[Math.min(j + 1, pts.length - 1)];
    out[i] = x1 > x0 ? y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) : y1;
  }
  return out;
}

export function evalGraph(lookup, x) {
  const f = clamp01(x) * (lookup.length - 1), i = Math.floor(f), u = f - i;
  return i >= lookup.length - 1 ? lookup[lookup.length - 1] : lookup[i] + (lookup[i + 1] - lookup[i]) * u;
}

let lookups = null, lookupsRev = -1;
function graphLookups() {
  if (lookupsRev !== settings.graphsRev || !lookups) {
    lookups = { arc: sampleGraph(settings.graphs.arc), narrow: sampleGraph(settings.graphs.narrow) };
    lookupsRev = settings.graphsRev;
  }
  return lookups;
}

// ---------- timing ----------

const blocks = new Map();     // el -> { from, to, t0, dur }
const lineCounts = new Map(); // el -> number of lines (from text-raster's measure)
export const setLines = (el, n) => lineCounts.set(el, Math.max(1, n));
export const lineCount = (el) => lineCounts.get(el) ?? 1;

// The whole run for el, ms: one duration per line, each line offset from the last.
export function totalFor(el) {
  const n = lineCounts.get(el) ?? 1, d = settings.duration;
  return d * (1 + (n - 1) * (1 + settings.follow));
}

// Starts el moving to `to` (1 = in the sink, 0 = in place) from wherever it is.
export function play(el, to, now = performance.now()) {
  const from = genieT(el, now);
  const dur = totalFor(el) * Math.abs(to - from);
  blocks.set(el, { from, to, t0: now, dur });
}

// Fraction 0..1 of el's whole run.
function rawT(el, now) {
  if (settings.hold) return settings.scrub;
  const b = blocks.get(el);
  if (!b) return 0;
  if (b.dur <= 0) return b.to;
  const p = clamp01((now - b.t0) / b.dur);
  return b.from + (b.to - b.from) * p;
}

// Progress of el, 0 (in place) .. 1 (in the sink), linear in time. The graphs
// and the slide curve shape each row instead.
export const genieT = (el, now = performance.now()) => clamp01(rawT(el, now));

export function running(now = performance.now()) {
  if (settings.hold) return settings.scrub > 0 && settings.scrub < 1;
  for (const b of blocks.values()) if (b.dur > 0 && now - b.t0 < b.dur) return true;
  return false;
}

export const ghostBoost = (now) => (running(now) ? settings.trailBoost : 0);

// The own progress 0..1 of the line that goes i-th, at block progress t, for n lines.
export function lineT(t, i, n) {
  const d = settings.duration, total = d * (1 + (n - 1) * (1 + settings.follow));
  return clamp01((t * total - i * (1 + settings.follow) * d) / d);
}

// ---------- shape ----------

// Edge profile: Catmull-Rom through the five profile points, v in 0..1.
function profile(v) {
  const P = [0, settings.p25, settings.p50, settings.p75, 1];
  const at = (i) => (i < 0 ? 2 * P[0] - P[1] : i > 4 ? 2 * P[4] - P[3] : P[i]);
  const x = clamp01(v) * 4, i = Math.min(3, Math.floor(x)), u = x - i;
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
}

// Spine shape down the funnel, -1..1: S-bends that are 0 at both ends.
function spine(v) {
  const x = Math.PI * Math.round(settings.bends) * clamp01(v), sine = Math.sin(x);
  const tri = (2 / Math.PI) * Math.asin(sine);
  return sine + (tri - sine) * settings.severity;
}

// The sink for a block, from its panel's box (any pixel units): the panel's
// inner bottom-right corner, sinkWidth wide. unitPx converts units.
export function sinkOf(panel, line, unitPx) {
  const x1 = panel.x + panel.w - line;
  return { x0: x1 - settings.sinkWidth * unitPx, x1, y: panel.y + panel.h - line };
}

// Copies the warped block from `src` (an offscreen canvas the size of dst's
// canvas, same transform) into dst. Everything is in low-res pixels:
// B = { x0, x1, y0, y1, lines: [{ y0, y1 }] } the block's text box and line
// bands, T = { x0, x1, y } the sink, arcPx the maximum spine swing.
export function warpBlock(dst, src, B, T, t, arcPx = 0) {
  if (t <= 0) return dst.drawImage(src, 0, 0);
  if (t >= 1) return;
  const { slideStart, slit } = settings, ease = CURVES[settings.curve];
  const G = graphLookups();
  const band = Math.max(1, Math.round(settings.rowBand));
  const bw = B.x1 - B.x0;
  const lines = B.lines?.length ? B.lines : [{ y0: B.y0, y1: B.y1 }];
  const n = lines.length;
  // The bottom line leads on the way out. Lines draw in order of progress, so
  // a moving line passes over waiting ones.
  const order = lines.map((line, i) => ({ line, lt: lineT(t, n - 1 - i, n) })).sort((a, b) => a.lt - b.lt);
  dst.save();
  dst.setTransform(1, 0, 0, 1, 0, 0);
  dst.imageSmoothingEnabled = false;
  for (const { line, lt } of order) {
    if (lt >= 1) continue;
    const top = Math.floor(line.y0), bottom = Math.ceil(line.y1), H = bottom - top;
    if (H < 1) continue;
    if (lt <= 0) { dst.drawImage(src, B.x0, top, bw, H, B.x0, top, bw, H); continue; }
    const D = T.y - top;
    if (D <= 1) continue;
    // Each source row's narrowing, swing and destination row.
    const rows = [];
    for (let r = top; r <= bottom; r++) {
      const v = (r - top) / H;
      const tRow = clamp01(lt * (1 + slit) - slit * (1 - v));
      const s = ease(clamp01((tRow - slideStart) / (1 - slideStart)));
      rows.push({ r, narrow: evalGraph(G.narrow, tRow), swing: evalGraph(G.arc, tRow), y: r + s * D });
    }
    for (let i = 0; i < H; i++) {
      const { r, narrow, swing, y } = rows[i];
      const y0 = Math.round(y), y1 = Math.max(y0 + 1, Math.round(rows[i + 1].y));
      for (let yy = y0; yy < y1 && yy < T.y; yy++) {
        const ey = yy - ((yy - top) % band); // the funnel's sides step per band
        const v = clamp01((ey - top) / D);
        const k = profile(v) * narrow, shift = arcPx * swing * spine(v);
        const L = Math.round(B.x0 + (T.x0 - B.x0) * k + shift), R = Math.round(B.x1 + (T.x1 - B.x1) * k + shift);
        if (R - L >= 1) dst.drawImage(src, B.x0, r, bw, 1, L, yy, R - L, 1);
      }
    }
  }
  dst.restore();
}
