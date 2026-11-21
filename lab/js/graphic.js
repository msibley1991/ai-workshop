// Scene engine: every graphic, flat or isometric, is a JS scene (js/graphics/*.js)
// mounted on an element with data-graphic="<name>" and drawn into the raster by
// text-raster.js. The rules are in docs/design-system/graphics.md:
//   - every pixel is ground, ink, or accent (focus); shading is hatching
//   - lines: 8 silhouette (6 grown outward + half of the 4 edge), 4 inner, 2 connectors
//   - connectors: arrowheads, dashed = hypothetical, flow packets; leader lines
//     end in a square dot on the object and are cased in ground
//   - labels are real DOM text (label role), placed off the hatching
//   - steps (← →) move between named states with one tween (400 or 800 ms,
//     ease-in-out); rapid presses skip to the end; motion off cuts
//   - iso objects drag to rotate and spring back; not during a transition
//
// Scene coordinates are layout units. A scene's `size` [w, h] is centred in its
// element and never scaled (weights are fixed). Iso scenes put the world origin
// at `origin` (units, in the scene box) and draw `scale` units per world unit.
import {
  ISO_STYLE, ISO_YAW, ISO_PITCH, Raster, Spin, hatchInk, stepTone, rotator, boxFaces, lightVector, fillFace, rgb,
} from "./shade.js";
import SCENES from "./graphics/index.js";

const SIL = ISO_STYLE.silhouette; // 6 grown outward; with half the 4 edge it reads as 8
const INNER = ISO_STYLE.inner;    // 4
const LINE = 2;                   // connectors and leader lines
const CASING = 2;                 // ground each side of a leader line
const DOT = 6;                    // leader-line dot, square
const ARROW = [12, 6];            // arrowhead length, half-width (emulated px)
const DASH = [6, 4];              // on, off (pixel steps)
const PACKET = [12, 4];           // flow packet length, width
const PACKET_SPEED = 48;          // emulated px per second
const BLINK_MS = 500;             // focus blink half-period

let motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
export function setMotion(on) { motion = on; }

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mounts = new Map(); // el -> mount

// ---------- mounting ----------

export function mountGraphic(el) {
  if (mounts.has(el)) return mounts.get(el);
  const scene = SCENES[el.dataset.graphic];
  if (!scene) { console.warn("[graphic] unknown scene", el.dataset.graphic); return null; }
  const m = {
    el, scene, index: 0, tween: null, spin: new Spin(), hover: null,
    canvas: document.createElement("canvas"), raster: null, image: null, key: null,
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

// Captions on the same side share one vertical alignment line: the outermost
// `at` x of all that side's labels (shown or not, so nothing jumps between
// states), unless scene.labelColumns sets it. Returns a label's leader end.
function labelPoint(scene, l) {
  if (!scene._columns) {
    const xs = (side) => (scene.labels ?? []).filter((q) => (q.side ?? "right") === side).map((q) => q.at[0]);
    const left = xs("left"), right = xs("right");
    scene._columns = {
      left: scene.labelColumns?.left ?? (left.length ? Math.min(...left) : 0),
      right: scene.labelColumns?.right ?? (right.length ? Math.max(...right) : 0),
    };
  }
  return [scene._columns[l.side === "left" ? "left" : "right"], l.at[1]];
}

// Label boxes follow the element box; called from draw with the current offset.
function placeLabels(m, ox, oy) {
  for (const l of m.scene.labels ?? []) {
    const span = m.labels.get(l.id), [lx, ly] = labelPoint(m.scene, l);
    const x = ox + lx + (l.side === "left" ? -8 : 8), y = oy + ly - 16;
    span.style.left = `calc(${x} * var(--u))`;
    span.style.top = `calc(${y} * var(--u))`;
    span.style.transform = l.side === "left" ? "translateX(-100%)" : "";
  }
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
    m.canvas.width = bw; m.canvas.height = bh;
    m.image = m.canvas.getContext("2d").createImageData(bw, bh);
    m.key = null;
  }
  const vals = currentValues(m, now), st = stateAt(m, m.index);
  const [sw, sh] = m.scene.size;
  const ox = (item.w / u - sw) / 2, oy = (item.h / u - sh) / 2; // scene box offset, units
  const f = u / ps; // buffer px per unit
  m.geom = { ps, bw, bh, ox, oy, f };
  placeLabels(m, ox, oy);

  const blinkOn = !motion || st.loop !== "blink" || Math.floor(now / BLINK_MS) % 2 === 0;
  const flowing = motion && (st.flow?.length ?? 0) > 0;
  const key = [bw, bh, ox, oy, f, m.index, vals.explode, m.spin.yaw, m.spin.pitch, m.hover, blinkOn,
    flowing ? Math.floor(now / 16) : 0, colors.phosphor, colors.accent, colors.ground].join("|");
  if (key !== m.key) {
    m.key = key;
    paint(m, vals, st, { f, ox, oy, now, blinkOn, flowing });
    compose(m, rgb(colors.phosphor), rgb(colors.accent), rgb(colors.ground));
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(m.canvas, item.x, item.y, bw * ps, bh * ps);
}

function paint(m, vals, st, { f, ox, oy, now, blinkOn, flowing }) {
  const r = m.raster, scene = m.scene;
  r.clear();
  m.owners = []; m.accent = [];
  const focus = blinkOn ? st.focus ?? null : null;
  const own = (id, part) => { m.owners[id] = { part }; m.accent[id] = focus != null && part === focus; return id; };
  const P = (x, y) => [(ox + x) * f, (oy + y) * f]; // scene units -> buffer px
  const show = st.show ? new Set(st.show) : null;
  const visible = (id) => !show || show.has(id);

  // Point resolver for connectors and leaders: [x, y] in scene units, or
  // { part, point: [x, y, z] } on an iso part (local to its centre).
  let resolve = (p) => P(p[0], p[1]);
  const anchors = new Map(); // label id -> buffer point, for automatic iso anchors

  if (scene.kind === "iso") {
    const k = scene.scale * f;
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
    const all = [], focusIds = [], facesOf = new Map();
    for (const { part, face, n, pts } of vis) {
      const id = own(fillFace(r, face, n, pts, { k, spec: ISO_STYLE.hatch, style: ISO_STYLE, L }), part.id);
      all.push(id);
      if (!facesOf.has(part.id)) facesOf.set(part.id, []);
      facesOf.get(part.id).push(id);
      if (part.id === focus) focusIds.push(id);
    }
    // Automatic leader anchors ({ part } with no point): on the part's most
    // visible plane, found before connectors and leaders draw over the faces.
    const shownNow = shownLabels(m);
    for (const l of scene.labels ?? []) {
      if (!shownNow.has(l.id) || !l.anchor || Array.isArray(l.anchor) || l.anchor.point) continue;
      const pt = autoAnchor(r, facesOf.get(l.anchor.part) ?? [], l.side ?? "right");
      if (pt) anchors.set(l.id, pt);
    }
    const silId = own(r.count++, null);
    r.silhouette(all, SIL, silId); // the merged outline, in ink
    if (focusIds.length) {
      // The stretch of that outline next to the focused part turns accent.
      // (Growing the focused part's own outline would paint over nearer parts.)
      const near = r.grow(r.interior(focusIds), SIL), owner = focusIds[0] + 1;
      for (let i = 0; i < near.length; i++) if (near[i] && r.edge[i] === silId + 1) r.edge[i] = owner;
    }
  } else {
    // Flat shapes, in order. fill: "none" (ground), "solid", or a hatch step 1..3.
    // outline: "outer" (8: silhouette + edge), "inner" (4, the default), "none".
    // A group's silhouette is drawn as soon as its last shape is filled, before
    // shapes inside it overwrite its interior (which would grow the silhouette
    // around them too).
    const shapes = (scene.shapes ?? []).filter((s) => visible(s.id));
    const groupOf = (s) => s.group ?? s.id;
    const last = new Map();
    shapes.forEach((s, i) => { if (s.outline === "outer") last.set(groupOf(s), i); });
    const groups = new Map();
    shapes.forEach((s, i) => {
      const t = s.fill === "solid" ? 1 : typeof s.fill === "number" ? stepTone(ISO_STYLE.hatch, s.fill) : 0;
      const outline = s.outline ?? "inner";
      const id = own(r.fill(shapePoints(s, P), t, { edges: outline !== "none", edgeWidth: INNER }), s.part ?? s.id);
      if (outline !== "outer") return;
      const g = groupOf(s);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(id);
      if (last.get(g) === i) r.silhouette(groups.get(g), SIL);
    });
  }

  // Connectors: 2-pixel lines, orthogonal or 45°; arrow ends; dashed; flow packets.
  for (const c of scene.connectors ?? []) {
    if (!visible(c.id)) continue;
    const pts = c.pts.map(resolve);
    const id = own(r.count++, c.part ?? c.id);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, LINE, { dash: c.dashed ? DASH : null });
    if (c.end === "arrow") own(arrowhead(r, pts[pts.length - 2], pts[pts.length - 1]), c.part ?? c.id);
    if (flowing && st.flow.includes(c.id)) packet(r, pts, now, id);
  }

  // Leader lines for shown labels: cased in ground, square dot on the object.
  const on = shownLabels(m);
  for (const l of scene.labels ?? []) {
    if (!on.has(l.id) || !l.anchor) continue;
    const a = anchors.get(l.id) ?? resolve(l.anchor), b = P(...labelPoint(scene, l)), pts = route(a, b, l.id);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], 0, LINE + 2 * CASING, { clear: true });
    const id = own(r.count++, l.for);
    for (let i = 0; i + 1 < pts.length; i++) r.line(pts[i], pts[i + 1], id, LINE);
    const d = DOT / 2;
    own(r.fill([[a[0] - d, a[1] - d], [a[0] + d, a[1] - d], [a[0] + d, a[1] + d], [a[0] - d, a[1] + d]], 1), l.for);
  }
}

// The anchor for a leader on an iso part: the part's face with the most visible
// pixels (after occlusion; near-ties go to the face on the label's side), at a
// point well inside that visible area (up to 10 px from its edges), and among
// those the one nearest the label's side.
function autoAnchor(r, faceIds, side) {
  if (!faceIds.length) return null;
  const { w, h, fid, edge } = r, set = new Set(faceIds), count = new Map(), sumX = new Map();
  for (let i = 0; i < fid.length; i++) {
    if (edge[i] || !set.has(fid[i])) continue;
    count.set(fid[i], (count.get(fid[i]) ?? 0) + 1);
    sumX.set(fid[i], (sumX.get(fid[i]) ?? 0) + (i % w));
  }
  let most = 0;
  for (const n of count.values()) most = Math.max(most, n);
  if (!most) return null;
  // Faces within 10% of the most visible are a tie: take the one on the label's side.
  let best = -1, bestX = 0;
  for (const [id, n] of count) {
    if (n < most * 0.9) continue;
    const cx = sumX.get(id) / n;
    if (best < 0 || (side === "left" ? cx < bestX : cx > bestX)) { best = id; bestX = cx; }
  }
  // Chebyshev distance to the edge of the visible area, two passes.
  const CAP = 10, d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (edge[i] || fid[i] !== best) continue;
    let v = CAP;
    if (x > 0) v = Math.min(v, d[i - 1] + 1); else v = 1;
    if (y > 0) { v = Math.min(v, d[i - w] + 1, x > 0 ? d[i - w - 1] + 1 : 1, x < w - 1 ? d[i - w + 1] + 1 : 1); } else v = 1;
    d[i] = v;
  }
  let pick = -1, score = -Infinity;
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    v = Math.min(v, x < w - 1 ? d[i + 1] + 1 : 1, y < h - 1 ? d[i + w] + 1 : 1);
    if (y < h - 1) v = Math.min(v, x < w - 1 ? d[i + w + 1] + 1 : 1, x > 0 ? d[i + w - 1] + 1 : 1);
    d[i] = v;
    const sc = v * 100000 + (side === "left" ? -x : x);
    if (sc > score) { score = sc; pick = i; }
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

function packet(r, pts, now, id) {
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
  r.line(at(tail), at(head), id, pw);
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
