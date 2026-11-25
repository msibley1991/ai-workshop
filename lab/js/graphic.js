// Scene engine: every graphic, flat or isometric, is a JS scene (js/graphics/*.js)
// mounted on an element with data-graphic="<name>" and drawn into the raster by
// text-raster.js. The rules are in docs/design-system/graphics.md:
//   - every pixel is ground, ink, or accent (focus); shading is hatching
//   - lines: 4 for iso edges, outermost flat shapes and connectors; 2 for flat
//     shapes nested inside another shape, and leader lines
//   - flat shapes and connector bends have 8 corners
//   - connectors: open chevron arrows (32 tall, tip 32 short of the end),
//     dashed = hypothetical, flow packets; leader lines end in a square dot on
//     the object and are cased in ground
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
  ISO_STYLE, ISO_YAW, ISO_PITCH, Raster, Spin, hatchInk, stepTone, rotator, boxFaces, lightVector, fillFace, rgb, quantize,
} from "./shade.js";
import SCENES from "./graphics/index.js";
import { paintKnot, wireKnotDrag, releaseKnot, syncTemplate } from "./knot.js";
import { paintSculpt } from "./sculpt.js";

const INNER = ISO_STYLE.innerEdges;    // 4, iso edges and outermost flat shapes
const NESTED = 2;                 // flat shapes inside another shape
const LINE = 2;                   // leader lines
const CONNECTOR = 4;              // connectors
const RADIUS = 8;                 // flat corners and connector bends (emulated px)
const ARROW_H = 32;               // open chevron height, legs at 45° (emulated px)
const ARROW_GAP = 32;             // chevron tip short of the connector's end
const CASING = 2;                 // ground each side of a leader line
const DOT = 6;                    // leader-line dot, square
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
// A flat scene with a container shape (`container: true`) is a framed visual:
// it enters by the container growing from its top-left corner, then the rest
// wiping in downward (js/slides.js frameItem), through setGraphicOpen.
export const graphicFramed = (el) => !!SCENES[el?.dataset.graphic]?.shapes?.some((sh) => sh.container);
// A perspective scene in its picture box (a state with frame > 0, slide 2's
// second beat) enters and leaves the same way, its box as the container.
// Other 3D scenes just wipe their drawing in and out (o stays 1).
export function graphicBoxed(el) {
  const m = mounts.get(el);
  return !!m && m.scene.kind === "persp" && valuesOf(stateAt(m, m.index)).frame > 0;
}
// o: the container's size (0..1, from its top-left); w: how far down the rest
// is drawn (0..1 of the container's height). 1, 1 is fully open. While it isn't,
// labels are hidden.
export function setGraphicOpen(el, o, w) {
  const m = mountGraphic(el);
  if (!m) return;
  const was = !!m.open;
  m.open = o >= 1 && w >= 1 ? null : { o, w };
  if (was !== !!m.open) syncLabels(m);
}

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
  if (scene.kind === "iso" || scene.kind === "persp") wireDrag(m);
  if (scene.kind === "knot") wireKnotDrag(m, () => motion);
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
    // Perspective scenes turn only: a tilt would move the horizon.
    m.spin.move(ev.clientX - m.drag[0], m.scene.kind === "persp" ? 0 : ev.clientY - m.drag[1]);
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
// explode: iso parts apart (0..1). frame: a perspective scene enclosed in its
// picture box (0..1), see paintPersp. tie, draw: a knot scene's cord (js/knot.js).
// merge, make: slide 8's knot draining into the project folder, then the
// template's sculpture (js/knot.js, js/sculpt.js).
const valuesOf = (st) => ({ explode: st.explode ?? 0, frame: st.frame ?? 0, tie: st.tie ?? 0, draw: st.draw ?? 0, merge: st.merge ?? 0, make: st.make ?? 0 });

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
  if (m.tween) { m.spin.release(); m.spin.yaw = m.spin.pitch = m.spin.vy = m.spin.vp = 0; m.drag = null; releaseKnot(m); }
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
  if (m.tween) { m.spin.release(); m.spin.yaw = m.spin.pitch = m.spin.vy = m.spin.vp = 0; m.drag = null; releaseKnot(m); }
  else if (m.scene.kind === "knot") syncTemplate(m); // a cut: the template it owns too, before the next draw
  syncLabels(m);
}
// The state a graphic is in (or tweening to).
export const graphicIndex = (el) => mounts.get(el)?.index ?? 0;

// Overrides where a box-fitted graphic sits in its box: 0 hangs from the top,
// 1 stands on the bottom, null goes back to data-align. A carried graphic's
// move interpolates it (js/slides.js).
export function setGraphicAlign(el, a) {
  const m = mountGraphic(el);
  if (m) m.alignT = a;
}
// data-align: "top" (0), "middle" (0.5) or "bottom" (1) in its box.
const alignOf = (el) => ({ bottom: 1, middle: 0.5 })[el.dataset.align] ?? 0;
export const graphicAlign = (el) => mounts.get(el)?.alignT ?? alignOf(el);

// A carried graphic (the same scene on the next slide) starts where the old one is.
export function copyGraphicState(fromEl, toEl) {
  const a = mountGraphic(fromEl), b = mountGraphic(toEl);
  if (!a || !b) return;
  b.index = a.index;
  b.tween = null;
  // A knot carries its sim (its pose and tumble), so it doesn't jump.
  if (a.knot) b.knot = { ...a.knot, pos: a.knot.pos.slice(), vel: a.knot.vel.slice(), tgt: a.knot.tgt.slice(), drag: null, glyphs: [] };
  syncLabels(b);
}

function currentValues(m, now) {
  if (!m.tween) return valuesOf(stateAt(m, m.index));
  const p = Math.min(1, (now - m.tween.t0) / m.tween.dur);
  if (p >= 1) { m.tween = null; return valuesOf(stateAt(m, m.index)); }
  const e = ease(p), { from, to } = m.tween;
  return Object.fromEntries(Object.keys(to).map((k) => [k, from[k] + (to[k] - from[k]) * e]));
}

// ---------- labels ----------

function shownLabels(m) {
  if (m.open) return new Set();
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
    const ink = "accent"; // leader labels are accent (legibility test; was accent only on focus)
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
  if (l.side === "left" && !freeCaptions(m.scene)) {
    // The shown label's own DOM width (canvas measureText runs a few units short).
    const span = m.labels.get(l.id), w = span.offsetWidth ? span.getBoundingClientRect().width / m.geom.u : m.caps.width.get(l.id);
    p[0] = (w + CAPTION_GAP) * f + LINE / 2; // the line stamp reaches LINE / 2 px left of its point
  }
  return p;
}
// scene.captions: "free" (the hero): each caption sits at its own `at`, beside
// its object, instead of in a column on the span's edge; the leader ends at
// `at`, a left caption's text ends a gap short of it and a right caption's
// starts a gap past it. fit() then fits the design box itself (scene.align).
const freeCaptions = (scene) => scene.captions === "free";
const labelPoint = (scene, l) => (freeCaptions(scene) ? l.at : [captionLines(scene)[l.side === "left" ? "left" : "right"], l.at[1]]);

// Label boxes follow the element box; called from draw with the current offset.
function placeLabels(m, ox, oy, s) {
  for (const l of m.scene.labels ?? []) {
    const span = m.labels.get(l.id), [lx, ly] = labelPoint(m.scene, l);
    // Left captions start on the span's edge (x 0), so all their left edges align;
    // right captions start just past the caption line.
    const free = freeCaptions(m.scene);
    const w = free && l.side === "left" ? (span.offsetWidth ? span.getBoundingClientRect().width / m.geom.u : m.caps?.width.get(l.id) ?? 0) : 0;
    const x = l.side === "left" ? (free ? ox + lx * s - CAPTION_GAP - w : 0) : ox + lx * s + CAPTION_GAP, y = oy + ly * s - 16;
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
  // Free captions: the design box (drawing and captions) is fitted whole, by
  // width and height, and placed across the element by scene.align (0 left,
  // 1 right).
  if (freeCaptions(scene)) {
    const s = Math.max(0.05, Math.min(W / scene.size[0], H / scene.size[1]));
    const slack = H - scene.size[1] * s;
    return { s, ox: (W - scene.size[0] * s) * (scene.align ?? 0.5), oy: box ? slack * box.align : slack / 2 };
  }
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

// A perspective scene's picture box (state `frame: 1`): the element's full
// width, down to `reserve` units above its bottom (room for what goes under
// it, on slide 2 the prompt field), with the drawing fitted inside, centred,
// FRAME_PAD in from the box. No caption room: captions are hidden in it.
const FRAME_PAD = 16;
// scene.frameView [x0, y0, x1, y1] (design units) is the part fitted, so the
// objects can fill the box; it defaults to the whole design box. What falls
// outside the box (a turn swinging an object out) is clipped in paintPersp.
function frameFit(scene, W, H, reserve) {
  const box = [0, 0, W, Math.max(1, H - reserve)];
  const [vx0, vy0, vx1, vy1] = scene.frameView ?? [0, 0, scene.size[0], scene.size[1]];
  const iw = W - 2 * FRAME_PAD, ih = box[3] - 2 * FRAME_PAD;
  const s = Math.max(0.05, Math.min(iw / (vx1 - vx0), ih / (vy1 - vy0)));
  return { box, s, ox: W / 2 - ((vx0 + vx1) / 2) * s, oy: box[3] / 2 - ((vy0 + vy1) / 2) * s };
}

// The sway loop (state loop: "sway", a perspective scene's scene.sway
// { yaw, ms }): the scene turns `yaw` degrees and back, `ms` each way, on a
// sine ease, added to any drag. Its clock runs only while it draws with motion
// on and nobody's dragging (a loop pauses during a drag), and starts again
// from rest when the graphic comes back on screen.
function swayYaw(m, now, st) {
  const sw = m.scene.sway, T = loopClock(m, now, st);
  if (st.loop !== "sway" || !sw || T == null) return 0;
  const phase = (T % (2 * sw.ms)) / (2 * sw.ms);
  return (sw.yaw * (1 - Math.cos(2 * Math.PI * phase))) / 2;
}
// A state's loop clock (ms): runs while the graphic draws with motion on and
// nobody's dragging, restarts from 0 when it comes back on screen (not drawn
// for 500 ms) or its state has no loop. null while no loop runs.
function loopClock(m, now, st) {
  if (m.loopAt === now) return m.loopT; // once per frame
  const last = m.drawnAt ?? 0;
  m.drawnAt = m.loopAt = now;
  if (!st.loop || !motion) return (m.loopT = null);
  if (m.loopT == null || now - last > 500) m.loopT = 0;
  else if (!m.spin.held) m.loopT += now - last;
  return m.loopT;
}
// The bob loop (state loop: "bob", an iso scene's scene.bob { amp, ms,
// stagger }): a part with `bob: n` rises `amp` world units and settles back
// over `ms` on a cosine, starting n * stagger ms after the loop, then repeats.
// Connectors and leaders pinned to the part follow it.
const BOB_FRAME = 33; // ms: the bob repaints at about 30 fps
function bobLift(bob, T, n) {
  if (!bob || T == null || n == null) return 0;
  const t = T - n * (bob.stagger ?? 0);
  if (t <= 0) return 0;
  return (bob.amp * (1 - Math.cos((2 * Math.PI * (t % bob.ms)) / bob.ms))) / 2;
}
// The twist loop (state loop: "twist", an iso scene's scene.twist { deg, ms,
// stagger }): an angle that turns `deg` and back, `ms` each leg on the
// standard ease, starting `delay` ms after the loop does. 0 before it starts.
function twistAngle(tw, T, delay = 0) {
  if (T == null) return 0;
  const t = T - delay;
  if (t <= 0) return 0;
  const local = t % (2 * tw.ms);
  return local < tw.ms ? ease(local / tw.ms) * tw.deg : (1 - ease((local - tw.ms) / tw.ms)) * tw.deg;
}

// The height (units) of the slide's first data-fit-rows row fields, or null.
function fitRows(el, u) {
  const n = Number(el.dataset.fitRows);
  const slide = n && el.closest(".slide");
  if (!slide) return null;
  const cs = getComputedStyle(slide), rows = cs.gridTemplateRows.split(" ").map(parseFloat), gap = parseFloat(cs.rowGap) || 0;
  return (rows.slice(0, n).reduce((a, b) => a + b, 0) + gap * (n - 1)) / u;
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
  m.viewYaw = m.spin.yaw + swayYaw(m, now, st);
  m.twistT = st.loop === "twist" ? loopClock(m, now, st) : null;
  // The bob loop (state loop: "bob", the hero): its clock, stepped to
  // BOB_FRAME so the look repaints at most that often.
  m.bobT = st.loop === "bob" ? loopClock(m, now, st) : null;
  if (m.bobT != null) m.bobT = Math.floor(m.bobT / BOB_FRAME) * BOB_FRAME;
  const box = item.el.dataset.fit === "box" ? { align: m.alignT ?? alignOf(item.el) } : null;
  // data-inset (units): the drawing is fitted that far in from the box's top
  // and bottom, so a moving scene (slide 7's knot) has room to swing.
  const inset = Number(item.el.dataset.inset) || 0;
  // data-fit-rows="4": fitted to the slide's first rows, not the whole box (slide
  // 8's knot keeps slide 7's rows 1-4 while its box reaches down past them).
  m.fitH = fitRows(item.el, u) ?? item.h / u;
  let { s, ox, oy } = fit(m, item.w / u, Math.max(1, m.fitH - 2 * inset), u, box); // design units -> element units
  oy += inset;
  let frameBox = null;
  if (vals.frame > 0) { // perspective scenes: on the way into their picture box
    const fb = frameFit(m.scene, item.w / u, item.h / u, stateAt(m, m.index).reserve ?? 0), k = vals.frame;
    const S = m.scene.size, a = [ox, oy, ox + S[0] * s, oy + S[1] * s]; // the design box as fitted
    frameBox = a.map((v, i) => v + (fb.box[i] - v) * k);
    s += (fb.s - s) * k; ox += (fb.ox - ox) * k; oy += (fb.oy - oy) * k;
  }
  const f = u / ps; // buffer px per unit
  m.geom = { ps, bw, bh, ox, oy, f, s, u, frameBox };
  placeLabels(m, ox, oy, s);

  // A look is one painted image. Painting is the expensive part, so the last
  // two looks are kept: a blink alternates between them without repainting,
  // and flow packets are drawn over the look each frame instead of in it.
  const blinkOn = !motion || st.loop !== "blink" || Math.floor(now / BLINK_MS) % 2 === 0;
  const flowing = motion && (st.flow?.length ?? 0) > 0;
  // A knot moves every frame (its sim and tumble), so it always repaints.
  const key = [m.scene.kind === "knot" ? now : "", bw, bh, ox, oy, f, s, m.index, vals.explode, vals.frame, m.viewYaw, m.twistT, m.bobT, m.spin.pitch, m.hover, blinkOn, m.open?.o, m.open?.w,
    colors.ink, colors.accent, colors.ground].join("|");
  let look = m.looks.find((l) => l.key === key);
  if (!look) {
    look = m.looks.length < 2 ? { canvas: document.createElement("canvas") } : m.looks.shift();
    look.key = key;
    look.canvas.width = bw; look.canvas.height = bh;
    m.canvas = look.canvas;
    paint(m, vals, st, { f, s, ox, oy, now, blinkOn });
    compose(m, rgb(colors.ink), rgb(colors.accent), rgb(colors.ground));
    look.accent = m.accent;
    look.flows = m.flows;
    m.looks.push(look);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(look.canvas, item.x, item.y, bw * ps, bh * ps);
  if (flowing) {
    for (const fl of look.flows) {
      ctx.fillStyle = look.accent[fl.id] ? colors.accent : colors.ink;
      packet(fl.pts, now, (x, y, w, h) => ctx.fillRect(item.x + x * ps, item.y + y * ps, w * ps, h * ps), bw, bh);
    }
  }
}

function paint(m, vals, st, { f, s: scale, ox, oy, now, blinkOn }) {
  const r = m.raster, scene = m.scene;
  r.clear();
  m.owners = []; m.accent = []; m.flows = [];
  const focus = blinkOn ? st.focus ?? null : null;
  // Connectors and leaders (line = true) are always accent; other marks only while their part is in focus.
  const own = (id, part, line = false) => { m.owners[id] = { part }; m.accent[id] = line || (focus != null && part === focus); return id; };
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
    const bob = (part) => bobLift(scene.bob, m.bobT, part.bob);
    const offsetOf = (part) => (part.explode ?? [0, 0, 0]).map((v, i) => v * vals.explode + (i === 1 ? bob(part) : 0));
    const world = (part, p) => { const o = offsetOf(part); return [part.box.c[0] + o[0] + p[0], part.box.c[1] + o[1] + p[1], part.box.c[2] + o[2] + p[2]]; };
    const proj = (p) => { const q = R(p); return [cx + q[0] * k, cy - q[1] * k, q[2]]; };
    const byId = new Map(scene.parts.map((p) => [p.id, p]));
    resolve = (p) => (Array.isArray(p) ? P(p[0], p[1]) : proj(world(byId.get(p.part), p.point)).slice(0, 2));

    const vis = [];
    const tw = scene.twist, T = m.twistT;
    for (const part of scene.parts) {
      if (!visible(part.id)) continue;
      const o = offsetOf(part);
      // part.twist: the twist loop's delay index (times scene.twist.stagger):
      // the part turns about its own vertical axis.
      const turn = tw && part.twist != null ? yAbout(part.box.c, twistAngle(tw, T, part.twist * (tw.stagger ?? 0))) : null;
      for (const face0 of boxFaces(part.box)) {
        const face = turn ? { n: turn.n(face0.n), v: face0.v.map(turn.p) } : face0;
        const n = R(face.n);
        if (n[2] <= 1e-4) continue;
        const v = face.v.map((p) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]]);
        const pts = v.map(proj);
        vis.push({ part, face: { ...face, v }, n, pts, depth: pts.reduce((a, p) => a + p[2], 0) / 4 });
      }
    }
    // scene.rings: circles about the world origin, drawn as 4 lines in short
    // segments (or `weight`; slide 3's are 8), sorted in among the faces by
    // depth so the object hides the stretch behind it. { id, r, tilt: [x°, z°], spin: "x" | "z" }: the twist
    // loop's angle (no delay) turns the ring about that axis of its own plane,
    // then it's tilted into place.
    for (const ring of scene.rings ?? []) {
      if (!visible(ring.id)) continue;
      const a = tw ? twistAngle(tw, T) : 0, N = 96;
      const spin = ring.spin === "z" ? zRot(a) : xRot(a), tx = xRot(ring.tilt?.[0] ?? 0), tz = zRot(ring.tilt?.[1] ?? 0);
      const pts = Array.from({ length: N }, (_, i) => {
        const t = (i / N) * 2 * Math.PI;
        return proj(tz(tx(spin([ring.r * Math.cos(t), 0, ring.r * Math.sin(t)]))));
      });
      for (let i = 0; i < N; i++) {
        const p = pts[i], q = pts[(i + 1) % N];
        vis.push({ part: ring, seg: [p, q], depth: (p[2] + q[2]) / 2, weight: ring.weight ?? INNER });
      }
    }
    // part.on: a part standing on another (the hero's plate contents) paints
    // after every part without one, so a big face under it (the plate's
    // top, whose centre can sit nearer than the part) never covers it.
    vis.sort((a, b) => (a.part.on ? 1 : 0) - (b.part.on ? 1 : 0) || a.depth - b.depth);
    const facesOf = new Map();
    for (const { part, face, n, pts, seg, weight } of vis) {
      if (seg) { r.line(seg[0], seg[1], own(r.count++, part.id), weight); continue; }
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
  } else if (scene.kind === "persp") {
    paintPersp(m, r, st, { P, own, visible, anchors, scale, f });
  } else if (scene.kind === "knot") {
    paintKnot(m, r, st, vals, { P, own, scale, f, now, motion, rounded, chevron, pullBack, paintSculpt });
  } else {
    // Flat shapes, in order. fill: "none" (ground), "solid", or a hatch step 1..3.
    // outline: "none", or anything else: 4 for a shape on the outermost layer,
    // 2 for one inside another shape. Rects and polygons get 8 corners.
    const shapes = (scene.shapes ?? []).filter((s) => visible(s.id)), boxes = shapes.map(shapeBox);
    const inside = (a, b) => a !== b && b[0] <= a[0] && b[1] <= a[1] && b[2] >= a[2] && b[3] >= a[3];
    // Opening (m.open): the container is drawn at o of its size from its
    // top-left, and everything else only inside it, down to w of its height.
    const box = m.open && shapes.find((sh) => sh.container);
    const cut = box && (() => {
      const [x0, y0] = P(box.x, box.y), [x1, y1] = P(box.x + box.w * m.open.o, box.y + box.h * Math.min(m.open.o, m.open.w));
      return [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)];
    })();
    shapes.forEach((s, i) => {
      const t = s.fill === "solid" ? 1 : typeof s.fill === "number" ? stepTone(ISO_STYLE.hatch, s.fill) : 0;
      const nested = boxes.some((b, j) => j !== i && inside(boxes[i], b));
      const sh = box && s === box ? { ...s, w: s.w * m.open.o, h: s.h * m.open.o } : s;
      if (box && s === box && (sh.w * scale * f < 1 || sh.h * scale * f < 1)) return; // nothing yet
      r.clip = box && s !== box ? cut : null;
      const rad = Math.min(RADIUS, (sh.w ?? Infinity) * scale * f / 2, (sh.h ?? Infinity) * scale * f / 2);
      const pts = sh.type === "circle" ? shapePoints(sh, P) : rounded(shapePoints(sh, P), rad, true);
      own(r.fill(pts, t, { edges: sh.outline !== "none", edgeWidth: nested ? NESTED : INNER }), sh.part ?? sh.id);
    });
    r.clip = box ? cut : null; // connectors too
  }

  // Connectors: 4-pixel lines, orthogonal or 45°, bends rounded; open chevron
  // arrow ends; dashed; flow packets.
  for (const c of scene.connectors ?? []) {
    if (!visible(c.id)) continue;
    let pts = c.pts.map(resolve);
    if (c.end === "arrow") pts = pullBack(pts, ARROW_GAP);
    // start: "arrow" (the hero's MCP link): a chevron at the first point too,
    // pulled back the same way, for a two-way connector.
    if (c.start === "arrow") pts = pullBack([...pts].reverse(), ARROW_GAP).reverse();
    pts = rounded(pts, RADIUS, false);
    const id = own(r.count++, c.part ?? c.id, true);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, CONNECTOR, { dash: c.dashed ? DASH : null });
    if (c.end === "arrow") chevron(r, pts[pts.length - 2], pts[pts.length - 1], id);
    if (c.start === "arrow") chevron(r, pts[1], pts[0], id);
    if (st.flow?.includes(c.id)) m.flows.push({ pts, id }); // packets: drawn over the look (drawGraphic)
  }

  // Leader lines for shown labels: cased in ground, square dot on the object.
  r.clip = null;
  const on = shownLabels(m);
  for (const l of scene.labels ?? []) {
    if (!on.has(l.id) || !l.anchor) continue;
    if (anchors.has(l.id) && !anchors.get(l.id)) continue; // its anchor is out of the drawing (a vanishing point, mid-turn)
    const a = anchors.get(l.id) ?? resolve(l.anchor), b = leaderEnd(m, l, P, f), pts = route(a, b, l.id);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], 0, LINE + 2 * CASING, { clear: true });
    // Squares of exactly n pixels (the fill includes pixels on both edges).
    const square = (half) => { const lo = -half, hi = half - 1e-3; return [[a[0] + lo, a[1] + lo], [a[0] + hi, a[1] + lo], [a[0] + hi, a[1] + hi], [a[0] + lo, a[1] + hi]]; };
    const d = DOT / 2;
    own(r.fill(square(d + CASING), 0), null); // the dot is cased too
    const id = own(r.count++, l.for, true);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, LINE);
    own(r.fill(square(d), 1), l.for, true);
  }

  // A 3D scene (iso, or perspective outside its picture box) entering or
  // leaving: only the top w of what's drawn shows, so it wipes in downward and
  // out upward (js/slides.js wipeItem). Framed scenes cut their own content.
  const framedScene = scene.kind === "flat" && scene.shapes?.some((sh) => sh.container);
  if (m.open && !framedScene && !m.geom.frameBox) {
    let top = -1, bottom = -1;
    for (let y = 0; y < r.h; y++) {
      const row = y * r.w;
      for (let x = 0; x < r.w; x++) if (r.tone[row + x] >= 0 || r.edge[row + x] > 0) { if (top < 0) top = y; bottom = y; break; }
    }
    if (top >= 0) {
      const cut = top + Math.round((bottom + 1 - top) * m.open.w);
      r.tone.fill(-1, cut * r.w); r.fid.fill(-1, cut * r.w); r.edge.fill(0, cut * r.w);
    }
  }
}

// Rotations for iso parts and rings (degrees; world y up).
const xRot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y, z]) => [x, y * c - z * s, y * s + z * c]; };
const zRot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y, z]) => [x * c - y * s, x * s + y * c, z]; };
// A turn about the vertical axis through centre c: points and normals.
function yAbout(c, deg) {
  const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const r = ([x, y, z]) => [x * co + z * si, y, -x * si + z * co];
  return { n: r, p: ([x, y, z]) => { const q = r([x - c[0], y, z - c[2]]); return [q[0] + c[0], q[1], q[2] + c[2]]; } };
}

// ---------- perspective scenes ----------
//
// kind "persp": objects on a ground plane seen by a level camera, so verticals
// stay vertical and horizontals run to vanishing points on the horizon (two-
// point perspective). World units, y up, the ground at y 0, the camera at
// (0, camera.eye, 0) looking down -z. camera.f is the focal length in design
// units; the horizon sits at design y camera.horizon and the centre of view at
// design x camera.cx. Parts: { id, type: "box" | "pyramid" | "sphere", c: [x, 0, z]
// on the ground, s: [w, h, d] (box, pyramid) or r (sphere, with bands and
// segments for its low-poly facets), yaw in degrees }. Dragging turns the
// group about scene.pivot, or each part in place without one (turn only; the
// spring brings it back).
// Shading is hatching from the global light, one step per face.
//
// guides: { thirds, horizon, vanish: part id } are drawn when a state sets
// guides: true, under the objects: the rule-of-thirds grid (solid, 2), the
// horizon and construction lines from the vanish part's horizontal edges to
// their vanishing points (dashed, 2). A label anchor { vp: "right" | "left" }
// sits on that part's vanishing point on that side of the centre of view, and
// { vp: 0 | 1 } on the one its own x or z edges run to, wherever it goes.
// State frame: 1 encloses the drawing in a 4/8 picture box (frameFit).
const GUIDE = 2;

function partFaces(part, yawOffset) {
  const a = (((part.yaw ?? 0) + yawOffset) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const [cx, , cz] = part.c;
  const place = ([x, y, z]) => [cx + x * co + z * si, y, cz - x * si + z * co];
  const turn = ([x, y, z]) => [x * co + z * si, y, -x * si + z * co];
  if (part.type === "box") {
    const [w, h, d] = part.s;
    return boxFaces({ c: [0, h / 2, 0], s: [w, h, d] }).map((fc) => ({ v: fc.v.map(place), n: turn(fc.n) }));
  }
  if (part.type === "pyramid") {
    const [w, h, d] = part.s, x = w / 2, z = d / 2, apex = place([0, h, 0]);
    const base = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]].map(place);
    const faces = [{ v: [base[3], base[2], base[1], base[0]] }];
    for (let i = 0; i < 4; i++) faces.push({ v: [base[i], base[(i + 1) % 4], apex] });
    return faces.map((fc) => ({ v: fc.v, n: outward(fc.v, [cx, h / 3, cz]) }));
  }
  // sphere: bands of latitude by segments of longitude; the caps are triangles.
  const { r, bands = 4, segments = 8 } = part, ctr = [0, r, 0];
  const at = (j, i) => {
    const ph = (j / bands) * Math.PI, th = (i / segments) * 2 * Math.PI;
    return place([r * Math.sin(ph) * Math.cos(th), r + r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)]);
  };
  const faces = [], C = place(ctr);
  for (let j = 0; j < bands; j++) for (let i = 0; i < segments; i++) {
    let v = [at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)];
    if (j === 0) v = [v[0], v[2], v[3]];
    else if (j === bands - 1) v = [v[0], v[1], v[2]];
    faces.push({ v, n: outward(v, C) });
  }
  return faces;
}
// A face's unit normal, turned away from an inside point.
function outward(v, inside) {
  const a = v[0], b = v[1], c = v[v.length - 1];
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const len = Math.hypot(...n) || 1;
  n = n.map((q) => q / len);
  const m = v.reduce((s, p) => s.map((q, i) => q + p[i] / v.length), [0, 0, 0]);
  return n[0] * (m[0] - inside[0]) + n[1] * (m[1] - inside[1]) + n[2] * (m[2] - inside[2]) < 0 ? n.map((q) => -q) : n;
}

// The segment a-b clipped to the buffer grown by `pad` (Liang-Barsky), or null.
function clipSeg(a, b, w, h, pad = 8) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] + pad], [dx, w + pad - a[0]], [-dy, a[1] + pad], [dy, h + pad - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; t0 = Math.max(t0, t); } else { if (t < t0) return null; t1 = Math.min(t1, t); }
  }
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
}

function paintPersp(m, r, st, { P, own, visible, anchors, scale, f }) {
  const scene = m.scene, cam = scene.camera, [W, H] = scene.size, L = lightVector(ISO_STYLE);
  // World -> design units -> buffer px. Points behind the camera don't occur.
  const D = ([x, y, z]) => [cam.cx + (cam.f * x) / -z, cam.horizon - (cam.f * (y - cam.eye)) / -z];
  const proj = (p) => P(...D(p));
  const eyeAt = [0, cam.eye, 0];
  const yaw = m.viewYaw ?? m.spin.yaw; // drag plus the sway loop
  // scene.pivot [x, 0, z]: dragging turns the whole group about it, like a
  // turntable (each part also turns by the same angle); without one, each part
  // turns in place.
  const pv = scene.pivot, ya = (yaw * Math.PI) / 180, yc = Math.cos(ya), ys = Math.sin(ya);
  const parts = !pv ? scene.parts : scene.parts.map((p) => {
    const dx = p.c[0] - pv[0], dz = p.c[2] - pv[2];
    return { ...p, c: [pv[0] + dx * yc + dz * ys, p.c[1], pv[2] - dx * ys + dz * yc] };
  });

  // Guides, under the objects (the faces fill over them).
  const g = scene.guides ?? {};
  if (st.guides) {
    if (g.thirds) {
      const id = own(r.count++, "thirds");
      for (const k of [1, 2]) {
        r.line(P((W * k) / 3, 0), P((W * k) / 3, H), id, GUIDE);
        r.line(P(0, (H * k) / 3), P(W, (H * k) / 3), id, GUIDE);
      }
    }
    if (g.horizon) r.line(P(0, cam.horizon), P(W, cam.horizon), own(r.count++, "horizon"), GUIDE, { dash: DASH });
  }
  // The vanish part's vanishing points: its two horizontal edge directions,
  // run off to infinity. A direction square-on to the view has none.
  const vp = { left: null, right: null, byDir: [null, null] };
  const vpart = parts.find((p) => p.id === g.vanish);
  if (vpart) {
    const a = (((vpart.yaw ?? 0) + yaw) * Math.PI) / 180;
    [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]].forEach(([dx, dz], k) => {
      if (Math.abs(dz) < 1e-3) return;
      const x = cam.cx + (cam.f * dx) / -dz;
      vp[x >= cam.cx ? "right" : "left"] = vp.byDir[k] = { design: [x, cam.horizon], dir: [dx, dz] };
    });
    if (st.guides) {
      const id = own(r.count++, "construction");
      // Inside the grid (the design box) only: as the group turns, a vanishing
      // point runs off the drawing and its lines would cross the captions.
      const [gx0, gy0] = P(0, 0), [gx1, gy1] = P(W, H);
      r.clip = [Math.max(0, Math.floor(gx0)), Math.max(0, Math.floor(gy0)), Math.min(r.w, Math.ceil(gx1)), Math.min(r.h, Math.ceil(gy1))];
      for (const fc of partFaces(vpart, yaw)) {
        if (Math.abs(fc.n[1]) < 0.5) continue; // the top and bottom faces hold every horizontal edge
        for (let i = 0; i < fc.v.length; i++) {
          const A = fc.v[i], B = fc.v[(i + 1) % fc.v.length];
          const e = [B[0] - A[0], B[2] - A[2]], len = Math.hypot(...e);
          const point = vp.byDir.find((q) => q && Math.abs(Math.abs((e[0] * q.dir[0] + e[1] * q.dir[1]) / len) - 1) < 1e-6);
          if (!point) continue;
          // From the edge's end farther from the vanishing point, through the edge, to it.
          const v = P(...point.design), pa = proj(A), pb = proj(B);
          const far = Math.hypot(pa[0] - v[0], pa[1] - v[1]) > Math.hypot(pb[0] - v[0], pb[1] - v[1]) ? pa : pb;
          const seg = clipSeg(far, v, r.w, r.h);
          if (seg) r.line(seg[0], seg[1], id, GUIDE, { dash: DASH });
        }
      }
      r.clip = null;
    }
  }

  // Objects, farthest first; within one (convex), only faces toward the camera.
  const dist = (p) => Math.hypot(p.c[0], cam.eye, p.c[2]);
  const facesOf = new Map();
  for (const part of [...parts].filter((p) => visible(p.id)).sort((a, b) => dist(b) - dist(a))) {
    const ids = [];
    for (const fc of partFaces(part, yaw)) {
      const v0 = fc.v[0], toEye = [eyeAt[0] - v0[0], eyeAt[1] - v0[1], eyeAt[2] - v0[2]];
      if (fc.n[0] * toEye[0] + fc.n[1] * toEye[1] + fc.n[2] * toEye[2] <= 1e-6) continue;
      const lit = Math.max(0, fc.n[0] * L[0] + fc.n[1] * L[1] + fc.n[2] * L[2]);
      const t = quantize(ISO_STYLE.hatch, 1 - lit);
      const pts = fc.v.map(proj);
      // Hatching anchored to the face: pattern coords along its first and last edges.
      const p0 = pts[0], p1 = pts[1], pl = pts[pts.length - 1];
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = pl[0] - p0[0], by = pl[1] - p0[1], det = ax * by - bx * ay;
      const basis = Math.abs(det) > 1 ? { ox: p0[0], oy: p0[1], inv: [by / det, -bx / det, -ay / det, ax / det], la: Math.hypot(ax, ay), lb: Math.hypot(bx, by) } : null;
      ids.push(own(r.fill(pts, t, { edges: true, edgeWidth: INNER, basis }), part.id));
    }
    facesOf.set(part.id, ids);
  }

  // The picture box, on the way in (frame > 0): 4 thick, 8 corners, in from
  // the element's edge by half its line so it all draws.
  const fbox = m.geom.frameBox;
  if (fbox) {
    const h = INNER / 2 / f, [x0, y0] = [fbox[0] + h, fbox[1] + h];
    // Opening or closing (m.open): the box at o of its size from its top-left,
    // the drawing down to w of its height.
    const o = m.open?.o ?? 1, w = Math.min(o, m.open?.w ?? 1);
    const x1 = x0 + (fbox[2] - h - x0) * o, y1 = y0 + (fbox[3] - h - y0) * o, yc = y0 + (fbox[3] - h - y0) * w;
    // Nothing draws outside the box (or below the wipe).
    const cx0 = Math.max(0, Math.floor(x0 * f)), cy0 = Math.max(0, Math.floor(y0 * f));
    const cx1 = Math.min(r.w, Math.ceil(x1 * f)), cy1 = Math.min(r.h, Math.ceil(yc * f));
    for (let y = 0; y < r.h; y++) {
      const row = y * r.w, inY = y >= cy0 && y < cy1;
      for (let x = 0; x < r.w; x++) {
        if (inY && x >= cx0 && x < cx1) { x = cx1 - 1; continue; }
        r.tone[row + x] = -1; r.fid[row + x] = -1; r.edge[row + x] = 0;
      }
    }
    if ((x1 - x0) * f >= 1 && (y1 - y0) * f >= 1) {
      const pts = rounded([[x0 * f, y0 * f], [x1 * f, y0 * f], [x1 * f, y1 * f], [x0 * f, y1 * f]], Math.min(RADIUS, ((x1 - x0) * f) / 2, ((y1 - y0) * f) / 2), true);
      const id = own(r.count++, "frame");
      for (let i = 0; i < pts.length; i++) r.line(pts[i], pts[(i + 1) % pts.length], id, INNER);
    }
  }

  // Leader anchors: a vanishing point (only while it's in the drawing), or a
  // part's most visible face.
  const shownNow = shownLabels(m);
  for (const l of scene.labels ?? []) {
    if (!shownNow.has(l.id) || !l.anchor || Array.isArray(l.anchor)) continue;
    if (l.anchor.vp != null) {
      // "left" / "right": whichever is on that side; 0 / 1: the vanishing point
      // of the part's own x or z edges, followed as the part turns.
      const q = typeof l.anchor.vp === "number" ? vp.byDir[l.anchor.vp] : vp[l.anchor.vp];
      anchors.set(l.id, q && q.design[0] >= 0 && q.design[0] <= W ? P(...q.design) : null);
    } else if (l.anchor.part && !l.anchor.point) {
      const pt = autoAnchor(r, facesOf.get(l.anchor.part) ?? [], l.side ?? "right");
      if (pt) anchors.set(l.id, pt);
    }
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

// An open chevron at `to`, pointing along from -> to: two legs at 45° in the
// connector's weight, ARROW_H tall.
function chevron(r, from, to, id) {
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy);
  if (!len) return;
  const ux = dx / len, uy = dy / len, back = ARROW_H / 2; // legs at 45°: as far back as they are out
  for (const sx of [1, -1]) r.line(to, [to[0] - ux * back - sx * uy * back, to[1] - uy * back + sx * ux * back], id, CONNECTOR);
}

// The polyline with its end moved back by up to `gap` along its last segment
// (never past the chevron's room, so a short connector keeps its arrow).
function pullBack(pts, gap) {
  const a = pts[pts.length - 2], b = pts[pts.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = Math.min(gap, Math.max(0, len - ARROW_H / 2 - CONNECTOR));
  if (!len || !d) return pts;
  return [...pts.slice(0, -1), [b[0] - ((b[0] - a[0]) / len) * d, b[1] - ((b[1] - a[1]) / len) * d]];
}

// A polyline (or a closed polygon) with each corner rounded to radius `rad`,
// as short straight segments (the raster draws only those). Each corner's cut
// is held to half of its shorter side, so small shapes round fully.
function rounded(pts, rad, closed) {
  const n = pts.length;
  if (n < 3) return pts;
  const out = closed ? [] : [pts[0]];
  for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (!l1 || !l2) { out.push(b); continue; }
    const d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const turn = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
    const t = Math.min(rad * Math.tan(turn / 2), l1 / 2, l2 / 2);
    if (t < 0.5) { out.push(b); continue; }
    const p0 = [b[0] - d1[0] * t, b[1] - d1[1] * t], p2 = [b[0] + d2[0] * t, b[1] + d2[1] * t];
    for (let j = 0; j <= 6; j++) { // a quadratic through the corner, close to the arc
      const f = j / 6, g = 1 - f;
      out.push([g * g * p0[0] + 2 * g * f * b[0] + f * f * p2[0], g * g * p0[1] + 2 * g * f * b[1] + f * f * p2[1]]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// A flat shape's bounds in scene units: [x0, y0, x1, y1].
function shapeBox(s) {
  if (s.type === "rect") return [s.x, s.y, s.x + s.w, s.y + s.h];
  if (s.type === "circle") return [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r];
  const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
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
