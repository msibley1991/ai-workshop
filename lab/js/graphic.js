// Scene engine: every graphic, flat or isometric, is a JS scene (js/graphics/*.js)
// mounted on an element with data-graphic="<name>" and drawn into the raster by
// text-raster.js. The rules are in docs/design-system/graphics.md:
//   - every pixel is ground, ink, or accent (focus); shading is hatching
//   - lines: 4 for every shape edge (outer and inner alike), 2 connectors
//   - connectors: arrowheads, dashed = hypothetical, flow packets; leader lines
//     end in a square dot on the object and are cased in ground
//   - labels are real DOM text (label role), placed off the hatching
//   - steps (← →) move between named states with one tween (400 or 800 ms,
//     ease-in-out); rapid presses skip to the end; motion off cuts
//   - iso objects drag to rotate and spring back; not during a transition
//
// Scene coordinates are design units in a `size` [w, h] box. The element is the
// graphic's column span (graphic + captions), set by the page. The geometry is
// scaled so the longest caption on each side ends on the element's edge, and a
// side without captions puts the drawing's edge there (`fit`). Line weights and
// hatching never scale. `span: [min, max]` is the scene's range in columns
// (`graphicSpan`). Iso scenes put the world origin at `origin` (design units)
// and draw `scale` design units per world unit.
import {
  ISO_STYLE, ISO_YAW, ISO_PITCH, Raster, Spin, hatchInk, stepTone, rotator, boxFaces, lightVector, fillFace, rgb,
} from "./shade.js";
import SCENES from "./graphics/index.js";

const INNER = ISO_STYLE.inner;    // 4, every shape edge
const LINE = 2;                   // connectors and leader lines
const CASING = 2;                 // ground each side of a leader line
const DOT = 6;                    // leader-line dot, square
const ARROW = [12, 6];            // arrowhead length, half-width (emulated px)
const DASH = [6, 4];              // on, off (pixel steps)
const PACKET = [12, 4];           // flow packet length, width
const PACKET_SPEED = 48;          // emulated px per second
const BLINK_MS = 500;             // focus blink half-period
const CAPTION_GAP = 8;            // leader end -> caption text (units)

let motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
export function setMotion(on) { motion = on; }

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mounts = new Map(); // el -> mount

// A scene's span range in columns, for the page's reflow; null if none mounts here.
export function graphicSpan(el) { return SCENES[el?.dataset.graphic]?.span ?? null; }
export function graphicStates(el) { return SCENES[el?.dataset.graphic]?.states?.length ?? 1; }

// ---------- mounting ----------

export function mountGraphic(el) {
  if (mounts.has(el)) return mounts.get(el);
  const scene = SCENES[el.dataset.graphic];
  if (!scene) { console.warn("[graphic] unknown scene", el.dataset.graphic); return null; }
  const m = {
    el, scene, index: 0, tween: null, spin: new Spin(), hover: null,
    canvas: null, looks: [], raster: null, image: null, alignT: null, flows: [],
    labels: new Map(), owners: [], accent: [], geom: null,
  };
  mounts.set(el, m);
  queueMicrotask(() => syncLabels(m));
  el.style.position = "relative";
  for (const l of scene.labels ?? []) {
    const span = document.createElement("span");
    span.className = "graphic-label";
    span.textContent = l.text;
    span.hidden = true;
    el.append(span);
    m.labels.set(l.id, span);
  }
  if (scene.kind === "iso") wireDrag(m);
  el.addEventListener("pointermove", (ev) => { if (!m.drag) setHover(m, hitTest(m, ev)); });
  el.addEventListener("pointerleave", () => setHover(m, null));
  return m;
}

function wireDrag(m) {
  const { el } = m;
  el.style.touchAction = "none";
  el.style.cursor = "grab";
  el.addEventListener("pointerdown", (ev) => {
    if (m.tween) return; // no dragging during a transition
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId);
    m.drag = [ev.clientX, ev.clientY];
    m.spin.grab();
    el.style.cursor = "grabbing";
  });
  el.addEventListener("pointermove", (ev) => {
    if (!m.drag) return;
    m.spin.move(ev.clientX - m.drag[0], ev.clientY - m.drag[1]);
    m.drag = [ev.clientX, ev.clientY];
  });
  const up = () => {
    if (!m.drag) return;
    m.drag = null;
    m.spin.release();
    if (!motion) { m.spin.yaw = m.spin.pitch = m.spin.vy = m.spin.vp = 0; } // snap back
    el.style.cursor = "grab";
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

function setHover(m, partId) {
  if (m.hover === partId) return;
  m.hover = partId;
  syncLabels(m);
}

// Part or shape id under the pointer, from the last drawn raster.
function hitTest(m, ev) {
  if (!m.raster || !m.geom) return null;
  const r = m.el.getBoundingClientRect(), { ps, bw, bh } = m.geom;
  const x = Math.floor((ev.clientX - r.left) / ps), y = Math.floor((ev.clientY - r.top) / ps);
  if (x < 0 || y < 0 || x >= bw || y >= bh) return null;
  const i = y * bw + x, R = m.raster;
  const id = R.edge[i] ? R.edge[i] - 1 : R.fid[i];
  return id >= 0 ? m.owners[id]?.part ?? null : null;
}

// ---------- steps ----------

const stateAt = (m, i) => m.scene.states?.[i] ?? {};
const valuesOf = (st) => ({ explode: st.explode ?? 0 });

// Steps every graphic currently on screen. Returns true if any moved.
export function stepGraphics(dir) {
  let moved = false;
  for (const m of mounts.values()) if (onScreen(m.el) && step(m, dir)) moved = true;
  return moved;
}

function onScreen(el) {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const clip = el.closest("[data-clip]")?.getBoundingClientRect();
  if (clip && (cx < clip.left || cx > clip.right || cy < clip.top || cy > clip.bottom)) return false;
  return cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
}

function step(m, dir) {
  const count = m.scene.states?.length ?? 1;
  const next = Math.max(0, Math.min(count - 1, m.index + dir));
  if (next === m.index) return false;
  const now = performance.now();
  const from = m.tween ? m.tween.to : valuesOf(stateAt(m, m.index)); // rapid press: skip to the end
  const dur = motion ? (stateAt(m, Math.max(m.index, next)).duration ?? 400) : 0;
  m.index = next;
  m.tween = dur > 0 ? { from, to: valuesOf(stateAt(m, next)), t0: now, dur } : null;
  if (m.tween) { m.spin.release(); m.spin.yaw = m.spin.pitch = m.spin.vy = m.spin.vp = 0; m.drag = null; }
  syncLabels(m);
  return true;
}

// Moves one graphic to state `index` (slides, js/slides.js): tweened unless
// animate is false or motion is off. A tween in progress skips to its end first.
export function setGraphicState(el, index, animate = true) {
  const m = mountGraphic(el);
  if (!m) return;
  const count = m.scene.states?.length ?? 1;
  const next = Math.max(0, Math.min(count - 1, index));
  if (next === m.index && !m.tween) return;
  const from = m.tween ? m.tween.to : valuesOf(stateAt(m, m.index));
  const dur = animate && motion ? (stateAt(m, Math.max(m.index, next)).duration ?? 400) : 0;
  m.index = next;
  m.tween = dur > 0 ? { from, to: valuesOf(stateAt(m, next)), t0: performance.now(), dur } : null;
  if (m.tween) { m.spin.release(); m.spin.yaw = m.spin.pitch = m.spin.vy = m.spin.vp = 0; m.drag = null; }
  syncLabels(m);
}

// Overrides where a box-fitted graphic sits in its box: 0 hangs from the top,
// 1 stands on the bottom, null goes back to data-align. A carried graphic's
// move interpolates it (js/slides.js).
export function setGraphicAlign(el, a) {
  const m = mountGraphic(el);
  if (m) m.alignT = a;
}
export const graphicAlign = (el) => mounts.get(el)?.alignT ?? (el.dataset.align === "bottom" ? 1 : 0);

// A carried graphic (the same scene on the next slide) starts where the old one is.
export function copyGraphicState(fromEl, toEl) {
  const a = mountGraphic(fromEl), b = mountGraphic(toEl);
  if (!a || !b) return;
  b.index = a.index;
  b.tween = null;
  syncLabels(b);
}

function currentValues(m, now) {
  if (!m.tween) return valuesOf(stateAt(m, m.index));
  const p = Math.min(1, (now - m.tween.t0) / m.tween.dur);
  if (p >= 1) { m.tween = null; return valuesOf(stateAt(m, m.index)); }
  const e = ease(p), { from, to } = m.tween;
  return { explode: from.explode + (to.explode - from.explode) * e };
}

// ---------- labels ----------

function shownLabels(m) {
  const st = stateAt(m, m.index), on = new Set(st.labels ?? []);
  for (const l of m.scene.labels ?? []) if (l.hover && m.hover && l.for === m.hover) on.add(l.id);
  return on;
}

// Positions and shows the DOM labels for the current state (and hover).
function syncLabels(m) {
  const on = shownLabels(m), st = stateAt(m, m.index);
  let changed = false;
  for (const l of m.scene.labels ?? []) {
    const span = m.labels.get(l.id), hide = !on.has(l.id);
    if (span.hidden !== hide) { span.hidden = hide; changed = true; }
    const ink = st.focus && l.for === st.focus ? "accent" : "phosphor";
    if (span.dataset.ink !== ink) { span.dataset.ink = ink; changed = true; }
  }
  if (changed) window.dispatchEvent(new Event("lab:layout"));
}

// Caption lines in design units, one per side: the outermost
// `at` x of all that side's labels (shown or not, so nothing jumps between
// states), unless scene.labelColumns sets it.
function captionLines(scene) {
  if (!scene._columns) {
    const xs = (side) => (scene.labels ?? []).filter((q) => (q.side ?? "right") === side).map((q) => q.at[0]);
    const left = xs("left"), right = xs("right");
    scene._columns = {
      left: scene.labelColumns?.left ?? (left.length ? Math.min(...left) : 0),
      right: scene.labelColumns?.right ?? (right.length ? Math.max(...right) : 0),
    };
  }
  return scene._columns;
}
// Where a label's leader ends, in buffer px. Right captions: on the shared
// caption line. Left captions are left-aligned on the span's edge, so each
// leader ends one gap short of its own caption.
function leaderEnd(m, l, P, f) {
  const p = P(...labelPoint(m.scene, l));
  if (l.side === "left") {
    // The shown label's own DOM width (canvas measureText runs a few units short).
    const span = m.labels.get(l.id), w = span.offsetWidth ? span.getBoundingClientRect().width / m.geom.u : m.caps.width.get(l.id);
    p[0] = (w + CAPTION_GAP) * f + LINE / 2; // the line stamp reaches LINE / 2 px left of its point
  }
  return p;
}
const labelPoint = (scene, l) => [captionLines(scene)[l.side === "left" ? "left" : "right"], l.at[1]];

// Label boxes follow the element box; called from draw with the current offset.
function placeLabels(m, ox, oy, s) {
  for (const l of m.scene.labels ?? []) {
    const span = m.labels.get(l.id), [lx, ly] = labelPoint(m.scene, l);
    // Left captions start on the span's edge (x 0), so all their left edges align;
    // right captions start just past the caption line.
    const x = l.side === "left" ? 0 : ox + lx * s + CAPTION_GAP, y = oy + ly * s - 16;
    span.style.left = `calc(${x} * var(--u))`;
    span.style.top = `calc(${y} * var(--u))`;
  }
}

// ---------- fitting to the span ----------

// Caption widths in units: the longest label per side, shown or not (so the
// fit doesn't change between states). Measured with the labels' own font and
// re-measured when fonts finish loading.
const measure = document.createElement("canvas").getContext("2d");
let fontEpoch = 0;
document.fonts?.addEventListener("loadingdone", () => fontEpoch++);
function captionWidths(m, u) {
  if (m.caps && m.caps.epoch === fontEpoch && m.caps.u === u) return m.caps;
  const caps = { epoch: fontEpoch, u, left: null, right: null, width: new Map() };
  for (const l of m.scene.labels ?? []) {
    const cs = getComputedStyle(m.labels.get(l.id));
    measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const side = l.side === "left" ? "left" : "right";
    const w = measure.measureText(l.text).width / u;
    caps.width.set(l.id, w);
    caps[side] = Math.max(caps[side] ?? 0, w);
  }
  return (m.caps = caps);
}

// Scale s and offset (units, in the element) that map the design box onto the
// element: caption lines sit a caption (plus gap) in from each edge; a side
// without captions maps the design box's edge onto the element's edge.
// box (slides: data-fit="box"): the element is a box of columns x row fields,
// so the scale also stops at the box's height, and the drawing hangs from the
// box's top (data-align="top") or stands on its bottom ("bottom"). Without a
// box the drawing is fitted by width and centred vertically.
function fit(m, W, H, u, box = null) {
  const scene = m.scene, caps = captionWidths(m, u);
  const cols = captionLines(scene);
  const dL = caps.left != null ? cols.left : 0, dR = caps.right != null ? cols.right : scene.size[0];
  const aL = caps.left != null ? caps.left + CAPTION_GAP : 0;
  const aR = W - (caps.right != null ? caps.right + CAPTION_GAP : 0);
  let s = (aR - aL) / (dR - dL);
  if (box) s = Math.min(s, H / scene.size[1]);
  s = Math.max(0.05, s);
  const slack = H - scene.size[1] * s;
  return { s, ox: aL - dL * s, oy: box ? slack * box.align : slack / 2 };
}

// ---------- drawing ----------

// item: { el, x, y, w, h } in document CSS px (from text-raster measure).
// u: CSS px per unit; ps: CSS px per emulated pixel; colors: display colours.
export function drawGraphic(ctx, item, ps, u, colors) {
  const m = mountGraphic(item.el);
  if (!m) return;
  const now = performance.now();
  m.spin.step(now);
  const bw = Math.max(1, Math.round(item.w / ps)), bh = Math.max(1, Math.round(item.h / ps));
  if (!m.raster || m.raster.w !== bw || m.raster.h !== bh) {
    m.raster = new Raster(bw, bh);
    m.image = new ImageData(bw, bh);
    m.looks = [];
  }
  const vals = currentValues(m, now), st = stateAt(m, m.index);
  const box = item.el.dataset.fit === "box" ? { align: m.alignT ?? (item.el.dataset.align === "bottom" ? 1 : 0) } : null;
  const { s, ox, oy } = fit(m, item.w / u, item.h / u, u, box); // design units -> element units
  const f = u / ps; // buffer px per unit
  m.geom = { ps, bw, bh, ox, oy, f, s, u };
  placeLabels(m, ox, oy, s);

  // A look is one painted image. Painting is the expensive part, so the last
  // two looks are kept: a blink alternates between them without repainting,
  // and flow packets are drawn over the look each frame instead of in it.
  const blinkOn = !motion || st.loop !== "blink" || Math.floor(now / BLINK_MS) % 2 === 0;
  const flowing = motion && (st.flow?.length ?? 0) > 0;
  const key = [bw, bh, ox, oy, f, s, m.index, vals.explode, m.spin.yaw, m.spin.pitch, m.hover, blinkOn,
    colors.phosphor, colors.accent, colors.ground].join("|");
  let look = m.looks.find((l) => l.key === key);
  if (!look) {
    look = m.looks.length < 2 ? { canvas: document.createElement("canvas") } : m.looks.shift();
    look.key = key;
    look.canvas.width = bw; look.canvas.height = bh;
    m.canvas = look.canvas;
    paint(m, vals, st, { f, s, ox, oy, now, blinkOn });
    compose(m, rgb(colors.phosphor), rgb(colors.accent), rgb(colors.ground));
    look.accent = m.accent;
    look.flows = m.flows;
    m.looks.push(look);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(look.canvas, item.x, item.y, bw * ps, bh * ps);
  if (flowing) {
    for (const fl of look.flows) {
      ctx.fillStyle = look.accent[fl.id] ? colors.accent : colors.phosphor;
      packet(fl.pts, now, (x, y, w, h) => ctx.fillRect(item.x + x * ps, item.y + y * ps, w * ps, h * ps), bw, bh);
    }
  }
}

function paint(m, vals, st, { f, s: scale, ox, oy, now, blinkOn }) {
  const r = m.raster, scene = m.scene;
  r.clear();
  m.owners = []; m.accent = []; m.flows = [];
  const focus = blinkOn ? st.focus ?? null : null;
  const own = (id, part) => { m.owners[id] = { part }; m.accent[id] = focus != null && part === focus; return id; };
  const P = (x, y) => [(ox + x * scale) * f, (oy + y * scale) * f]; // design units -> buffer px
  const show = st.show ? new Set(st.show) : null;
  const visible = (id) => !show || show.has(id);

  // Point resolver for connectors and leaders: [x, y] in scene units, or
  // { part, point: [x, y, z] } on an iso part (local to its centre).
  let resolve = (p) => P(p[0], p[1]);
  const anchors = new Map(); // label id -> buffer point, for automatic iso anchors

  if (scene.kind === "iso") {
    const k = scene.scale * scale * f;
    const R = rotator(ISO_YAW + m.spin.yaw, ISO_PITCH + m.spin.pitch), L = lightVector(ISO_STYLE);
    const [cx, cy] = P(...scene.origin);
    const offsetOf = (part) => (part.explode ?? [0, 0, 0]).map((v) => v * vals.explode);
    const world = (part, p) => { const o = offsetOf(part); return [part.box.c[0] + o[0] + p[0], part.box.c[1] + o[1] + p[1], part.box.c[2] + o[2] + p[2]]; };
    const proj = (p) => { const q = R(p); return [cx + q[0] * k, cy - q[1] * k, q[2]]; };
    const byId = new Map(scene.parts.map((p) => [p.id, p]));
    resolve = (p) => (Array.isArray(p) ? P(p[0], p[1]) : proj(world(byId.get(p.part), p.point)).slice(0, 2));

    const vis = [];
    for (const part of scene.parts) {
      if (!visible(part.id)) continue;
      const o = offsetOf(part);
      for (const face of boxFaces(part.box)) {
        const n = R(face.n);
        if (n[2] <= 1e-4) continue;
        const v = face.v.map((p) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]]);
        const pts = v.map(proj);
        vis.push({ part, face: { ...face, v }, n, pts, depth: pts.reduce((a, p) => a + p[2], 0) / 4 });
      }
    }
    vis.sort((a, b) => a.depth - b.depth);
    const facesOf = new Map();
    for (const { part, face, n, pts } of vis) {
      const id = own(fillFace(r, face, n, pts, { k, spec: ISO_STYLE.hatch, style: ISO_STYLE, L }), part.id);
      if (!facesOf.has(part.id)) facesOf.set(part.id, []);
      facesOf.get(part.id).push(id);
    }
    // Automatic leader anchors ({ part } with no point): on the part's most
    // visible plane, found before connectors and leaders draw over the faces.
    const shownNow = shownLabels(m);
    for (const l of scene.labels ?? []) {
      if (!shownNow.has(l.id) || !l.anchor || Array.isArray(l.anchor) || l.anchor.point) continue;
      const pt = autoAnchor(r, facesOf.get(l.anchor.part) ?? [], l.side ?? "right");
      if (pt) anchors.set(l.id, pt);
    }
  } else {
    // Flat shapes, in order. fill: "none" (ground), "solid", or a hatch step 1..3.
    // outline: "none", or anything else (the 4 edge; "outer" and "inner" are the same).
    for (const s of (scene.shapes ?? []).filter((s) => visible(s.id))) {
      const t = s.fill === "solid" ? 1 : typeof s.fill === "number" ? stepTone(ISO_STYLE.hatch, s.fill) : 0;
      own(r.fill(shapePoints(s, P), t, { edges: s.outline !== "none", edgeWidth: INNER }), s.part ?? s.id);
    }
  }

  // Connectors: 2-pixel lines, orthogonal or 45°; arrow ends; dashed; flow packets.
  for (const c of scene.connectors ?? []) {
    if (!visible(c.id)) continue;
    const pts = c.pts.map(resolve);
    const id = own(r.count++, c.part ?? c.id);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, LINE, { dash: c.dashed ? DASH : null });
    if (c.end === "arrow") own(arrowhead(r, pts[pts.length - 2], pts[pts.length - 1]), c.part ?? c.id);
    if (st.flow?.includes(c.id)) m.flows.push({ pts, id }); // packets: drawn over the look (drawGraphic)
  }

  // Leader lines for shown labels: cased in ground, square dot on the object.
  const on = shownLabels(m);
  for (const l of scene.labels ?? []) {
    if (!on.has(l.id) || !l.anchor) continue;
    const a = anchors.get(l.id) ?? resolve(l.anchor), b = leaderEnd(m, l, P, f), pts = route(a, b, l.id);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], 0, LINE + 2 * CASING, { clear: true });
    // Squares of exactly n pixels (the fill includes pixels on both edges).
    const square = (half) => { const lo = -half, hi = half - 1e-3; return [[a[0] + lo, a[1] + lo], [a[0] + hi, a[1] + lo], [a[0] + hi, a[1] + hi], [a[0] + lo, a[1] + hi]]; };
    const d = DOT / 2;
    own(r.fill(square(d + CASING), 0), null); // the dot is cased too
    const id = own(r.count++, l.for);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, LINE);
    own(r.fill(square(d), 1), l.for);
  }
}

// The anchor for a leader on an iso part: the part's face with the most visible
// pixels (after occlusion; near-ties go to the face on the label's side), at a
// point well inside that visible area (up to 10 px from its edges), and among
// those the one nearest the label's side.
function autoAnchor(r, faceIds, side) {
  if (!faceIds.length) return null;
  const { w, h, fid, edge, boxes } = r;
  // Each pass runs only inside the faces' boxes, grown by 1 and clipped to the
  // buffer. Pixels outside a face's box are never that face, so the result is
  // the same as scanning the whole buffer.
  const area = (ids) => {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (const id of ids) {
      const b = boxes[id];
      if (!b) continue;
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
    }
    return x1 < 0 ? null : [Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(w - 1, x1 + 1), Math.min(h - 1, y1 + 1)];
  };
  const all = area(faceIds);
  if (!all) return null;
  const slot = new Int32Array(r.count).fill(-1);
  faceIds.forEach((id, k) => { slot[id] = k; });
  const count = new Int32Array(faceIds.length), sumX = new Float64Array(faceIds.length);
  for (let y = all[1]; y <= all[3]; y++) for (let x = all[0], i = y * w + x; x <= all[2]; x++, i++) {
    const f = fid[i];
    if (f < 0 || edge[i]) continue;
    const k = slot[f];
    if (k < 0) continue;
    count[k]++; sumX[k] += x;
  }
  let most = 0;
  for (const n of count) most = Math.max(most, n);
  if (!most) return null;
  // Faces within 10% of the most visible are a tie: take the one on the label's side.
  // (Faces in first-seen pixel order, as the old Map scan visited them.)
  const order = faceIds.map((id, k) => k).filter((k) => count[k]);
  const firstAt = new Map();
  for (let y = all[1]; y <= all[3] && firstAt.size < order.length; y++) for (let x = all[0], i = y * w + x; x <= all[2]; x++, i++) {
    const f = fid[i];
    if (f < 0 || edge[i] || slot[f] < 0 || firstAt.has(slot[f])) continue;
    firstAt.set(slot[f], i);
  }
  order.sort((p, q) => firstAt.get(p) - firstAt.get(q));
  let best = -1, bestX = 0;
  for (const k of order) {
    const n = count[k];
    if (n < most * 0.9) continue;
    const cx = sumX[k] / n;
    if (best < 0 || (side === "left" ? cx < bestX : cx > bestX)) { best = faceIds[k]; bestX = cx; }
  }
  // Chebyshev distance to the edge of the visible area, two passes, in the best
  // face's box (local index j). The buffer's own edge counts as outside.
  const [bx0, by0, bx1, by1] = area([best]), bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
  const CAP = 10, d = new Uint8Array(bw * bh);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const i = y * w + x;
    if (edge[i] || fid[i] !== best) continue;
    const j = (y - by0) * bw + (x - bx0);
    let v = CAP;
    if (x > 0) v = Math.min(v, d[j - 1] + 1); else v = 1;
    if (y > 0) { v = Math.min(v, d[j - bw] + 1, x > 0 ? d[j - bw - 1] + 1 : 1, x < w - 1 ? d[j - bw + 1] + 1 : 1); } else v = 1;
    d[j] = v;
  }
  let pick = -1, score = -Infinity;
  for (let y = by1; y >= by0; y--) for (let x = bx1; x >= bx0; x--) {
    const j = (y - by0) * bw + (x - bx0);
    if (!d[j]) continue;
    let v = d[j];
    v = Math.min(v, x < w - 1 ? d[j + 1] + 1 : 1, y < h - 1 ? d[j + bw] + 1 : 1);
    if (y < h - 1) v = Math.min(v, x < w - 1 ? d[j + bw + 1] + 1 : 1, x > 0 ? d[j + bw - 1] + 1 : 1);
    d[j] = v;
    const sc = v * 100000 + (side === "left" ? -x : x);
    if (sc > score) { score = sc; pick = y * w + x; }
  }
  return pick < 0 ? null : [(pick % w) + 0.5, Math.floor(pick / w) + 0.5];
}

function shapePoints(s, P) {
  if (s.type === "rect") return [P(s.x, s.y), P(s.x + s.w, s.y), P(s.x + s.w, s.y + s.h), P(s.x, s.y + s.h)];
  if (s.type === "circle") return Array.from({ length: 48 }, (_, i) => P(s.cx + s.r * Math.cos((i / 48) * 2 * Math.PI), s.cy + s.r * Math.sin((i / 48) * 2 * Math.PI)));
  return s.pts.map(([x, y]) => P(x, y)); // polygon (convex)
}

// Leader route from anchor a to label point b. A leader always bends: 45° out
// of the anchor, then horizontal into the label (or vertical, then 45°, when
// the label is mostly above or below). Scenes place labels off the anchor's
// row; a straight leader is drawn but warned about once.
const warned = new Set();
function route(a, b, id) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (Math.abs(dy) < 1 || Math.abs(dx) < 1) {
    if (!warned.has(id)) { warned.add(id); console.warn(`[graphic] leader "${id}" is straight: move its label above or below the anchor`); }
    return [a, b];
  }
  if (Math.abs(dx) >= Math.abs(dy)) return [a, [a[0] + Math.sign(dx) * Math.abs(dy), b[1]], b];
  return [a, [a[0], b[1] - Math.sign(dy) * Math.abs(dx)], b];
}

function arrowhead(r, from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, [L, W] = ARROW;
  const back = [to[0] - ux * L, to[1] - uy * L];
  return r.fill([[to[0] + ux, to[1] + uy], [back[0] - uy * W, back[1] + ux * W], [back[0] + uy * W, back[1] - ux * W]], 1);
}

// The flow packet on a connector at time `now`: a short solid segment, pw
// pixels wide, stamped along the line from its tail to its head (as r.line
// would) and handed to rect(x, y, w, h) in buffer px.
function packet(pts, now, rect, bw, bh) {
  const segs = [];
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push([pts[i], pts[i + 1], total, l]);
    total += l;
  }
  if (total < 1) return;
  const [plen, pw] = PACKET, span = total + plen;
  const head = ((now / 1000) * PACKET_SPEED) % span, tail = head - plen;
  const at = (d) => {
    d = Math.max(0, Math.min(total, d));
    for (const [a, b, s0, l] of segs) if (d <= s0 + l) { const t = l ? (d - s0) / l : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    return pts[pts.length - 1];
  };
  if (head <= 0 || tail >= total) return;
  const [ax, ay] = at(tail), [cx, cy] = at(head);
  const o0 = -(pw >> 1);
  let x = Math.floor(ax), y = Math.floor(ay);
  const x2 = Math.floor(cx), y2 = Math.floor(cy);
  const dx = Math.abs(x2 - x), dy = -Math.abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 10000; guard++) {
    const px = Math.max(0, x + o0), py = Math.max(0, y + o0);
    const qx = Math.min(bw, x + o0 + pw), qy = Math.min(bh, y + o0 + pw);
    if (qx > px && qy > py) rect(px, py, qx - px, qy - py);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function compose(m, ink, accent, ground) {
  const r = m.raster, data = m.image.data, spec = ISO_STYLE.hatch;
  for (let i = 0; i < r.tone.length; i++) {
    const o = i * 4;
    let owner, on;
    if (r.edge[i]) { owner = r.edge[i] - 1; on = true; }
    else if (r.tone[i] < 0) { data[o + 3] = 0; continue; }
    else { owner = r.fid[i]; on = hatchInk(spec, r.tone[i], r.U[i], r.V[i]); }
    const c = on ? (m.accent[owner] ? accent : ink) : ground;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  m.canvas.getContext("2d").putImageData(m.image, 0, 0);
}
