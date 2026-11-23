// Scene kind "knot" (js/graphic.js): file glyphs tied on one closed elastic cord
// that follows a 3D trefoil. 3D shown flat: the cord and the files live in 3D,
// seen by a straight-on orthographic camera; the glyphs are upright billboards
// (no rotated text) and depth only sets the draw order. Rules in
// docs/design-system/graphics.md; first used on slide 5 of Max's Section.
//
// Scene fields:
//   files: [{ id, ext, group }]   tied on the cord in this order
//   scatter: [[x, y, z]]          each file's place untied (design units from the centre)
//   knot: { scale, depth, tilt, period }
//     scale: design units per trefoil unit, a number or [x, y] (the knot
//     stretched to its box; z follows x); depth: the trefoil's z amplitude
//     (trefoil units); tilt: the tumble axis's lean towards the viewer (deg);
//     period: ms per turn of the tumble loop
//     stretch: the most the drawing widens (view x) to fill a box wider than
//     the design box (slide 7's 8 columns); 1 by default. Glyphs never stretch.
//     phase: cord points the files sit along from the trefoil's start. 0 puts
//     two files on the tumble's axis, where they never move; half the spacing
//     between files keeps every one swinging
//   glyph: { w, h, ear, font }    in design units, never scaled (like captions)
//   spring: { zeta, settle, coupling }
//     an underdamped spring per cord point towards its target (zeta, settling
//     in `settle` ms), plus `coupling` (times its stiffness) between
//     neighbours, so a pull spreads along the cord and ripples back
// State values (tweened): tie 0..1, untied (scatter) to tied (the trefoil);
// draw 0..1, how much of the cord is drawn, from the first file round.
// State loop "tumble": turns about the tilted vertical axis. A drag pauses it;
// it resumes from where it was. Leaving the loop eases the turn back to rest
// along the step's tween.
//
// The sim runs in view space (design units, x right, y down, z towards the
// viewer), so a drag is in the screen plane.

import { ISO_STYLE, stepTone } from "./shade.js";

const N = 96;          // cord points
const STEP = 1 / 480;  // sim step, s
const INK = 4;         // cord, glyph outline
const FOLD = 2;        // the dog-ear's fold
const CASING = 2;      // ground each side of the cord
const RADIUS = 8;

const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// The trefoil, centred on its bounds, y up (trefoil units).
const curve = (() => {
  const raw = Array.from({ length: N }, (_, i) => {
    const t = (i / N) * 2 * Math.PI;
    return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)];
  });
  const lo = [0, 1].map((k) => Math.min(...raw.map((p) => p[k]))), hi = [0, 1].map((k) => Math.max(...raw.map((p) => p[k])));
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
  return raw.map(([x, y, z]) => [x - c[0], y - c[1], z]);
})();

function state(m) {
  if (!m.knot) {
    m.knot = {
      pos: new Float64Array(N * 3), vel: new Float64Array(N * 3), tgt: new Float64Array(N * 3),
      angle: 0, back: null, last: 0, fresh: true, drag: null, glyphs: [],
    };
  }
  return m.knot;
}

// Targets: each cord point between the untied path (straight between scattered
// files) and the trefoil, by tie; turned by the tumble and tilted.
function targets(m, k, tie, whirl = null) {
  const sc = m.scene, kn = sc.knot, nf = sc.files.length, per = N / nf;
  const a = (k.angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const b = ((kn.tilt ?? 0) * Math.PI) / 180, cb = Math.cos(b), sb = Math.sin(b);
  for (let i = 0; i < N; i++) {
    const f0 = Math.floor(i / per), u = i / per - f0, A = sc.scatter[f0], B = sc.scatter[(f0 + 1) % nf];
    const ux = A[0] + (B[0] - A[0]) * u, uy = A[1] + (B[1] - A[1]) * u, uz = A[2] + (B[2] - A[2]) * u;
    const c = curve[(i + (kn.phase ?? 0)) % N]; // phase: where on the trefoil the first file ties
    const [kx, ky] = Array.isArray(kn.scale) ? kn.scale : [kn.scale, kn.scale];
    const tx = c[0] * kx, ty = -c[1] * ky, tz = c[2] * (kn.depth ?? 1) * kx;
    let x = ux + (tx - ux) * tie, y = uy + (ty - uy) * tie, z = uz + (tz - uz) * tie;
    // Turn about the vertical (y) axis, then lean it towards the viewer (about x).
    const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
    const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
    let sx = x1 * (k.stretch ?? 1), sy = y2, sz = z2;
    // The whirlpool (slide 8): turned in the screen plane by phi and drawn
    // in towards the centre by radius.
    if (whirl) {
      const c = Math.cos(whirl.phi), s = Math.sin(whirl.phi);
      [sx, sy] = [(sx * c - sy * s) * whirl.radius, (sx * s + sy * c) * whirl.radius];
      sz *= whirl.radius;
    }
    k.tgt[i * 3] = sx; k.tgt[i * 3 + 1] = sy; k.tgt[i * 3 + 2] = sz;
  }
}

function simulate(m, k, dt, motion) {
  const { pos, vel, tgt } = k, sp = m.scene.spring ?? {};
  const zeta = sp.zeta ?? 0.4, w = 4 / (zeta * ((sp.settle ?? 800) / 1000)); // settles (2%) in `settle`
  const K = w * w, C = 2 * zeta * w, KC = K * (sp.coupling ?? 48);
  const pinned = k.drag ? k.drag.node : -1;
  if (pinned >= 0) {
    pos[pinned * 3] = k.drag.x; pos[pinned * 3 + 1] = k.drag.y;
    vel[pinned * 3] = vel[pinned * 3 + 1] = vel[pinned * 3 + 2] = 0;
  }
  if (!motion && pinned < 0) { pos.set(tgt); vel.fill(0); return; }
  const steps = Math.min(40, Math.ceil(dt / STEP)), h = dt / Math.max(1, steps);
  const d = new Float64Array(N * 3);
  for (let s = 0; s < steps; s++) {
    for (let j = 0; j < N * 3; j++) d[j] = pos[j] - tgt[j];
    for (let i = 0; i < N; i++) {
      if (i === pinned) continue;
      const p = ((i - 1 + N) % N) * 3, n = ((i + 1) % N) * 3, o = i * 3;
      for (let c = 0; c < 3; c++) {
        const a = -K * d[o + c] - C * vel[o + c] + KC * (d[p + c] + d[n + c] - 2 * d[o + c]);
        vel[o + c] += a * h;
      }
    }
    for (let i = 0; i < N; i++) if (i !== pinned) for (let c = 0; c < 3; c++) pos[i * 3 + c] += vel[i * 3 + c] * h;
  }
}

// The tumble angle for this frame (deg).
function tumble(m, k, st, dt, motion) {
  const period = m.scene.knot.period ?? 24000;
  if (st.loop === "tumble" && motion) {
    k.back = null;
    // Starts once the knot is tied; a pull pauses it.
    if (!k.drag && !m.tween) k.angle = (k.angle + (dt * 1000 * 360) / period) % 360;
    return;
  }
  // Not looping: ease back to rest along the step's tween (shortest way round).
  if (!k.angle) return;
  const wrapped = ((k.angle + 540) % 360) - 180;
  if (!m.tween || !motion) { k.angle = 0; k.back = null; return; }
  if (!k.back) k.back = { from: wrapped, t0: m.tween.t0, dur: m.tween.dur };
  const p = Math.min(1, (performance.now() - k.back.t0) / k.back.dur);
  k.angle = k.back.from * (1 - easeIO(p));
  if (p >= 1) { k.angle = 0; k.back = null; }
}

// ---------- text in the raster ----------

const masks = new Map();
let fontEpoch = 0;
document.fonts?.addEventListener("loadingdone", () => { fontEpoch++; masks.clear(); });
document.fonts?.load('400 24px "JetBrains Mono"').catch(() => {});

document.fonts?.load('500 24px "Chakra Petch"').catch(() => {});
const CODE = '400 {px}px "JetBrains Mono", monospace', LABEL = '500 {px}px "Chakra Petch", sans-serif';

// The text drawn at px, thresholded at half coverage (as text-raster does).
// face: CODE (file names) or LABEL (the label role).
export function textMask(text, px, face = CODE) {
  const key = `${text}|${px}|${face}|${fontEpoch}`;
  if (masks.has(key)) return masks.get(key);
  if (masks.size > 400) masks.clear(); // the whirlpool shrinks text through many sizes
  const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
  const font = face.replace("{px}", px);
  g.font = font;
  const w = Math.max(1, Math.ceil(g.measureText(text).width) + 2), h = Math.max(1, Math.ceil(px * 1.4));
  c.width = w; c.height = h;
  g.font = font; g.textBaseline = "middle"; g.fillStyle = "#000";
  g.fillText(text, 1, h / 2);
  const a = g.getImageData(0, 0, w, h).data, on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = a[i * 4 + 3] >= 128 ? 1 : 0;
  const mask = { w, h, on };
  masks.set(key, mask);
  return mask;
}

export function stamp(r, mask, cx, cy, id) {
  const x0 = Math.round(cx - mask.w / 2), y0 = Math.round(cy - mask.h / 2);
  const [qx0, qy0, qx1, qy1] = r.clip ?? [0, 0, r.w, r.h];
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) {
    if (!mask.on[y * mask.w + x]) continue;
    const px = x0 + x, py = y0 + y;
    if (px < qx0 || py < qy0 || px >= qx1 || py >= qy1 || px >= r.w || py >= r.h) continue;
    r.edge[py * r.w + px] = id + 1;
  }
}

// A ground casing line (lw wide) that leaves the pixels of `keep` (owner ids
// + 1) alone, so a strand's casing doesn't notch its own neighbouring segments.
function casing(r, [ax, ay], [cx, cy], lw, keep) {
  const { w, h, edge, tone, fid } = r, [qx0, qy0, qx1, qy1] = r.clip ?? [0, 0, w, h];
  const o0 = -(lw >> 1), o1 = lw - (lw >> 1);
  let x = Math.floor(ax), y = Math.floor(ay);
  const x2 = Math.floor(cx), y2 = Math.floor(cy);
  const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 10000; guard++) {
    for (let oy = o0; oy < o1; oy++) for (let ox = o0; ox < o1; ox++) {
      const px = x + ox, py = y + oy;
      if (px < qx0 || py < qy0 || px >= qx1 || py >= qy1) continue;
      const i = py * w + px;
      if (keep.has(edge[i])) continue;
      tone[i] = 0; fid[i] = -1; edge[i] = 0;
    }
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ---------- painting ----------

// Called from graphic.js paint(). P maps design units to buffer px; own(id,
// part) records an owner; rounded(pts, rad, closed) rounds corners; chevron
// and pullBack draw connector arrows (graphic.js).
export function paintKnot(m, r, st, vals, ctx) {
  const { P, own, scale, f, now, motion, rounded } = ctx;
  const sc = m.scene, k = state(m), [W, H] = sc.size;
  const dt = k.last && now - k.last < 500 ? Math.min(0.05, (now - k.last) / 1000) : 0;
  if (k.last && now - k.last >= 500) { k.fresh = true; k.angle = 0; k.back = null; } // back on screen: from rest
  k.last = now;
  tumble(m, k, st, dt, motion);
  const el = m.el, cols = columns(m), elW = r.w / f, elH = r.h / f;

  // Slide 8's merge (0..1, on its own clock: phases in ms of merge.ms).
  const { mergeT, makeT } = timeline(m, vals, now);
  syncTemplate(m, makeT);
  const M = sc.merge ?? {}, mt = mergeT * (M.ms ?? 2400);
  const drift = easeIO(seg(mt, ...(M.drift ?? [0, 1100])));
  const drainP = seg(mt, ...(M.drain ?? [250, 1300]));
  const whirl = mergeT > 0 ? { radius: 1 - drainP * drainP, phi: (M.turns ?? 2) * 2 * Math.PI * drainP * drainP } : null;

  // The design width the box has room for (the box fits by height when it's
  // wider): the drawing widens towards it, up to knot.stretch (or the
  // element's data-stretch), centred.
  const ox = P(0, 0)[0] / f, room = Math.max(W, (elW - ox) / scale);
  const cap = el.dataset.stretch ? Number(el.dataset.stretch) : sc.knot.stretch ?? 1;
  k.stretch = Math.min(cap, room / W);
  k.cx = room / 2;
  // Where the knot's centre is (element units): the box's middle, or the
  // middle of column data-knot-col (slide 8, where it was on slide 7), moving
  // to the folder's column as it drifts.
  const colMid = (c) => (cols ? (cols[c - 1][0] + cols[c - 1][1]) / 2 : elW / 2);
  const home = el.dataset.knotCol ? colMid(Number(el.dataset.knotCol)) : ox + k.cx * scale;
  const rowsH = m.fitH ?? elH; // the knot's rows (data-fit-rows), where the folder and tiles sit
  const node = { x: el.dataset.nodeCol ? colMid(Number(el.dataset.nodeCol)) : elW / 2, y: rowsH / 2 };
  const midY = P(0, H / 2)[1] / f;
  k.cEl = home + (node.x - home) * drift;
  k.cyEl = midY + (node.y - midY) * drift;

  targets(m, k, vals.tie, whirl);
  if (k.fresh || mergeT > 0) { k.pos.set(k.tgt); k.vel.fill(0); k.fresh = false; } // the whirlpool is drawn exactly
  else simulate(m, k, dt, motion);

  k.glyphs = [];
  if (drainP < 1) paintCord(m, r, k, vals, { own, scale, f, rounded, gscale: whirl ? whirl.radius : 1 });
  if (mergeT > 0) paintMerge(m, r, k, { ...ctx, mt, M, node, cols, elW, elH, rowsH, makeT });
}

const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
// Slide 8's one sequence: merge (merge.ms), then make (make.ms), on the
// tween's raw clock (linear), so every phase keeps its ms and the order holds
// both ways (back runs make backwards, then merge). The state's duration is
// merge.ms + make.ms.
function timeline(m, vals, now) {
  const sc = m.scene, A = sc.merge?.ms ?? 2400, B = sc.make?.ms ?? 3300;
  const at = (v) => (v.merge ?? 0) * A + (v.make ?? 0) * B;
  const tw = m.tween;
  let T = at(vals);
  if (tw && at(tw.from) !== at(tw.to)) T = at(tw.from) + (at(tw.to) - at(tw.from)) * Math.max(0, Math.min(1, (now - tw.t0) / tw.dur));
  const clamp = (v) => Math.max(0, Math.min(1, v));
  return { mergeT: clamp(T / A), makeT: clamp((T - A) / B) };
}

// The template the sculpture comes from (the slide's [data-handover]) is the
// knot scene's to show: whole until make starts, its content wiping out over
// make.strip ms, then hidden (the sculpture draws its boxes from then on).
// Set from the paint each frame, and at once when a state is cut to.
export function syncTemplate(m, makeT = null) {
  if (makeT == null) makeT = timeline(m, { merge: m.scene.states?.[m.index]?.merge ?? 0, make: m.scene.states?.[m.index]?.make ?? 0 }, performance.now()).makeT;
  const tpl = m.el.closest("[data-slide]")?.querySelector("[data-handover]");
  if (!tpl) return;
  const strip = m.scene.make?.strip ?? 400, ms = makeT * (m.scene.make?.ms ?? 3300);
  const hidden = ms >= strip, wipe = hidden || makeT <= 0 ? 1 : 1 - easeIO(ms / strip);
  if (tpl.hidden === hidden && tpl._wipe === wipe) return;
  tpl.hidden = hidden;
  tpl._wipe = wipe;
  tpl.querySelectorAll(".tpl-content").forEach((c) => (wipe >= 1 ? c.style.removeProperty("--wipe") : c.style.setProperty("--wipe", wipe)));
  window.dispatchEvent(new Event("lab:layout"));
}
// The slide's columns, [x0, x1] in element units from the element's left
// (read from the slide's grid, so they hold while a carried box moves).
function columns(m) {
  const slide = m.el.closest(".slide"), u = m.geom?.u;
  if (!slide || !u) return null;
  const cs = getComputedStyle(slide), sr = slide.getBoundingClientRect(), er = m.el.getBoundingClientRect();
  const widths = cs.gridTemplateColumns.split(" ").map(parseFloat), gap = parseFloat(cs.columnGap) || 0;
  let x = sr.left + (parseFloat(cs.paddingLeft) || 0) - er.left;
  return widths.map((w) => { const c = [x / u, (x + w) / u]; x += w + gap; return c; });
}

function paintCord(m, r, k, vals, { own, scale, f, rounded, gscale }) {
  const sc = m.scene, nf = sc.files.length, per = N / nf, pos = k.pos;
  const at = (i) => [(k.cEl + pos[i * 3] * scale) * f, (k.cyEl + pos[i * 3 + 1] * scale) * f];
  const z = (i) => pos[i * 3 + 2];

  // Painter's order, farthest first: the cord (over and under itself), then
  // the files above all of it, so the cord never runs across a file; it runs
  // in under each tag.
  const items = [];
  const drawn = vals.draw * N; // segments from file 0 round
  for (let s = 0; s < N && s < drawn; s++) items.push({ seg: s, part: Math.min(1, drawn - s), depth: (z(s) + z((s + 1) % N)) / 2 });
  items.sort((a, b) => a.depth - b.depth);
  const files = sc.files.map((file, fi) => ({ file, fi, depth: z(fi * per) })).sort((a, b) => a.depth - b.depth);
  items.push(...files);

  // Cord segment ids first, so a segment's casing knows its neighbours'.
  const segId = new Int32Array(N).fill(-1);
  for (const it of items) if (it.seg != null) segId[it.seg] = own(r.count++, "cord");
  const keepOf = (s) => {
    const keep = new Set();
    for (let d = -2; d <= 2; d++) { const id = segId[(s + d + N) % N]; if (id >= 0) keep.add(id + 1); }
    return keep;
  };

  // Glyphs never scale (like captions), except as the whirlpool draws them in.
  const g = sc.glyph, gw = g.w * f * gscale, gh = g.h * f * gscale, ear = g.ear * f * gscale;
  const fontPx = Math.round(g.font * f * gscale);
  for (const it of items) {
    if (it.seg != null) {
      const a = at(it.seg), b0 = at((it.seg + 1) % N);
      const b = it.part < 1 ? [a[0] + (b0[0] - a[0]) * it.part, a[1] + (b0[1] - a[1]) * it.part] : b0;
      casing(r, a, b, INK + 2 * CASING, keepOf(it.seg));
      r.line(a, b, segId[it.seg], INK);
      continue;
    }
    if (gw < 2) continue;
    const [cx, cy] = at(it.fi * per), x0 = cx - gw / 2, y0 = cy - gh / 2;
    // Dog-eared page: the top-right corner cut, a ground fill so it hides what's behind.
    const pts = rounded([[x0, y0], [x0 + gw - ear, y0], [x0 + gw, y0 + ear], [x0 + gw, y0 + gh], [x0, y0 + gh]], RADIUS, true);
    const id = own(r.fill(pts, 0, { edges: true, edgeWidth: INK }), it.file.id);
    r.line([x0 + gw - ear, y0], [x0 + gw - ear, y0 + ear], id, FOLD);
    r.line([x0 + gw - ear, y0 + ear], [x0 + gw, y0 + ear], id, FOLD);
    if (fontPx >= 4) stamp(r, textMask(it.file.ext, fontPx), cx, cy + ear / 4, id);
    if (gscale >= 1) k.glyphs.push({ fi: it.fi, box: [x0, y0, x0 + gw, y0 + gh], depth: it.depth });
  }
}

// ---------- slide 8: the project folder and what comes out of it ----------

const backOut = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

// The folder pops out where the knot drained, then the four symbols' tiles
// fan out to the left on connectors (drawn from the folder outward, chevrons
// at the tiles), then (make) the template's sculpture and its link.
function paintMerge(m, r, k, ctx) {
  const { own, f, rounded, chevron, pullBack, mt, M, node, cols, rowsH, makeT, now, motion } = ctx;
  const sc = m.scene, tiles = sc.tiles ?? [];
  const nodeP = seg(mt, ...(M.node ?? [1300, 1650]));
  const n = sc.node ?? { w: 80, h: 64, tab: [32, 12], label: "project/", font: 24 };
  const ns = nodeP > 0 ? backOut(nodeP) : 0;
  const B = (x, y) => [x * f, y * f]; // element units -> buffer px

  // Tiles and connectors first, so the folder sits over the connectors' start.
  const T = sc.tile ?? { size: 72, gap: 16, font: 24 };
  // The tiles' outer edge on column 1's left edge (outlines are centred, so in by half).
  const x0 = (cols ? cols[0][0] : 0) + INK / 2 / f;
  const labelPx = Math.round(T.font * f);
  const masks = tiles.map((t) => textMask(t.label, labelPx, LABEL));
  const labelEnd = x0 + T.size + T.gap + Math.max(...masks.map((mk) => mk.w)) / f;
  const startX = node.x - n.w / 2, trunk = (labelEnd + startX) / 2;
  tiles.forEach((t, i) => {
    const p = seg(mt, ...(M.tiles ?? [1550, 2050]).map((v) => v + i * (M.stagger ?? 90)));
    if (p <= 0) return;
    const ty = (rowsH * (i + 0.5)) / tiles.length;
    let pts = [B(startX, node.y), B(trunk, node.y), B(trunk, ty), B(labelEnd, ty)];
    pts = rounded(pullBack(pts, 32), RADIUS, false);
    const id = own(r.count++, "out-" + t.id);
    const done = drawPart(r, pts, p, id);
    if (p >= 1) {
      chevron(r, pts[pts.length - 2], pts[pts.length - 1], id);
      m.flows.push({ pts, id });
      paintTile(r, own, t, B(x0, ty - T.size / 2), T.size * f, f, rounded);
      const mk = masks[i];
      stamp(r, mk, (x0 + T.size + T.gap) * f + mk.w / 2, ty * f, own(r.count++, t.id));
    }
    return done;
  });

  if (ns > 0) {
    // A folder: a tab on its top left, then the body; ground fills, 4 outlines.
    const w = n.w * ns * f, h = n.h * ns * f, tw = n.tab[0] * ns * f, th = n.tab[1] * ns * f;
    const cx = node.x * f, cy = node.y * f, bx = cx - w / 2, by = cy - h / 2 + th / 2;
    const id = own(r.fill(rounded([[bx, by - th], [bx + tw, by - th], [bx + tw, by], [bx, by]], Math.min(RADIUS / 2, th / 2), true), 0, { edges: true, edgeWidth: INK }), "project");
    r.fill(rounded([[bx, by], [bx + w, by], [bx + w, by + h - th], [bx, by + h - th]], RADIUS, true), 0, { edges: true, edgeWidth: INK });
    own(r.count - 1, "project");
    const px = Math.round(n.font * f * Math.min(1, ns));
    if (px >= 4) stamp(r, textMask(n.label, px), cx, by + h - th + (n.font * 0.5 + 12) * f, id);
  }

  if (makeT > 0 && ctx.paintSculpt) ctx.paintSculpt(m, r, { ...ctx, makeT, node: { ...node, right: node.x + n.w / 2 } });
}

// Draws the first p (0..1) of a polyline's length; true when it's all drawn.
export function drawPart(r, pts, p, id, lw = INK) {
  let total = 0;
  const lens = [];
  for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
  let left = total * p;
  for (let i = 0; i + 1 < pts.length && left > 0; i++) {
    const a = pts[i], b = pts[i + 1], q = Math.min(1, left / (lens[i] || 1));
    r.line(a, [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q], id, lw);
    left -= lens[i];
  }
  return p >= 1;
}

// One symbol tile: a 4 outlined box (8 corners) with its icon in 2 lines.
function paintTile(r, own, t, [x, y], size, f, rounded) {
  const id = own(r.fill(rounded([[x, y], [x + size, y], [x + size, y + size], [x, y + size]], RADIUS, true), 0, { edges: true, edgeWidth: INK }), t.id);
  const cx = x + size / 2, cy = y + size / 2, a = size * 0.3, L = FOLD;
  const fill = (pts, tone) => own(r.fill(pts, tone, { edges: true, edgeWidth: L }), t.id);
  if (t.icon === "cube") {
    const h = a * 0.866;
    fill([[cx, cy - a], [cx + h, cy - a / 2], [cx, cy], [cx - h, cy - a / 2]], 0);
    fill([[cx - h, cy - a / 2], [cx, cy], [cx, cy + a], [cx - h, cy + a / 2]], stepTone(ISO_STYLE.hatch, 2));
    fill([[cx, cy], [cx + h, cy - a / 2], [cx + h, cy + a / 2], [cx, cy + a]], stepTone(ISO_STYLE.hatch, 1));
  } else if (t.icon === "swatch") {
    fill(rounded([[cx - a, cy - a], [cx + a, cy - a], [cx + a, cy + a], [cx - a, cy + a]], RADIUS / 2, true), stepTone(ISO_STYLE.hatch, 2));
  } else if (t.icon === "panels") {
    fill(rounded([[cx - a, cy - a], [cx + a, cy - a], [cx + a, cy + a], [cx - a, cy + a]], RADIUS / 2, true), 0);
    const sx = cx - a / 3;
    r.line([sx, cy - a], [sx, cy + a], id, L);
    r.line([sx, cy], [cx + a, cy], id, L);
  } else if (t.icon === "arrow") {
    // A quarter arc from the bottom left, rising to the right, with an open head.
    const pts = [];
    for (let j = 0; j <= 12; j++) { const th = Math.PI - (j / 12) * (Math.PI / 2); pts.push([cx + a + Math.cos(th) * 2 * a, cy + a - Math.sin(th) * 2 * a * 0.9]); }
    for (let j = 0; j + 1 < pts.length; j++) r.line(pts[j], pts[j + 1], id, L);
    const tip = pts[pts.length - 1], hd = a * 0.6;
    r.line(tip, [tip[0] - hd, tip[1] - hd * 0.9], id, L);
    r.line(tip, [tip[0] - hd, tip[1] + hd * 0.9], id, L);
  }
}

// ---------- pulling ----------

// A pointer on a glyph grabs that file; it follows the pointer in the screen
// plane and springs back on release. Not during a step's transition.
export function wireKnotDrag(m, isMotion) {
  const { el } = m;
  el.style.touchAction = "none";
  const local = (ev) => {
    const g = m.geom, r = el.getBoundingClientRect();
    if (!g) return null;
    return [(ev.clientX - r.left) / g.ps, (ev.clientY - r.top) / g.ps]; // buffer px
  };
  const glyphAt = (b) => {
    const k = m.knot;
    if (!k || !b) return null;
    let hit = null;
    for (const gl of k.glyphs) {
      const [x0, y0, x1, y1] = gl.box;
      if (b[0] >= x0 && b[0] <= x1 && b[1] >= y0 && b[1] <= y1 && (!hit || gl.depth > hit.depth)) hit = gl;
    }
    return hit;
  };
  const toDesign = (b) => {
    const { f, s } = m.geom;
    return [(b[0] / f - m.knot.cEl) / s, (b[1] / f - m.knot.cyEl) / s];
  };
  // A built solid under the pointer (slide 8): its index, from the last raster.
  const solidAt = (b) => {
    const R = m.raster;
    if (!m.sculptReady || !R || !b) return -1;
    const x = Math.floor(b[0]), y = Math.floor(b[1]);
    if (x < 0 || y < 0 || x >= R.w || y >= R.h) return -1;
    const i = y * R.w + x, id = R.edge[i] ? R.edge[i] - 1 : R.fid[i];
    const part = id >= 0 ? m.owners[id]?.part : null;
    return part?.startsWith("card-") ? Number(part.slice(5)) : -1;
  };
  el.addEventListener("pointerdown", (ev) => {
    if (m.tween || !m.knot) return;
    const b = local(ev), si = solidAt(b);
    if (si >= 0 && m.solidSpin?.[si]) {
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      m.solidDrag = { i: si, at: [ev.clientX, ev.clientY] };
      m.solidSpin[si].grab();
      el.style.cursor = "grabbing";
      return;
    }
    const hit = glyphAt(b);
    if (!hit) return;
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    const node = hit.fi * (N / m.scene.files.length), k = m.knot;
    const [dx, dy] = toDesign(b);
    k.drag = { node, off: [k.pos[node * 3] - dx, k.pos[node * 3 + 1] - dy], x: k.pos[node * 3], y: k.pos[node * 3 + 1] };
    el.style.cursor = "grabbing";
  });
  el.addEventListener("pointermove", (ev) => {
    const k = m.knot, b = local(ev);
    if (m.solidDrag) {
      const d = m.solidDrag;
      m.solidSpin[d.i].move(ev.clientX - d.at[0], ev.clientY - d.at[1]);
      d.at = [ev.clientX, ev.clientY];
      return;
    }
    if (k?.drag) {
      const [dx, dy] = toDesign(b);
      k.drag.x = dx + k.drag.off[0]; k.drag.y = dy + k.drag.off[1];
      return;
    }
    el.style.cursor = !m.tween && (glyphAt(b) || solidAt(b) >= 0) ? "grab" : "";
  });
  const up = () => {
    const k = m.knot;
    if (m.solidDrag) {
      const sp = m.solidSpin[m.solidDrag.i];
      m.solidDrag = null;
      sp.release();
      if (!isMotion()) sp.yaw = sp.pitch = sp.vy = sp.vp = 0; // motion off: snap back
      el.style.cursor = "grab";
      return;
    }
    if (!k?.drag) return;
    k.drag = null;
    if (!isMotion()) { k.pos.set(k.tgt); k.vel.fill(0); } // motion off: snap back
    el.style.cursor = "grab";
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

// A step started: let go of any pull.
export function releaseKnot(m) {
  if (m.knot) m.knot.drag = null;
  m.solidDrag = null;
  for (const sp of m.solidSpin ?? []) { sp.release(); sp.yaw = sp.pitch = sp.vy = sp.vp = 0; }
}
