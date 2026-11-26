// Slide 8's sculpture (drawn by the knot scene, js/knot.js, on its "make"
// value): the artist template's page, stripped to its boxes, handed over from
// the DOM (js/slides.js data-handover) as an upright panel seen face-on, so
// the first frame is the page as it was. Then:
//   pivot     the page turns about its vertical axis towards the folder while
//             the view tips down to true iso (and it moves to the middle of
//             its columns, scaled to fit)
//   link      a connector draws from the project folder to the page's corner
//   extrude   the three cards come out of the page's face as boxes
//   swap      each box spins a half turn, shrinking to a point, and a low-poly
//             solid grows out of it and finishes the turn (staggered), standing
//             off the face; the solids then bob (up and down), out of phase
// Page-local coordinates: x right and z down in the page (the DOM's x, y),
// y out of its face. stand() turns them upright before the camera.
// Phases are in ms of scene.make.ms, on the tween's raw clock. The page isn't
// an object: it's ground with outlines and no shading; only what comes out of
// it (the boxes, the solids) is hatched by the light. Solids:
// an icosahedron, a (2,3) torus knot tube, a twisted square prism, hatched by
// the global light with 4 edges (docs/design-system/graphics.md).
import { ISO_STYLE, ISO_YAW, ISO_PITCH, rotator, lightVector, quantize, boxFaces, Spin } from "./shade.js";
import { drawPart } from "./knot.js";

const INK = 4;          // iso edges, the page's frame
const NESTED = 2;       // the page's regions seen top-down (as the DOM draws them)
const PAGE_T = 16;      // page slab thickness (units)
const REGION_T = 4;     // region slabs on it
const RADIUS = 8;
const MARGIN = 24;      // the fitted sculpture's room inside its columns
const BOB = 8, BOB_MS = 2000;
const GROW = 1.35;      // the solids, against their card's footprint
const EMERGE = 1.2;     // how far (in card radii) the solids stand off the face
const SHIFT = 1;        // columns the solids sit left of where they emerge (slide 8)

const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const xRot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y, z]) => [x, y * c - z * s, y * s + z * c]; };

// ---------- meshes (unit size, y up; each face knows a point inside it) ----------

function icosahedron() {
  const p = (1 + Math.sqrt(5)) / 2;
  const V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]].map(norm);
  const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return F.map((f) => ({ v: f.map((i) => V[i]), inside: [0, 0, 0] }));
}

// A (2,3) torus knot tube: N sections along, M sides round, Frenet frames
// (its curvature never vanishes, so the tube closes without a seam).
function torusKnot(N = 32, M = 4, rt = 0.3) {
  const c = (t) => { const s = 2 + Math.cos(3 * t); return [(s * Math.cos(2 * t)) / 3, Math.sin(3 * t) / 3, (s * Math.sin(2 * t)) / 3]; };
  const e = 1e-3, rings = [], mids = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * Math.PI, p = c(t), a = c(t - e), b = c(t + e);
    const T = norm(sub(b, a)), A = [b[0] - 2 * p[0] + a[0], b[1] - 2 * p[1] + a[1], b[2] - 2 * p[2] + a[2]];
    const Nn = norm(sub(A, T.map((v) => v * dot(A, T)))), B = cross(T, Nn);
    rings.push(Array.from({ length: M }, (_, j) => {
      const th = (j / M) * 2 * Math.PI + Math.PI / M, co = Math.cos(th) * rt, si = Math.sin(th) * rt;
      return [p[0] + co * Nn[0] + si * B[0], p[1] + co * Nn[1] + si * B[1], p[2] + co * Nn[2] + si * B[2]];
    }));
    mids.push(c(t + Math.PI / N));
  }
  const faces = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const r0 = rings[i], r1 = rings[(i + 1) % N];
    faces.push({ v: [r0[j], r1[j], r1[(j + 1) % M], r0[(j + 1) % M]], inside: mids[i] });
  }
  return faces;
}

// A square prism whose sections turn `twist` up its height, in `levels` bands.
function twistedPrism(levels = 6, h = 1.6, twist = Math.PI / 2, rad = 0.62) {
  const ring = (k) => {
    const y = -h / 2 + (h * k) / levels, a = (twist * k) / levels;
    return Array.from({ length: 4 }, (_, j) => { const th = a + Math.PI / 4 + (j * Math.PI) / 2; return [rad * Math.cos(th), y, rad * Math.sin(th)]; });
  };
  const faces = [];
  for (let k = 0; k < levels; k++) {
    const a = ring(k), b = ring(k + 1), mid = [0, -h / 2 + (h * (k + 0.5)) / levels, 0];
    for (let j = 0; j < 4; j++) faces.push({ v: [a[j], a[(j + 1) % 4], b[(j + 1) % 4], b[j]], inside: mid });
  }
  faces.push({ v: ring(0), inside: [0, 0, 0] }, { v: ring(levels), inside: [0, 0, 0] });
  return faces;
}

// Each solid: its mesh, a resting tilt (deg about x) and its size per unit of
// the card's footprint radius.
const SOLIDS = {
  icosahedron: { mesh: icosahedron(), tilt: 0, size: 1 },
  "torus-knot": { mesh: torusKnot(), tilt: 55, size: 1 / 1.25 },
  "twisted-prism": { mesh: twistedPrism(), tilt: 0, size: 1.05 },
};
// Meshes are made upright (y up); in page-local terms up is -z and out of the
// page is y. minY / maxY: their extent out of the face, so each stands off it.
const toLocal = ([x, y, z]) => [x, z, -y];
for (const sol of Object.values(SOLIDS)) {
  const t = (p) => toLocal(xRot(sol.tilt)(p));
  sol.mesh = sol.mesh.map((fc) => ({ v: fc.v.map(t), inside: t(fc.inside) }));
  sol.minY = Math.min(...sol.mesh.flatMap((fc) => fc.v.map((p) => p[1])));
  sol.maxY = Math.max(...sol.mesh.flatMap((fc) => fc.v.map((p) => p[1])));
}
// Page-local to upright world (x right, y up, z towards the viewer): a rotation.
const stand = ([x, y, z]) => [x, -z, y];
// Turning about the vertical (world y = local -z): a turn in local x, y.
const zRot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y, z]) => [x * c - y * s, x * s + y * c, z]; };
// The camera at pivot p: face-on (0) to true iso, the page turned towards the
// folder on its left (1).
const camera = (p) => { const rot = rotator(-ISO_YAW * p, ISO_PITCH * p); return (v) => rot(stand(v)); };

// ---------- the page, measured from the DOM ----------

// The template's frame, its bar's rule and its regions, in the knot element's
// units (x right, z down = world x, z). Measured while it's laid out; when
// it's hidden (cut straight to the end) it's unhidden for the measure.
function measure(m) {
  const tpl = m.el.closest("[data-slide]")?.querySelector(m.el.dataset.sculptFrom || '[data-carry="artist-site"]');
  if (!tpl || !m.geom) return m.sculptGeom ?? null;
  const shown = !tpl.hidden && tpl.getBoundingClientRect().width > 0;
  if (!shown && m.sculptGeom) return m.sculptGeom;
  if (!shown) tpl.hidden = false;
  const u = m.geom.u, er = m.el.getBoundingClientRect();
  const R = (el) => { const q = el.getBoundingClientRect(); return { x: (q.left - er.left) / u, z: (q.top - er.top) / u, w: q.width / u, d: q.height / u }; };
  const frame = tpl.querySelector(".site-frame");
  const geom = frame && {
    frame: R(frame),
    rule: frame.querySelector(":scope > .site-rule") ? R(frame.querySelector(":scope > .site-rule")) : null,
    regions: [...tpl.querySelectorAll(".tpl-nav, .tpl-hero, .tpl-footer")].map(R),
    cards: [...tpl.querySelectorAll(".tpl-card")].map(R),
  };
  if (!shown) tpl.hidden = true;
  if (geom) m.sculptGeom = geom;
  return m.sculptGeom ?? null;
}

const slab = (b, y0, y1) => boxFaces({ c: [b.x + b.w / 2, (y0 + y1) / 2, b.z + b.d / 2], s: [b.w, y1 - y0, b.d] });
const cardRadius = (c) => 0.42 * Math.min(c.w, c.d);
const boxHeight = (c) => Math.min(c.w, c.d);

// ---------- painting ----------

export function paintSculpt(m, r, ctx) {
  const { own, f, rounded, chevron, pullBack, makeT, node, cols, elW, elH, now, motion } = ctx;
  const S = m.scene.make ?? {}, t = makeT * (S.ms ?? 3300);
  if (t < (S.strip ?? 400)) return; // the DOM template is still showing
  const g = measure(m);
  if (!g) return;
  const solids = (m.scene.solids ?? ["icosahedron", "torus-knot", "twisted-prism"]).map((k) => SOLIDS[k]);
  const pv = easeIO(seg(t, ...(S.pivot ?? [400, 1200])));
  const linkP = seg(t, ...(S.link ?? [1200, 1500]));
  const ext = easeIO(seg(t, ...(S.extrude ?? [1500, 1900])));
  m.sculptReady = t >= (S.ms ?? 3300); // the solids can be turned
  const swapAt = (i) => seg(t, ...(S.swap ?? [1900, 2700]).map((v) => v + i * (S.stagger ?? 300)));

  // The DOM draws a box's outline inside it; edges here are centred on the
  // shape, so each box is inset by half its top-down weight to land on it.
  const inset = (b, w) => { const d = w / 2 / f; return { x: b.x + d, z: b.z + d, w: b.w - 2 * d, d: b.d - 2 * d }; };
  const F = inset(g.frame, INK), C = [F.x + F.w / 2, 0, F.z + F.d / 2];
  const colStep = cols ? cols[1][0] - cols[0][0] : 0; // one column and its gutter, element units
  const regions = g.regions.map((b) => inset(b, NESTED)), cards = g.cards.map((b) => inset(b, NESTED));
  const R = camera(pv);

  // Fitted at iso: the page and its solids as large as they fit in columns
  // 7-12 (or the right half) and the whole box (slide 8: rows 1-6), MARGIN in.
  const fit = isoFit(m, g, solids, cols, elW, elH, C);
  const sc = 1 + (fit.s - 1) * pv, sx = C[0] + (fit.x - C[0]) * pv, sy = C[2] + (fit.y - C[2]) * pv;
  const proj = (p) => { const q = R(sub(p, C)); return [(sx + q[0] * sc) * f, (sy - q[1] * sc) * f, q[2]]; };

  // Faces: { pts, n (view), part, weight }.
  const tipped = pv >= 0.5; // face-on, faces are empty boxes in the DOM's weights; turned, iso
  const faces = [];
  // rot: a solid's drag turn, { c, M }, in view space about its centre.
  const add = (v, n, part, weight, shaded = true, dx = 0, rot = null) => {
    const rn = rot ? rot.M(R(n)) : R(n);
    if (rn[2] <= 1e-4) return;
    const pv3 = (p) => {
      if (!rot) return proj(p);
      const q = rot.M(sub(R(sub(p, C)), rot.c)), w = [rot.c[0] + q[0], rot.c[1] + q[1], rot.c[2] + q[2]];
      return [(sx + w[0] * sc) * f, (sy - w[1] * sc) * f, w[2]];
    };
    const pts = v.map(pv3).map(([x, y, z]) => [x + dx * f, y, z]);
    faces.push({ pts, n: rn, part, weight: tipped ? INK : weight, shaded, depth: pts.reduce((a, p) => a + p[2], 0) / pts.length });
  };
  const pageFaces = [];
  for (const fc of slab(F, -PAGE_T, 0)) {
    const rn = R(fc.n);
    if (rn[2] > 1e-4) pageFaces.push({ pts: fc.v.map(proj), n: rn, part: "page", weight: INK, shaded: false });
  }
  for (const b of regions) for (const fc of slab(b, 0, REGION_T)) add(fc.v, fc.n, "page", NESTED, false);
  cards.forEach((c, i) => {
    const sw = swapAt(i), ang = 180 * easeIO(sw), cx = c.x + c.w / 2, cz = c.z + c.d / 2;
    const turn = zRot(ang); // about the vertical
    if (sw < 0.5) {
      // The card's box: coming out of the page's face, then shrinking to a point at its centre.
      const k = 1 - 2 * sw, hb = REGION_T + ext * (boxHeight(c) - REGION_T), mid = [cx, hb / 2, cz];
      for (const fc of slab(c, 0, hb)) {
        const v = fc.v.map((p) => { const q = turn([(p[0] - cx) * k, (p[1] - hb / 2) * k, (p[2] - cz) * k]); return [mid[0] + q[0], mid[1] + q[1], mid[2] + q[2]]; });
        add(v, turn(fc.n), "card-" + i, NESTED);
      }
      return;
    }
    // The solid, growing out of the point and finishing the turn, then bobbing.
    const sol = solids[i % solids.length], k = (2 * sw - 1) * cardRadius(c) * sol.size * GROW;
    const bob = motion ? Math.sin((2 * Math.PI * now) / BOB_MS + (i * 2 * Math.PI) / 3) * BOB * seg(sw, 0.5, 1) : 0;
    const base = [cx, -sol.minY * k + EMERGE * cardRadius(c) * (2 * sw - 1), cz - bob]; // off the face; bob is up (local -z)
    const W = (p) => { const q = turn(p); return [base[0] + q[0] * k, base[1] + q[1] * k, base[2] + q[2] * k]; };
    const dx = -SHIFT * colStep * (2 * sw - 1); // on screen, left as it grows; the page's fit is unchanged
    // Once built, each solid drags to turn on its own (the iso scenes' Spin:
    // it springs back to its pose on release).
    const spin = ((m.solidSpin ??= [])[i] ??= new Spin());
    spin.step(now);
    const rot = spin.yaw || spin.pitch ? { c: R(sub(W([0, 0, 0]), C)), M: rotator(spin.yaw, spin.pitch) } : null;
    for (const fc of sol.mesh) {
      const v = fc.v.map(W), inside = W(fc.inside);
      let n = norm(cross(sub(v[1], v[0]), sub(v[2], v[0])));
      const ctr = v.reduce((a, p) => [a[0] + p[0] / v.length, a[1] + p[1] / v.length, a[2] + p[2] / v.length], [0, 0, 0]);
      if (dot(n, sub(ctr, inside)) < 0) n = n.map((q) => -q);
      if (k * f < 1) continue;
      add(v, n, "card-" + i, INK, true, dx, rot);
    }
  });

  // The link: straight out of the folder's right edge at its middle, its
  // arrow's tip on the right edge of the column after the folder's (slide 8:
  // column 6), drawn once the page has turned.
  if (linkP > 0) {
    const nc = Number(m.el.dataset.nodeCol) || 0, tipX = cols?.[nc]?.[1] ?? node.right + 64;
    const a = [node.right * f, node.y * f], b = [(tipX + 32 / f) * f, node.y * f];
    const pts = pullBack([a, b], 32); // the tip is pulled back 32 from the end
    const id = own(r.count++, "link", true);
    drawPart(r, pts, linkP, id);
    if (linkP >= 1) { chevron(r, pts[pts.length - 2], pts[pts.length - 1], id); m.flows.push({ pts, id }); }
  }

  // The page first (everything stands off it), its bar's rule on its face,
  // then the rest farthest first.
  for (const fc of pageFaces) fill(r, own, fc, tipped);
  if (g.rule) {
    const z = g.rule.z + g.rule.d / 2, a = proj([F.x, 0, z]), b = proj([F.x + F.w, 0, z]);
    r.line(a, b, own(r.count++, "page"), NESTED);
  }
  faces.sort((a, b) => a.depth - b.depth);
  for (const fc of faces) fill(r, own, fc, tipped);
}

function fill(r, own, fc, hatched) {
  const lit = Math.max(0, dot(fc.n, lightVector(ISO_STYLE)));
  const t = hatched && fc.shaded ? quantize(ISO_STYLE.hatch, 1 - lit) : 0;
  const pts = fc.pts.map(([x, y]) => [x, y]);
  // Hatching anchored to the face: pattern coords along its first and last edges.
  const p0 = pts[0], p1 = pts[1], pl = pts[pts.length - 1];
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = pl[0] - p0[0], by = pl[1] - p0[1], det = ax * by - bx * ay;
  const basis = Math.abs(det) > 1 ? { ox: p0[0], oy: p0[1], inv: [by / det, -bx / det, -ay / det, ax / det], la: Math.hypot(ax, ay), lb: Math.hypot(bx, by) } : null;
  own(r.fill(pts, t, { edges: true, edgeWidth: fc.weight, basis }), fc.part);
}

// Scale and centre (element units) that fit the iso sculpture, page and
// tallest solids, in its columns. Cached per page geometry and box.
function isoFit(m, g, solids, cols, elW, elH, C) {
  const key = [g.frame.x, g.frame.z, g.frame.w, g.frame.d, elW, elH, cols?.[6]?.[0]].join("|");
  if (m.sculptFit?.key === key) return m.sculptFit;
  const R = camera(1), pts = [];
  const F = g.frame;
  for (const y of [0, -PAGE_T]) for (const [x, z] of [[F.x, F.z], [F.x + F.w, F.z], [F.x + F.w, F.z + F.d], [F.x, F.z + F.d]]) pts.push([x, y, z]);
  g.cards.forEach((c, i) => {
    const sol = solids[i % solids.length], k = cardRadius(c) * sol.size * GROW;
    const h = Math.max(boxHeight(c), (sol.maxY - sol.minY) * k + EMERGE * cardRadius(c));
    for (const [x, z] of [[c.x, c.z], [c.x + c.w, c.z], [c.x + c.w, c.z + c.d], [c.x, c.z + c.d]]) pts.push([x, h, z]);
  });
  const q = pts.map((p) => { const v = R(sub(p, C)); return [v[0], -v[1]]; });
  const bx0 = Math.min(...q.map((p) => p[0])), bx1 = Math.max(...q.map((p) => p[0]));
  const by0 = Math.min(...q.map((p) => p[1])), by1 = Math.max(...q.map((p) => p[1]));
  const rx0 = cols ? cols[6][0] : elW / 2, rx1 = cols ? cols[11][1] : elW;
  const s = Math.min((rx1 - rx0 - 2 * MARGIN) / (bx1 - bx0), (elH - 2 * MARGIN) / (by1 - by0));
  return (m.sculptFit = { key, s, x: (rx0 + rx1) / 2 - ((bx0 + bx1) / 2) * s, y: elH / 2 - ((by0 + by1) / 2) * s });
}
