// Reads layout from the invisible DOM and redraws it into a low-res 2D canvas.
// measure() is expensive (one Range per word) and runs only when layout changes;
// draw() runs every frame and only translates by the render scroll offset.

import { mountGraphic, drawGraphic } from "./graphic.js";
import { ISO_STYLE, styleRev, hatchInk, stepTone } from "./shade.js";
import { genieT, warpBlock, setLines, settings as genieSettings } from "./genie-warp.js";

// Ink comes from the CSS custom property --ink (so states like :hover can set it),
// else the nearest data-ink attribute, else ink.
const inkOf = (el, style = getComputedStyle(el)) =>
  style.getPropertyValue("--ink").trim() || el.closest?.("[data-ink]")?.dataset.ink || "ink";
const ascentCache = new Map();

// Canvas only takes font-stretch as a keyword, so a computed percentage maps to
// the nearest one. It rides in the font string (after the size-less part) and is
// applied with ctx.fontStretch by setFont, since ctx.font alone ignores it in Chrome.
const STRETCHES = [
  [50, "ultra-condensed"], [62.5, "extra-condensed"], [75, "condensed"], [87.5, "semi-condensed"],
  [100, "normal"], [112.5, "semi-expanded"], [125, "expanded"], [150, "extra-expanded"], [200, "ultra-expanded"],
];
function stretchOf(style) {
  const pct = parseFloat(style.fontStretch);
  if (Number.isNaN(pct)) return style.fontStretch || "normal";
  return STRETCHES.reduce((a, b) => (Math.abs(b[0] - pct) < Math.abs(a[0] - pct) ? b : a))[1];
}

function fontOf(style) {
  return `${style.fontStyle} ${style.fontWeight} ${stretchOf(style)} ${style.fontSize} ${style.fontFamily}`;
}

// CSS text-transform, applied to the drawn string (the DOM text is untransformed).
function transformOf(style) {
  switch (style.textTransform) {
    case "uppercase": return (t) => t.toUpperCase();
    case "lowercase": return (t) => t.toLowerCase();
    case "capitalize": return (t, first) => (first ? t.charAt(0).toUpperCase() + t.slice(1) : t);
    default: return (t) => t;
  }
}

// Sets ctx.font and ctx.fontStretch from a fontOf() string.
function setFont(ctx, font) {
  ctx.font = font;
  if ("fontStretch" in ctx) ctx.fontStretch = font.match(/\b(?:(?:ultra|extra|semi)-)?(?:condensed|expanded)\b/)?.[0] ?? "normal";
}

function ascentOf(ctx, font) {
  if (!ascentCache.has(font)) {
    setFont(ctx, font);
    ascentCache.set(font, ctx.measureText("Hg").fontBoundingBoxAscent);
  }
  return ascentCache.get(font);
}

// Document-space rects (client rect + scroll) so scrolling never requires re-measuring.
const toDoc = (r) => ({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height });

// [data-clip]: anything inside is drawn clipped to that element's rect, and
// to every [data-clip] around it (a footer strip inside a closing tab body).
// A framed visual opening (slides.js frameItem) sets two inline fractions on
// its frame: --open draws the frame's box at that fraction of its size from
// its top-left corner, and --wipe cuts its content off below that fraction of
// its height (the content generating downward). On a clip element both cut
// its descendants, not its own box.
const frac = (el, name) => {
  const v = el.style?.getPropertyValue(name);
  return v ? Math.max(0, Math.min(1, parseFloat(v) || 0)) : 1;
};
function clipper() {
  const cache = new Map(), opened = new Map();
  // inner: el's clip as its children see it (a nested clip's parent may be a
  // frame whose --open and --wipe cut it).
  const clipOf = (el, inner = false) => {
    const c = el?.closest?.("[data-clip]");
    if (!c) return null;
    const own = clipRect(c);
    if (el === c && !inner) return own;
    const o = frac(c, "--open"), w = frac(c, "--wipe");
    if (o >= 1 && w >= 1) return own;
    if (!opened.has(c)) {
      const r = toDoc(c.getBoundingClientRect());
      const x1 = Math.min(own.x + own.w, r.x + r.w * o), y1 = Math.min(own.y + own.h, r.y + r.h * Math.min(o, w));
      opened.set(c, { x: own.x, y: own.y, w: Math.max(0, x1 - own.x), h: Math.max(0, y1 - own.y) });
    }
    return opened.get(c);
  };
  const clipRect = (c) => {
    if (!cache.has(c)) {
      const r = toDoc(c.getBoundingClientRect()), outer = clipOf(c.parentElement, true);
      if (!outer) cache.set(c, r);
      else {
        const x = Math.max(r.x, outer.x), y = Math.max(r.y, outer.y);
        const x1 = Math.min(r.x + r.w, outer.x + outer.w), y1 = Math.min(r.y + r.h, outer.y + outer.h);
        cache.set(c, { x, y, w: Math.max(0, x1 - x), h: Math.max(0, y1 - y) });
      }
    }
    return cache.get(c);
  };
  return clipOf;
}

export function measure(root, ctx) {
  ascentCache.clear();
  const clipOf = clipper();
  const words = [];
  // Hidden subtrees ([hidden], e.g. slides not on screen) are skipped whole.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, (n) =>
    n.nodeType === 1 ? (n.hidden ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT);
  const shown = (el) => !el.closest("[hidden]");
  const range = document.createRange();
  // [data-genie]: a text block that can genie into its panel's sink, the
  // [data-genie-sink] square (js/genie-warp.js). Its words carry the block's index.
  const genieEls = [...root.querySelectorAll("[data-genie]")].filter(shown);
  const genieOf = (el) => genieEls.indexOf(el.closest("[data-genie]"));

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("svg")) continue;
    const style = getComputedStyle(parent);
    // visibility: hidden text keeps its layout but isn't drawn (typing's
    // untyped part, js/artefact.js; genied-out blocks draw nothing anyway).
    if (style.visibility === "hidden") continue;
    const font = fontOf(style);
    const ascent = ascentOf(ctx, font);
    const ink = inkOf(parent, style);
    const clip = clipOf(parent);
    const tx = transformOf(style);
    const spacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    // Underlines (CSS text-decoration) are drawn by the raster, one emulated
    // pixel thick, just under the baseline.
    const underline = /underline/.test(style.textDecorationLine);
    const genie = genieOf(parent);
    for (const m of node.data.matchAll(/\S+/g)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      if (rects.length === 1) {
        const r = toDoc(rects[0]);
        words.push({ text: tx(m[0], true), x: r.x, baseline: r.y + ascent, font, spacing, ink, clip, underline, genie, el: parent });
        continue;
      }
      // Word wraps (e.g. at a hyphen): split it into one segment per line.
      let segment = null;
      for (let i = 0; i < m[0].length; i++) {
        range.setStart(node, m.index + i);
        range.setEnd(node, m.index + i + 1);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        const r = toDoc(rect);
        if (segment && Math.abs(segment.top - r.y) < 1) {
          segment.text += tx(m[0][i], false);
        } else {
          segment = { text: tx(m[0][i], i === 0), x: r.x, top: r.y, baseline: r.y + ascent, font, spacing, ink, clip, underline, genie, el: parent };
          words.push(segment);
        }
      }
    }
  }

  // Boxes pick up CSS border-radius and dashed borders.
  const boxes = [...root.querySelectorAll("[data-box]")].map((el) => {
    const style = getComputedStyle(el), r = toDoc(el.getBoundingClientRect()), o = frac(el, "--open");
    return {
      ...r, w: r.w * o, h: r.h * o, // --open: drawn from its top-left corner at that fraction
      el,
      ink: inkOf(el, style),
      clip: clipOf(el),
      radius: parseFloat(style.borderTopLeftRadius) || 0,
      // --box-line (site.css) is the declared width; the computed border is snapped.
      line: parseFloat(style.getPropertyValue("--box-line")) || parseFloat(style.borderTopWidth) || 1,
      dashed: style.borderTopStyle === "dashed",
    };
  }).filter((b) => b.w > 0 && b.h > 0); // a frame opening from nothing (slide 4) draws nothing at 0
  // img[data-draw]: the image is stretched to its box and tinted with its ink.
  // Hidden images (display: none) have no size and are skipped.
  const images = [...root.querySelectorAll("img[data-draw]")]
    .map((el) => ({ ...toDoc(el.getBoundingClientRect()), el, ink: inkOf(el), clip: clipOf(el) }))
    .filter((im) => im.w > 0 && im.h > 0);
  // [data-fill]: CSS --fill-alpha (0..1, default 1) sets its opacity. Hidden fills are skipped.
  // data-hatch="1|2|3" fills with that hatch step (the graphics ramp, anchored
  // to the page) instead of solid; CSS --hatch-shift (emulated px) slides the
  // pattern along (marching stripes). CSS border-radius rounds the fill.
  // An inline fill (a link that wraps) takes one box per line, not the box
  // around all its lines.
  const fills = [...root.querySelectorAll("[data-fill]")]
    .flatMap((el) => {
      const style = getComputedStyle(el);
      const alpha = parseFloat(style.getPropertyValue("--fill-alpha"));
      const rects = style.display === "inline" ? [...el.getClientRects()] : [el.getBoundingClientRect()];
      return rects.map((rect) => ({
        ...toDoc(rect), el, ink: inkOf(el, style), clip: clipOf(el), alpha: Number.isNaN(alpha) ? 1 : alpha,
        hatch: Number(el.dataset.hatch) || 0, shift: parseFloat(style.getPropertyValue("--hatch-shift")) || 0,
        // Per corner (top-left, top-right, bottom-right, bottom-left), for canvas roundRect.
        radius: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((v) => parseFloat(v) || 0),
      }));
    })
    .filter((f) => f.w > 0 && f.h > 0 && f.alpha > 0)
    // Translucent first, under solid fills, and fainter under stronger (the
    // grid's row x column cells over its columns).
    .sort((a, b) => (b.alpha < 1) - (a.alpha < 1) || (a.alpha < 1 && b.alpha < 1 ? a.alpha - b.alpha : 0));

  // [data-tab]: notched tab outline (see tabPath) sized to the element, so it grows
  // with whatever the element holds. CSS --line sets the stroke, --tab-header the
  // header strip height, --tab-flap where the notch ends (register it with
  // @property as a <length> so it reads as px), and --tab-fill (an ink name)
  // fills the header strip.
  const tabs = [...root.querySelectorAll("[data-tab]")].map((el) => {
    const style = getComputedStyle(el);
    return {
      ...toDoc(el.getBoundingClientRect()),
      ink: inkOf(el, style),
      line: parseFloat(style.getPropertyValue("--line")) || 1,
      header: parseFloat(style.getPropertyValue("--tab-header")) || 64,
      flap: parseFloat(style.getPropertyValue("--tab-flap")) || 452,
      fill: style.getPropertyValue("--tab-fill").trim() || null,
    };
  });

  // [data-graphic]: a scene graphic (js/graphic.js, scenes in js/graphics/).
  // CSS --u (px per layout unit) sizes it; it falls back to 1.
  const graphics = [...root.querySelectorAll("[data-graphic]")].filter(shown)
    .map((el) => {
      mountGraphic(el);
      const u = parseFloat(getComputedStyle(el).getPropertyValue("--u")) || 1;
      return { ...toDoc(el.getBoundingClientRect()), el, u, clip: clipOf(el) };
    })
    .filter((g) => g.w > 0 && g.h > 0);

  // A bullet per list item, unless its list is styled without one (slide 10's tree).
  const bullets = [...root.querySelectorAll("li")].filter((li) => getComputedStyle(li).listStyleType !== "none").map((li) => {
    const r = toDoc(li.getBoundingClientRect());
    const style = getComputedStyle(li);
    const font = fontOf(style);
    const size = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || size * 1.4;
    return { text: "•", x: r.x - size * 1.1, baseline: r.y + (lineHeight - size) / 2 + ascentOf(ctx, font), font, ink: inkOf(li) };
  });

  // SVG shapes become polylines in document space via each element's screen matrix.
  const paths = [];
  for (const shape of root.querySelectorAll("svg[data-draw] :is(rect, line, polyline, circle)")) {
    // getScreenCTM still answers inside a [hidden] (display: none) subtree, so
    // skip those, or a hidden slide's links keep drawing.
    if (!shown(shape)) continue;
    const ctm = shape.getScreenCTM();
    if (!ctm) continue;
    const pt = (x, y) => {
      const p = new DOMPoint(x, y).matrixTransform(ctm);
      return [p.x + window.scrollX, p.y + window.scrollY];
    };
    const n = (a) => parseFloat(shape.getAttribute(a));
    let points;
    if (shape.tagName === "rect") {
      const [x, y, w, h] = ["x", "y", "width", "height"].map(n);
      points = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h), pt(x, y)];
    } else if (shape.tagName === "line") {
      points = [pt(n("x1"), n("y1")), pt(n("x2"), n("y2"))];
    } else if (shape.tagName === "polyline") {
      points = shape.getAttribute("points").trim().split(/\s+/).map((p) => pt(...p.split(",").map(Number)));
    } else {
      const [cx, cy, rad] = ["cx", "cy", "r"].map(n);
      points = Array.from({ length: 17 }, (_, i) => pt(cx + rad * Math.cos((i / 16) * Math.PI * 2), cy + rad * Math.sin((i / 16) * Math.PI * 2)));
    }
    // data-weight on the svg: the stroke in units (default one emulated pixel).
    const weight = parseFloat(shape.closest("svg").dataset.weight) || 0;
    // Clipped like everything else (slide 4's feed icons scroll inside the phone).
    paths.push({ points, weight, ink: shape.dataset.ink ?? inkOf(shape.closest("svg")), clip: clipOf(shape.closest("svg")), fill: shape.dataset.fillInk ?? null, el: shape });
  }

  // Genie blocks: the box around their text (not the element, which may be a
  // wide grid cell), its line bands (each text node's line fragments, merged
  // by top), and its panel's sink square.
  const genies = genieEls.map((el) => {
    range.selectNodeContents(el);
    const box = toDoc(range.getBoundingClientRect());
    const lines = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.data.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        const d = toDoc(r), hit = lines.find((l) => Math.abs(l.y0 - d.y) < 2);
        if (hit) hit.y1 = Math.max(hit.y1, d.y + d.h);
        else lines.push({ y0: d.y, y1: d.y + d.h });
      }
    }
    lines.sort((a, b) => a.y0 - b.y0);
    setLines(el, lines.length);
    const panel = el.closest(".site-panel");
    const sinkEl = (panel ?? root).querySelector("[data-genie-sink]");
    const sink = sinkEl ? toDoc(sinkEl.getBoundingClientRect()) : null;
    // The panel's inside, within its outline (--line): the funnel's swing stays in it.
    let bounds = null;
    if (panel) {
      const p = toDoc(panel.getBoundingClientRect()), line = parseFloat(getComputedStyle(panel).getPropertyValue("--line")) || 0;
      bounds = { x0: p.x + line, x1: p.x + p.w - line };
    }
    return { el, ...box, lines, sink, bounds };
  });
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;

  tintCache.clear();
  // [data-top]: everything inside goes to a last pass over all the rest.
  const allWords = words.concat(bullets);
  const isTop = (x) => !!x.el?.closest?.("[data-top]");
  const split = (list) => [list.filter((x) => !isTop(x)), list.filter(isTop)];
  const [w0, w1] = split(allWords), [f0, f1] = split(fills), [b0, b1] = split(boxes), [p0, p1] = split(paths);
  const top = w1.length + f1.length + b1.length + p1.length ? { words: w1, fills: f1, boxes: b1, paths: p1 } : null;
  return { words: w0, boxes: b0, fills: f0, paths: p0, images, tabs, graphics, genies, u, top };
}

// Tinted copies of data-draw images, keyed by source, size and color.
const tintCache = new Map();
function tinted(img, w, h, color) {
  const key = `${img.src}|${w}|${h}|${color}`;
  if (!tintCache.has(key)) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    tintCache.set(key, c);
  }
  return tintCache.get(key);
}

// Tab outline from the Figma "Union" shape: the flap on the left is full height,
// a slanted notch (45px wide) ending at x + flap drops the top edge to the
// header's midline, and the bottom edge sits at h. Corners: 8px, notch 3px.
const NOTCH = 45;
function tabPath(ctx, x, y, w, h, header, flap) {
  const mid = header / 2;
  const pts = [
    [x, y, 8], [x + flap - NOTCH, y, 3], [x + flap, y + mid, 3],
    [x + w, y + mid, 8], [x + w, y + h, 8], [x, y + h, 8],
  ];
  ctx.beginPath();
  ctx.moveTo((pts[0][0] + pts[1][0]) / 2, pts[0][1]);
  for (let i = 1; i <= pts.length; i++) {
    const [px, py, r] = pts[i % pts.length];
    const [nx, ny] = pts[(i + 1) % pts.length];
    ctx.arcTo(px, py, nx, ny, r);
  }
  ctx.closePath();
}

// One offscreen canvas the size of the frame, for warped genie blocks.
let offCtx = null;
function offscreen(canvas) {
  if (!offCtx) offCtx = document.createElement("canvas").getContext("2d");
  if (offCtx.canvas.width !== canvas.width || offCtx.canvas.height !== canvas.height) {
    offCtx.canvas.width = canvas.width;
    offCtx.canvas.height = canvas.height;
  }
  return offCtx;
}

// A hatch-step fill pattern in `color`: the graphics ramp (shade.js ISO_STYLE,
// 45° lines 4 px wide every 24, 12 or 8 px) in emulated pixels, one pattern
// pixel per emulated pixel, slid by `shift` px. 24 is a whole period of every
// step, so a 24 x 24 tile repeats seamlessly.
const hatchTiles = new Map();
let tilesRev = 0; // the shading style the tiles were drawn in
function hatchPattern(ctx, color, step, shift, ps) {
  if (tilesRev !== styleRev) { hatchTiles.clear(); tilesRev = styleRev; }
  const key = `${color}|${step}`;
  let tile = hatchTiles.get(key);
  if (!tile) {
    tile = document.createElement("canvas");
    tile.width = tile.height = 24;
    const c = tile.getContext("2d"), spec = ISO_STYLE.hatch, t = stepTone(spec, step);
    c.fillStyle = color;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (hatchInk(spec, t, x + 0.5, y + 0.5)) c.fillRect(x, y, 1, 1);
    hatchTiles.set(key, tile);
  }
  const pat = ctx.createPattern(tile, "repeat");
  pat.setTransform(new DOMMatrix().scale(ps).translate(shift, 0));
  return pat;
}

// Runs fn clipped to item.clip (document space), if it has one.
function clipped(ctx, item, fn) {
  if (!item.clip) return fn();
  const c = item.clip;
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.w, c.h);
  ctx.clip();
  fn();
  ctx.restore();
}

export function selectionRects() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return [];
  const rects = [];
  for (let i = 0; i < sel.rangeCount; i++) {
    for (const r of sel.getRangeAt(i).getClientRects()) rects.push(toDoc(r));
  }
  return rects;
}

// Draws one frame. ctx is the low-res canvas; colors are display-space CSS colors.
export function draw(ctx, layout, selection, { pixelSize, renderY, colors }) {
  const { width, height } = ctx.canvas;
  const ps = pixelSize;
  const top = renderY;
  const bottom = renderY + height * ps;
  const visible = (y, h = 0) => y + h >= top && y <= bottom;
  const snap = (v) => Math.round(v / ps) * ps; // align edges to emulated pixels

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(1 / ps, 0, 0, 1 / ps, 0, -renderY / ps);

  const drawFills = (list) => { for (const f of list) {
    if (!visible(f.y, f.h)) continue;
    const rect = [snap(f.x), snap(f.y), snap(f.w), snap(f.h)];
    clipped(ctx, f, () => {
      // Translucent fills are drawn opaque, pre-blended over the ground, so the
      // sharpText threshold (which drops coverage under 50%) keeps them.
      if (f.alpha < 1) {
        ctx.fillStyle = colors.ground;
        ctx.fillRect(...rect);
        ctx.globalAlpha = f.alpha;
      }
      ctx.fillStyle = f.hatch ? hatchPattern(ctx, colors[f.ink], f.hatch, f.shift, ps) : colors[f.ink];
      if (f.radius.some((r) => r > 0)) { ctx.beginPath(); ctx.roundRect(...rect, f.radius); ctx.fill(); } else ctx.fillRect(...rect);
      ctx.globalAlpha = 1;
    });
  } };
  drawFills(layout.fills);

  for (const t of layout.tabs) {
    if (!visible(t.y, t.h)) continue;
    const x = snap(t.x), y = snap(t.y), w = snap(t.w), h = snap(t.h);
    if (t.fill) {
      ctx.fillStyle = colors[t.fill];
      tabPath(ctx, x, y, w, Math.min(h, t.header), t.header, t.flap);
      ctx.fill();
    }
    // Stroke inside the shape, rounded up to whole emulated pixels like boxes.
    const lw = Math.max(1, Math.ceil(t.line / ps - 0.01)) * ps;
    ctx.lineWidth = lw;
    ctx.strokeStyle = colors[t.ink];
    tabPath(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, t.header - lw, t.flap);
    ctx.stroke();
  }

  const drawBoxes = (list) => { for (const b of list) {
    if (!visible(b.y, b.h)) continue;
    // CSS border width, rounded up to whole emulated pixels (min 1), drawn inside the box.
    const lw = Math.max(1, Math.ceil(b.line / ps - 0.01)) * ps;
    ctx.lineWidth = lw;
    ctx.strokeStyle = colors[b.ink];
    ctx.setLineDash(b.dashed ? [lw * 3, lw * 2] : []);
    clipped(ctx, b, () => {
      ctx.beginPath();
      ctx.roundRect(snap(b.x) + lw / 2, snap(b.y) + lw / 2, Math.max(0, snap(b.w) - lw), Math.max(0, snap(b.h) - lw), Math.min(b.radius, b.w / 2, b.h / 2));
      ctx.stroke();
    });
  }
  ctx.lineWidth = ps;
  ctx.setLineDash([]); };
  drawBoxes(layout.boxes);

  for (const im of layout.images) {
    if (!visible(im.y, im.h) || !im.el.complete || !im.el.naturalWidth) continue;
    clipped(ctx, im, () => ctx.drawImage(tinted(im.el, im.w, im.h, colors[im.ink]), im.x, im.y, im.w, im.h));
  }

  for (const g of layout.graphics) {
    if (!visible(g.y, g.h)) continue;
    clipped(ctx, g, () => drawGraphic(ctx, { ...g, x: snap(g.x), y: snap(g.y) }, ps, g.u, colors));
  }

  // A shape with data-fill-ink (an ink name) is filled with it under its stroke.
  const drawPaths = (list) => { for (const p of list) {
    ctx.lineWidth = p.weight ? Math.max(ps, snap(p.weight * layout.u)) : ps;
    ctx.strokeStyle = colors[p.ink];
    clipped(ctx, p, () => {
      ctx.beginPath();
      p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (p.fill) { ctx.fillStyle = colors[p.fill]; ctx.fill(); }
      ctx.stroke();
    });
  }
  ctx.lineWidth = ps; };
  drawPaths(layout.paths);

  // Genie blocks in motion (0 < t < 1) are drawn offscreen and warped; at
  // t = 1 they're in the sink and draw nothing; at 0 they draw as normal words.
  const now = performance.now();
  const genieTs = (layout.genies ?? []).map((g) => genieT(g.el, now));
  const plain = (w) => !(w.genie >= 0 && genieTs[w.genie] > 0);

  const drawWords = (colorOf, keep = plain, c = ctx, list = layout.words) => {
    c.textBaseline = "alphabetic";
    for (const w of list) {
      if (!keep(w) || !visible(w.baseline - 200, 400)) continue;
      setFont(c, w.font);
      if ("letterSpacing" in c) c.letterSpacing = w.spacing ?? "0px";
      c.fillStyle = colorOf(w);
      clipped(c, w, () => {
        c.fillText(w.text, w.x, w.baseline);
        if (w.underline) c.fillRect(w.x, snap(w.baseline + ps), c.measureText(w.text).width, ps);
      });
    }
  };
  drawWords((w) => colors[w.ink]);

  layout.genies?.forEach((g, i) => {
    const t = genieTs[i];
    if (t <= 0 || t >= 1 || !g.sink) return;
    const off = offscreen(ctx.canvas);
    off.setTransform(1, 0, 0, 1, 0, 0);
    off.clearRect(0, 0, width, height);
    off.setTransform(1 / ps, 0, 0, 1 / ps, 0, -renderY / ps);
    drawWords((w) => colors[w.ink], (w) => w.genie === i, off);
    const toPx = (x) => x / ps, toPy = (y) => (y - renderY) / ps;
    const S = g.sink;
    // The spine swings away from the sink's side: as tuned for a sink on the
    // right, mirrored for one on the left (slides, under the text axis).
    const side = S.x + S.w / 2 < g.x + g.w / 2 ? -1 : 1;
    warpBlock(ctx, off.canvas,
      { x0: toPx(g.x), x1: toPx(g.x + g.w), y0: toPy(g.y), y1: toPy(g.y + g.h), lines: g.lines.map((l) => ({ y0: toPy(l.y0), y1: toPy(l.y1) })) },
      { x0: toPx(S.x), x1: toPx(S.x + S.w), y: Math.round(toPy(S.y)) }, t, (side * genieSettings.swing * layout.u) / ps,
      g.bounds && { x0: Math.ceil(toPx(g.bounds.x0)), x1: Math.floor(toPx(g.bounds.x1)) });
  });

  // The top layer ([data-top]: slide 4's NEW! badge): drawn last, over every
  // other fill, box, shape and word, so it covers what's under it.
  if (layout.top) {
    drawFills(layout.top.fills);
    drawBoxes(layout.top.boxes);
    drawPaths(layout.top.paths);
    drawWords((w) => colors[w.ink], () => true, ctx, layout.top.words);
  }

  // Selection is the inverse: a block of the main ink with the selected text
  // knocked out in the ground colour (every ink inverts to ground).
  const sel = selection.filter((r) => visible(r.y, r.h));
  if (sel.length) {
    ctx.save();
    ctx.beginPath();
    for (const r of sel) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.fillStyle = colors.ink;
    for (const r of sel) ctx.fillRect(r.x, r.y, r.w, r.h);
    drawWords(() => colors.ground);
    ctx.restore();
  }
}
