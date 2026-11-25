// genie.html only: the curvature graph editor. Two bezier graphs over a line's
// run (a row's time, 0..1): "Swing" (-1..1, the spine's swing level) and
// "Narrowing" (0..1.2, how far the funnel's sides have pulled in). Graphs live
// in settings.graphs (js/genie-warp.js) and are saved in localStorage.
//
// Editing: drag an anchor (square) or a handle (dot); handles mirror unless
// Shift is held. Click the curve to add an anchor; Alt-click an anchor to
// remove it (the ends stay). Each graph's Reset restores the tuned default.
import { settings, defaultGraph, graphPoints, sampleGraph, evalGraph } from "./genie-warp.js";

const STORE = "lab-genie-graphs";
const W = 256, H = 128, PAD = 10;
const GRAPHS = [
  { key: "swing", title: "Swing over a line", min: -1, max: 1, guides: [0] },
  { key: "narrow", title: "Narrowing over a line", min: 0, max: 1.2, guides: [0, 1] },
];
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    // The swing graph was called arc until 2026-11-25.
    if (saved && !saved.swing && saved.arc) { saved.swing = saved.arc; delete saved.arc; }
    if (saved?.swing?.length >= 2 && saved?.narrow?.length >= 2) settings.graphs = saved;
  } catch {}
}
function save() {
  settings.graphsRev++;
  try { localStorage.setItem(STORE, JSON.stringify(settings.graphs)); } catch {}
}

// Mounts the panel; playhead() returns the time to mark (0..1) or null.
export function mountGraphs({ playhead }) {
  load();
  const panel = document.createElement("div");
  panel.className = "genie-graphs";
  document.body.append(panel);
  const views = GRAPHS.map((g) => mountGraph(panel, g));

  (function tick() {
    requestAnimationFrame(tick);
    if (panel.hidden) return;
    const x = playhead();
    for (const v of views) v.playhead(x);
  })();

  return {
    toggle() { panel.hidden = !panel.hidden; },
    get shown() { return !panel.hidden; },
    redraw() { for (const v of views) v.draw(); },
  };
}

function mountGraph(panel, g) {
  const box = document.createElement("div");
  box.className = "genie-graph";
  const head = document.createElement("div");
  head.className = "genie-graph-head";
  head.innerHTML = `<span>${g.title}</span>`;
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  head.append(reset);
  const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  box.append(head, svg);
  panel.append(box);

  const X = (x) => PAD + x * (W - 2 * PAD);
  const Y = (y) => H - PAD - ((y - g.min) / (g.max - g.min)) * (H - 2 * PAD);
  const fromPx = (px, py) => [(px - PAD) / (W - 2 * PAD), g.min + ((H - PAD - py) / (H - 2 * PAD)) * (g.max - g.min)];
  const anchors = () => settings.graphs[g.key];

  const guides = svgEl("g", { class: "genie-graph-guides" });
  const curve = svgEl("path", { class: "genie-graph-curve" });
  const hit = svgEl("path", { class: "genie-graph-hit" });
  const handles = svgEl("g");
  const head2 = svgEl("line", { class: "genie-graph-playhead", y1: PAD, y2: H - PAD });
  svg.append(guides, curve, hit, handles, head2);
  for (const y of g.guides) guides.append(svgEl("line", { x1: X(0), x2: X(1), y1: Y(y), y2: Y(y) }));
  guides.append(svgEl("rect", { x: X(0), y: Y(g.max), width: X(1) - X(0), height: Y(g.min) - Y(g.max) }));

  function draw() {
    const d = graphPoints(anchors()).map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("");
    curve.setAttribute("d", d);
    hit.setAttribute("d", d);
    handles.replaceChildren();
    anchors().forEach((a, i) => {
      for (const side of ["hin", "hout"]) {
        if ((side === "hin" && i === 0) || (side === "hout" && i === anchors().length - 1)) continue;
        const hx = X(a.x + a[side][0]), hy = Y(a.y + a[side][1]);
        handles.append(svgEl("line", { class: "genie-graph-arm", x1: X(a.x), y1: Y(a.y), x2: hx, y2: hy }));
        const dot = svgEl("circle", { class: "genie-graph-handle", cx: hx, cy: hy, r: 4 });
        dot.addEventListener("pointerdown", (e) => startDrag(e, { i, side }));
        handles.append(dot);
      }
      const sq = svgEl("rect", { class: "genie-graph-anchor", x: X(a.x) - 4, y: Y(a.y) - 4, width: 8, height: 8 });
      sq.addEventListener("pointerdown", (e) => {
        if (e.altKey) { e.preventDefault(); remove(i); return; }
        startDrag(e, { i, side: null });
      });
      handles.append(sq);
    });
  }

  const point = (e) => { const r = svg.getBoundingClientRect(); return fromPx(e.clientX - r.left, e.clientY - r.top); };

  function startDrag(e, target) {
    e.preventDefault();
    e.stopPropagation();
    try { svg.setPointerCapture(e.pointerId); } catch {} // keeps the drag when the pointer leaves the graph
    const move = (ev) => { drag(target, point(ev), ev.shiftKey); draw(); save(); };
    const up = () => { svg.removeEventListener("pointermove", move); svg.removeEventListener("pointerup", up); svg.removeEventListener("pointercancel", up); };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
  }

  function drag({ i, side }, [px, py], broken) {
    const A = anchors(), a = A[i], prev = A[i - 1], next = A[i + 1];
    if (!side) {
      // Anchors: the ends keep their x; others stay between their neighbours.
      if (prev && next) a.x = clamp(px, prev.x + 0.01, next.x - 0.01);
      a.y = clamp(py, g.min, g.max);
    } else {
      // Handles stay within their segment's x range, so the graph stays a function of time.
      const h = [px - a.x, py - a.y];
      h[0] = side === "hin" ? clamp(h[0], prev.x - a.x, 0) : clamp(h[0], 0, next.x - a.x);
      a[side] = h;
      const other = side === "hin" ? "hout" : "hin";
      const hasOther = side === "hin" ? !!next : !!prev;
      if (!broken && hasOther) {
        // Mirror the direction, keeping the other handle's own length.
        const len = Math.hypot(...a[other]) || Math.hypot(...h), hl = Math.hypot(...h) || 1;
        const o = [(-h[0] / hl) * len, (-h[1] / hl) * len];
        o[0] = other === "hin" ? clamp(o[0], prev.x - a.x, 0) : clamp(o[0], 0, next.x - a.x);
        a[other] = o;
      }
    }
    // Keep neighbours' handles inside their segments too.
    for (let j = 0; j < A.length; j++) {
      if (A[j - 1]) A[j].hin[0] = clamp(A[j].hin[0], A[j - 1].x - A[j].x, 0);
      if (A[j + 1]) A[j].hout[0] = clamp(A[j].hout[0], 0, A[j + 1].x - A[j].x);
    }
  }

  // Adds an anchor at x on the curve, with handles along its tangent.
  function add(x) {
    const A = anchors(), lookup = sampleGraph(A);
    const i = A.findIndex((a) => a.x > x);
    if (i <= 0) return;
    const prev = A[i - 1], next = A[i];
    if (x - prev.x < 0.02 || next.x - x < 0.02) return;
    const y = evalGraph(lookup, x), e = 0.005, slope = (evalGraph(lookup, x + e) - evalGraph(lookup, x - e)) / (2 * e);
    const a = (x - prev.x) / 6, b = (next.x - x) / 6;
    A.splice(i, 0, { x, y, hin: [-a, -a * slope], hout: [b, b * slope] });
    draw();
    save();
  }

  function remove(i) {
    const A = anchors();
    if (i === 0 || i === A.length - 1) return;
    A.splice(i, 1);
    drag({ i: 0, side: null }, [0, A[0].y], true); // re-clamp handles to the new segments
    draw();
    save();
  }

  hit.addEventListener("pointerdown", (e) => { e.preventDefault(); add(clamp(point(e)[0], 0, 1)); });
  reset.addEventListener("click", () => { settings.graphs[g.key] = defaultGraph(g.key); draw(); save(); });

  draw();
  return {
    draw,
    playhead(x) {
      head2.style.display = x == null ? "none" : "";
      if (x != null) { head2.setAttribute("x1", X(x)); head2.setAttribute("x2", X(x)); }
    },
  };
}
