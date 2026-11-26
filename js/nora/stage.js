// Nora's scenes: moving flat graphics for tab 1 (Nora's Section), drawn with
// what the raster already traces from the DOM, so js/graphic.js and
// js/slides.js stay as they are (the same idea as js/site-loops.js):
//   - lines and outlines are polylines in two svg[data-draw] layers (4 and 2),
//   - hatched and solid areas are [data-fill] spans (data-hatch),
//   - labels are DOM text in the label role (.graphic-label),
//   - d.clipped(rect, draw) puts what it draws in its own [data-clip] box, for
//     a box's content wiping in downward (motion.md, Open / close).
// Mount one with <div class="nora-scene" data-nora-scene="<name>"> inside a
// .slide-visual. A scene (js/nora/<name>.js) is { size: [w, h], draw(S, d) }:
// every frame it describes the whole drawing for the slide's current beat, and
// the stage rebuilds the DOM only when that description changed (then fires
// `lab:layout`, which is when the raster re-measures).
//
// The beat comes from the URL (#foundations/2.3 is slide 2, third beat), which
// js/layout.js keeps current on every move. S.to(name, target, ms, delay)
// eases a named value toward its target whenever the target changes, so
// forward, back and rapid presses all run from wherever the drawing is.
// Motion off: every value sits on its target and loops rest (S.loop is null).
import { viewer } from "../viewer.js";
import scale from "./scale.js";
import twoLanes from "./two-lanes.js";
import tiles from "./tiles.js";
import sampling from "./sampling.js";
import determinism from "./determinism.js";
import target from "./target.js";
import builder from "./builder.js";
import rules from "./rules.js";
import sites from "./sites.js";
import room from "./room.js";
import variations from "./variations.js";
import terms from "./terms.js";
import webterms from "./webterms.js";
import "./kit.js"; // the prompts and Copy buttons on the task slides

const SCENES = { scale, "two-lanes": twoLanes, tiles, sampling, determinism, target, builder, rules, sites, room, variations, terms, webterms };
const SHOW_MS = 800;      // a scene wiping in downward when its slide arrives (motion.md, Wipe)
const HIDE_MS = 800;      // and wiping out upward when the talk moves on (exits reverse their entrance)
const RADIUS = 8;         // corners and bends, units
const DASH = [12, 8];     // on, off, units
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const unit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;
const SVG = "http://www.w3.org/2000/svg";

// ---------- geometry ----------

const lengthOf = (pts) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
// The stretch of a polyline between lengths a and b.
function slice(pts, a, b) {
  const out = [];
  let run = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i], q = pts[i + 1], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len > 0 && run + len >= a && run <= b) {
      const t0 = clamp((a - run) / len), t1 = clamp((b - run) / len);
      const at = (t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      if (!out.length) out.push(at(t0));
      out.push(at(t1));
    }
    run += len;
  }
  return out;
}
// A polyline with each bend rounded to radius rad (short straight segments).
function rounded(pts, rad, closed = false) {
  const n = pts.length, out = [];
  const corner = (a, b, c) => {
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (!l1 || !l2) return [b];
    const d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const turn = Math.acos(clamp(d1[0] * d2[0] + d1[1] * d2[1], -1, 1));
    const t = Math.min(rad * Math.tan(turn / 2), l1 / 2, l2 / 2);
    if (t < 0.01) return [b];
    const p0 = [b[0] - d1[0] * t, b[1] - d1[1] * t], p1 = [b[0] + d2[0] * t, b[1] + d2[1] * t];
    // A quadratic through the corner, in 4 steps: close enough to an arc at 8.
    return [0, 0.25, 0.5, 0.75, 1].map((k) => {
      const m = 1 - k;
      return [m * m * p0[0] + 2 * m * k * b[0] + k * k * p1[0], m * m * p0[1] + 2 * m * k * b[1] + k * k * p1[1]];
    });
  };
  if (closed) {
    for (let i = 0; i < n; i++) out.push(...corner(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n]));
    out.push(out[0]);
    return out;
  }
  out.push(pts[0]);
  for (let i = 1; i < n - 1; i++) out.push(...corner(pts[i - 1], pts[i], pts[i + 1]));
  out.push(pts[n - 1]);
  return out;
}
const fmt = (pts) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

// ---------- one frame's drawing ----------

// d collects primitives in px, relative to the scene's element.
function pen(u) {
  const lines = [], fills = [], texts = [], slots = [], hits = [];
  let clip = null; // the [x, y, w, h] box the next primitives are clipped to
  const d = {
    clipped(rect, draw) { const was = clip; clip = rect.map((v) => Math.round(v)); draw(); clip = was; },
    // opts: ink, w (4 or 2), reveal (0..1 by length), dash, fill (an ink name).
    line(pts, { ink = "ink", w = 4, reveal = 1, dash = false, fill = null } = {}) {
      if (reveal <= 0 || pts.length < 2) return;
      const total = lengthOf(pts), end = total * clamp(reveal);
      if (!dash) { lines.push({ pts: reveal >= 1 ? pts : slice(pts, 0, end), ink, w, fill: reveal >= 1 ? fill : null, clip }); return; }
      const [on, off] = DASH.map((v) => v * u);
      for (let a = 0; a < end; a += on + off) lines.push({ pts: slice(pts, a, Math.min(end, a + on)), ink, w, fill: null, clip });
    },
    // A rounded box outline (corners 8), drawn on from its top-left corner.
    rect(x, y, w, h, opts = {}) {
      const r = Math.min((opts.r ?? RADIUS) * u, w / 2, h / 2);
      d.line(rounded([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, true), opts);
    },
    circle(cx, cy, r, opts = {}) {
      d.line(Array.from({ length: 17 }, (_, i) => [cx + r * Math.cos((i / 16) * 2 * Math.PI), cy + r * Math.sin((i / 16) * 2 * Math.PI)]), opts);
    },
    // An open chevron with its point at tip, pointing along dir; size is its height.
    chevron(tip, dir, size, opts = {}) {
      const len = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / len, uy = dir[1] / len, L = (size / 2) * Math.SQRT2, c = Math.SQRT1_2;
      const arm = (s) => [tip[0] - L * c * (ux - s * uy), tip[1] - L * c * (uy + s * ux)];
      d.line([arm(1), tip, arm(-1)], opts);
    },
    // A connector: rounded bends, drawn by length, its chevron riding the tip.
    connector(pts, { reveal = 1, arrow = 32, ...opts } = {}) {
      if (reveal <= 0) return;
      const r = rounded(pts, RADIUS * u), part = reveal >= 1 ? r : slice(r, 0, lengthOf(r) * reveal);
      d.line(r, { ...opts, reveal });
      if (!arrow || part.length < 2) return;
      const a = part[part.length - 2], b = part[part.length - 1];
      d.chevron(b, [b[0] - a[0], b[1] - a[1]], arrow * u, { ...opts, dash: false, fill: null });
    },
    // A filled area: solid, or hatch step 1..3 (page-anchored, like the engine's).
    fill(x, y, w, h, { ink = "ink", hatch = 0, r = 0 } = {}) {
      if (w > 0 && h > 0) fills.push({ x, y, w, h, ink, hatch, r: r * u, clip });
    },
    // Label text; ax, ay: which point of the text sits on x, y (0 start, 0.5 middle, 1 end).
    text(x, y, str, { ink = "ink", cls = "", ax = 0, ay = 0 } = {}) {
      texts.push({ x, y, str, ink, cls, ax, ay, clip });
    },
    // A click target: run() is called from the click event itself, so it may
    // open a window (N07's tool buttons and links).
    hit(x, y, w, h, run) { hits.push({ x, y, w, h, run }); },
    // Places the slide's [data-nora-slot="<name>"] element (it holds one of
    // Max's engine graphics) on a box of the scene.
    // `shift` moves the slot's content up inside it (a page scrolling in a frame).
    slot(name, x, y, w, h, shift = 0) { slots.push({ name, box: [x, y, w, h].map((v) => Math.round(v)), shift: Math.round(shift) }); },
    // The point at fraction k along a polyline.
    along(pts, k) { const p = slice(pts, 0, lengthOf(pts) * clamp(k)); return p[p.length - 1] ?? pts[0]; },
    rounded: (pts) => rounded(pts, RADIUS * u),
  };
  return { d, lines, fills, texts, slots, hits };
}

// ---------- mounting and the frame loop ----------

// The width (px) of a label's text, in the label role or with a class
// ("nora-code"), for laying text out in runs and sizing things to it.
const meter = document.createElement("canvas").getContext("2d"), labelFonts = new Map();
function widthOf(m, str, cls = "") {
  const key = `${cls}|${unit()}`;
  if (!labelFonts.has(key)) {
    const probe = document.createElement("span");
    probe.className = `graphic-label ${cls}`.trim();
    m.texts.append(probe);
    const cs = getComputedStyle(probe);
    labelFonts.set(key, `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
    probe.remove();
  }
  meter.font = labelFonts.get(key);
  return meter.measureText(str).width;
}

function mount(el) {
  const scene = SCENES[el.dataset.noraScene];
  if (!scene) { console.warn("[nora] unknown scene", el.dataset.noraScene); return null; }
  // The wipe: everything sits in a [data-clip] box whose height follows S.show.
  // It reaches far left and right of the scene (N01's connector runs out to
  // the statement); .nora-inner puts the layers back on the scene's box.
  const clip = document.createElement("div"), inner = document.createElement("div");
  clip.className = "nora-clip"; clip.setAttribute("data-clip", ""); inner.className = "nora-inner";
  clip.append(inner); el.append(clip);
  const layer = (tag, cls) => { const n = tag === "svg" ? document.createElementNS(SVG, "svg") : document.createElement(tag); n.setAttribute("class", cls); inner.append(n); return n; };
  const fills = layer("div", "nora-fills"), thick = layer("div", "nora-lines"), thin = layer("div", "nora-lines"), texts = layer("div", "nora-texts");
  const slide = el.closest("[data-slide]"), panel = el.closest("[data-panel]");
  return {
    el, scene, clip, inner, fills, thick, thin, texts, key: "",
    tab: panel?.dataset.panel ?? "",
    number: [...(panel?.querySelectorAll("[data-slide]") ?? [])].indexOf(slide) + 1,
    slide, values: new Map(), mem: {}, beat: 0, dir: 1, since: null,
  };
}

// Where the talk is, from the URL: { tab, slide, beat } (beat from 0).
function position() {
  const [tab, rest] = location.hash.slice(1).split("/");
  const [slide, beat] = (rest ?? "1").split(".").map(Number);
  return { tab, slide: slide || 1, beat: Math.max(0, (beat || 1) - 1) };
}

function frame(m, now, motion) {
  const visible = !m.el.closest("[hidden]");
  if (!visible) { // off screen: forget everything, so it draws on fresh next time
    m.values.clear(); m.mem = {}; m.since = null;
    if (m.key !== "") { m.key = ""; for (const n of [m.fills, m.thick, m.thin, m.texts]) n.replaceChildren(); return true; }
    return false;
  }
  const pos = position(), here = pos.tab === m.tab && pos.slide === m.number;
  if (here && pos.beat !== m.beat) { m.dir = pos.beat > m.beat ? 1 : -1; m.beat = pos.beat; }
  if (m.since == null) { m.since = now; if (here) m.beat = pos.beat; }
  const u = unit(), box = m.el.getBoundingClientRect();
  const [w, h] = m.scene.size, s = Math.max(0.05, Math.min(box.width / w, box.height / h));
  const ox = (box.width - w * s) * (m.scene.align ?? 0), oy = 0; // hung from the top of its box
  const S = {
    beat: m.beat, dir: m.dir, now, motion, u, s, W: box.width, H: box.height, mem: m.mem, opts: m.el.dataset, slide: m.slide,
    loop: motion ? now - m.since : null,
    // The pointer: held down or not, and the last press ({ n } counts presses), in the scene's px.
    down, press: { n: press.n, x: press.x - box.left, y: press.y - box.top },
    // The pointer in the scene's px, or null when it's not over the page.
    pointer: pointer ? [pointer[0] - box.left, pointer[1] - box.top] : null,
    P: (x, y) => [ox + x * s, oy + y * s],
    width: (str, cls) => widthOf(m, str, cls),
    // Steps the talk on one beat, as the bottom bar's [→] button does: for a
    // beat that should follow the one before without a press (N05).
    advance: () => document.querySelector('.site-step[data-step="1"]')?.click(),
    // A DOM rect in the scene's px.
    rel: (r) => ({ left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top, width: r.width, height: r.height }),
    // Eases the named value to target over ms, starting `delay` ms after the
    // target changed; `init` is where it starts the first time (default: there).
    to(name, target, ms = 400, delay = 0, init = target) {
      let v = m.values.get(name);
      if (!v) m.values.set(name, (v = { from: init, to: init, t0: now, ms }));
      const cur = v.ms > 0 && motion ? v.from + (v.to - v.from) * ease(clamp((now - v.t0) / v.ms)) : v.to;
      if (v.to !== target) { v.from = cur; v.to = target; v.t0 = now + delay; v.ms = ms; }
      if (!motion) return target;
      return v.ms > 0 ? v.from + (v.to - v.from) * ease(clamp((now - v.t0) / v.ms)) : v.to;
    },
  };
  // 0..1: the scene wipes in downward when its slide arrives and out upward when the talk leaves it.
  S.show = S.to("show", here ? 1 : 0, here ? SHOW_MS : HIDE_MS, 0, 0);
  // scene.enter "own": the scene opens itself (N03's tiles), so no wipe on the way in.
  const cut = S.show >= 1 || (here && m.scene.enter === "own") ? "200vh" : `${(box.height * S.show).toFixed(1)}px`;
  const p = pen(u);
  m.scene.draw(S, p.d);
  m.hits = p.hits; m.box = box;

  const key = JSON.stringify([cut, box.width | 0, box.height | 0, p.slots, p.lines.map((l) => [fmt(l.pts), l.ink, l.w, l.fill, l.clip]), p.fills.map((f) => [f.x | 0, f.y | 0, f.w | 0, f.h | 0, f.ink, f.hatch, f.clip]), p.texts.map((t) => [t.x | 0, t.y | 0, t.str, t.ink, t.cls, t.clip])]);
  if (key === m.key) return false;
  m.key = key;
  m.clip.style.height = cut;
  for (const sl of p.slots) {
    const el = m.el.parentElement.querySelector(`[data-nora-slot="${sl.name}"]`);
    if (!el) continue;
    el.style.cssText = `left:${sl.box[0]}px;top:${sl.box[1]}px;width:${sl.box[2]}px;height:${sl.box[3]}px`;
    if (el.firstElementChild) el.firstElementChild.style.transform = sl.shift ? `translateY(${-sl.shift}px)` : "";
  }
  m.inner.style.width = `${box.width}px`; m.inner.style.height = `${box.height}px`;
  const line = (l) => {
    const n = document.createElementNS(SVG, "polyline");
    n.setAttribute("points", fmt(l.pts));
    n.setAttribute("fill", "none");
    n.dataset.ink = l.ink;
    if (l.fill) n.dataset.fillInk = l.fill;
    return n;
  };
  // Items by clip box: unclipped ones straight into `wrap(null)`, the rest in
  // a [data-clip] box at their rect, holding a layer set back onto the scene's origin.
  const W = box.width, H = box.height;
  const grouped = (items, make, holder) => {
    const groups = new Map();
    for (const it of items) { const k = it.clip ? it.clip.join(",") : ""; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    return [...groups].map(([k, list]) => {
      const c = k ? k.split(",").map(Number) : [0, 0, W, H], inner = holder();
      inner.style.cssText = `position:absolute;left:${-c[0]}px;top:${-c[1]}px;width:${W}px;height:${H}px`;
      inner.append(...list.map(make));
      const wrap = document.createElement("div");
      if (k) wrap.setAttribute("data-clip", "");
      wrap.style.cssText = `position:absolute;left:${c[0]}px;top:${c[1]}px;width:${c[2]}px;height:${c[3]}px`;
      wrap.append(inner);
      return wrap;
    });
  };
  const svgOf = (w) => () => { const n = document.createElementNS(SVG, "svg"); n.setAttribute("data-draw", ""); n.dataset.weight = w; n.setAttribute("aria-hidden", "true"); return n; };
  const div = () => document.createElement("div");
  m.thick.replaceChildren(...grouped(p.lines.filter((l) => l.w !== 2), line, svgOf(4)));
  m.thin.replaceChildren(...grouped(p.lines.filter((l) => l.w === 2), line, svgOf(2)));
  m.fills.replaceChildren(...grouped(p.fills, (f) => {
    const n = document.createElement("span");
    n.setAttribute("data-fill", "");
    if (f.hatch) n.dataset.hatch = f.hatch;
    n.dataset.ink = f.ink;
    n.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;border-radius:${f.r}px`;
    return n;
  }, div));
  m.texts.replaceChildren(...grouped(p.texts, (t) => {
    const n = document.createElement("span");
    n.className = `graphic-label ${t.cls}`.trim();
    n.dataset.ink = t.ink;
    n.textContent = t.str;
    n.style.cssText = `left:${t.x}px;top:${t.y}px;transform:translate(${-t.ax * 100}%,${-t.ay * 100}%)`;
    return n;
  }, div));
  return true;
}

// The pointer, for scenes with something to hover (N02's prototype button).
let pointer = null;
window.addEventListener("pointermove", (e) => { pointer = [e.clientX, e.clientY]; });
document.addEventListener("pointerleave", () => { pointer = null; });
// Presses, for real buttons and drag handles (N03). A press on a showing
// scene doesn't start a text selection. Keys are left alone: ← → stay with
// the slides.
let down = false, press = { n: 0, x: 0, y: 0 };
window.addEventListener("pointerdown", (e) => {
  down = true; pointer = [e.clientX, e.clientY]; press = { n: press.n + 1, x: e.clientX, y: e.clientY };
  const hit = mounts.some((m) => { if (m.el.closest("[hidden]")) return false; const r = m.el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
  if (hit) e.preventDefault();
});
window.addEventListener("click", (e) => {
  for (const m of mounts) {
    if (m.el.closest("[hidden]") || !m.box) continue;
    const x = e.clientX - m.box.left, y = e.clientY - m.box.top;
    for (const h of m.hits ?? []) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.run(); return; }
  }
});
for (const type of ["pointerup", "pointercancel"]) window.addEventListener(type, () => { down = false; });

const mounts = [...document.querySelectorAll("[data-nora-scene]")].map(mount).filter(Boolean);
if (mounts.length) {
  const tick = (now) => {
    const motion = viewer.get().motion;
    let changed = false;
    for (const m of mounts) if (frame(m, now, motion)) changed = true;
    if (changed) window.dispatchEvent(new Event("lab:layout"));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
