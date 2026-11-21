// Reads layout from the invisible DOM and redraws it into a low-res 2D canvas.
// measure() is expensive (one Range per word) and runs only when layout changes;
// draw() runs every frame and only translates by the render scroll offset.

import { mountGraphic, drawGraphic } from "./graphic.js";
import { genieT, warpBlock, setLines, sinkOf, settings as genieSettings } from "./genie-warp.js";

// Ink comes from the CSS custom property --ink (so states like :hover can set it),
// else the nearest data-ink attribute, else phosphor.
const inkOf = (el, style = getComputedStyle(el)) =>
  style.getPropertyValue("--ink").trim() || el.closest?.("[data-ink]")?.dataset.ink || "phosphor";
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

// [data-clip]: anything inside is drawn clipped to that element's rect.
function clipper() {
  const cache = new Map();
  return (el) => {
    const c = el.closest?.("[data-clip]");
    if (!c) return null;
    if (!cache.has(c)) cache.set(c, toDoc(c.getBoundingClientRect()));
    return cache.get(c);
  };
}

export function measure(root, ctx) {
  ascentCache.clear();
  const clipOf = clipper();
  const words = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  // [data-genie]: a text block that can genie into its panel's bottom-right
  // corner (js/genie-warp.js). Its words carry the block's index.
  const genieEls = [...root.querySelectorAll("[data-genie]")];
  const genieOf = (el) => genieEls.indexOf(el.closest("[data-genie]"));

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("svg")) continue;
    const style = getComputedStyle(parent);
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
        words.push({ text: tx(m[0], true), x: r.x, baseline: r.y + ascent, font, spacing, ink, clip, underline, genie });
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
          segment = { text: tx(m[0][i], i === 0), x: r.x, top: r.y, baseline: r.y + ascent, font, spacing, ink, clip, underline, genie };
          words.push(segment);
        }
      }
    }
  }

  // Boxes pick up CSS border-radius and dashed borders.
  const boxes = [...root.querySelectorAll("[data-box]")].map((el) => {
    const style = getComputedStyle(el);
    return {
      ...toDoc(el.getBoundingClientRect()),
      ink: inkOf(el, style),
      clip: clipOf(el),
      radius: parseFloat(style.borderTopLeftRadius) || 0,
      line: parseFloat(style.borderTopWidth) || 1,
      dashed: style.borderTopStyle === "dashed",
    };
  });
  // img[data-draw]: the image is stretched to its box and tinted with its ink.
  // Hidden images (display: none) have no size and are skipped.
  const images = [...root.querySelectorAll("img[data-draw]")]
    .map((el) => ({ ...toDoc(el.getBoundingClientRect()), el, ink: inkOf(el), clip: clipOf(el) }))
    .filter((im) => im.w > 0 && im.h > 0);
  // [data-fill]: CSS --fill-alpha (0..1, default 1) sets its opacity. Hidden fills are skipped.
  const fills = [...root.querySelectorAll("[data-fill]")]
    .map((el) => {
      const style = getComputedStyle(el);
      const alpha = parseFloat(style.getPropertyValue("--fill-alpha"));
      return { ...toDoc(el.getBoundingClientRect()), ink: inkOf(el, style), clip: clipOf(el), alpha: Number.isNaN(alpha) ? 1 : alpha };
    })
    .filter((f) => f.w > 0 && f.h > 0 && f.alpha > 0)
    .sort((a, b) => (b.alpha < 1) - (a.alpha < 1)); // translucent first, under solid fills

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
  const graphics = [...root.querySelectorAll("[data-graphic]")]
    .map((el) => {
      mountGraphic(el);
      const u = parseFloat(getComputedStyle(el).getPropertyValue("--u")) || 1;
      return { ...toDoc(el.getBoundingClientRect()), el, u, clip: clipOf(el) };
    })
    .filter((g) => g.w > 0 && g.h > 0);

  const bullets = [...root.querySelectorAll("li")].map((li) => {
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
    paths.push({ points, ink: shape.dataset.ink ?? inkOf(shape.closest("svg")) });
  }

  // Genie blocks: the box around their text (not the element, which may be a
  // wide grid cell), its line bands (each text node's line fragments, merged
  // by top), and its panel's box and line width (the sink is the panel's
  // inner bottom-right corner).
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
    const panelEl = el.closest(".site-panel") ?? el;
    const panel = toDoc(panelEl.getBoundingClientRect());
    const line = parseFloat(getComputedStyle(panelEl).getPropertyValue("--line")) || 1;
    return { el, ...box, lines, panel, line };
  });
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;

  tintCache.clear();
  return { words: words.concat(bullets), boxes, fills, paths, images, tabs, graphics, genies, u };
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
export function draw(ctx, layout, selection, { pixelScale, renderY, colors }) {
  const { width, height } = ctx.canvas;
  const ps = pixelScale;
  const top = renderY;
  const bottom = renderY + height * ps;
  const visible = (y, h = 0) => y + h >= top && y <= bottom;
  const snap = (v) => Math.round(v / ps) * ps; // align edges to emulated pixels

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(1 / ps, 0, 0, 1 / ps, 0, -renderY / ps);

  for (const f of layout.fills) {
    if (!visible(f.y, f.h)) continue;
    const rect = [snap(f.x), snap(f.y), snap(f.w), snap(f.h)];
    clipped(ctx, f, () => {
      // Translucent fills are drawn opaque, pre-blended over the ground, so the
      // hardText threshold (which drops coverage under 50%) keeps them.
      if (f.alpha < 1) {
        ctx.fillStyle = colors.ground;
        ctx.fillRect(...rect);
        ctx.globalAlpha = f.alpha;
      }
      ctx.fillStyle = colors[f.ink];
      ctx.fillRect(...rect);
      ctx.globalAlpha = 1;
    });
  }

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

  for (const b of layout.boxes) {
    if (!visible(b.y, b.h)) continue;
    // CSS border width, rounded up to whole emulated pixels (min 1), drawn inside the box.
    const lw = Math.max(1, Math.ceil(b.line / ps - 0.01)) * ps;
    ctx.lineWidth = lw;
    ctx.strokeStyle = colors[b.ink];
    ctx.setLineDash(b.dashed ? [lw * 3, lw * 2] : []);
    clipped(ctx, b, () => {
      ctx.beginPath();
      ctx.roundRect(snap(b.x) + lw / 2, snap(b.y) + lw / 2, snap(b.w) - lw, snap(b.h) - lw, b.radius);
      ctx.stroke();
    });
  }
  ctx.lineWidth = ps;
  ctx.setLineDash([]);

  for (const im of layout.images) {
    if (!visible(im.y, im.h) || !im.el.complete || !im.el.naturalWidth) continue;
    clipped(ctx, im, () => ctx.drawImage(tinted(im.el, im.w, im.h, colors[im.ink]), im.x, im.y, im.w, im.h));
  }

  for (const g of layout.graphics) {
    if (!visible(g.y, g.h)) continue;
    clipped(ctx, g, () => drawGraphic(ctx, { ...g, x: snap(g.x), y: snap(g.y) }, ps, g.u, colors));
  }

  for (const p of layout.paths) {
    ctx.strokeStyle = colors[p.ink];
    ctx.beginPath();
    p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  // Genie blocks in motion (0 < t < 1) are drawn offscreen and warped; at
  // t = 1 they're in the sink and draw nothing; at 0 they draw as normal words.
  const now = performance.now();
  const genieTs = (layout.genies ?? []).map((g) => genieT(g.el, now));
  const plain = (w) => !(w.genie >= 0 && genieTs[w.genie] > 0);

  const drawWords = (colorOf, keep = plain, c = ctx) => {
    c.textBaseline = "alphabetic";
    for (const w of layout.words) {
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
    if (t <= 0 || t >= 1) return;
    const off = offscreen(ctx.canvas);
    off.setTransform(1, 0, 0, 1, 0, 0);
    off.clearRect(0, 0, width, height);
    off.setTransform(1 / ps, 0, 0, 1 / ps, 0, -renderY / ps);
    drawWords((w) => colors[w.ink], (w) => w.genie === i, off);
    const toPx = (x) => x / ps, toPy = (y) => (y - renderY) / ps;
    const S = sinkOf({ x: toPx(g.panel.x), y: toPy(g.panel.y), w: g.panel.w / ps, h: g.panel.h / ps }, g.line / ps, layout.u / ps);
    warpBlock(ctx, off.canvas,
      { x0: toPx(g.x), x1: toPx(g.x + g.w), y0: toPy(g.y), y1: toPy(g.y + g.h), lines: g.lines.map((l) => ({ y0: toPy(l.y0), y1: toPy(l.y1) })) },
      { x0: S.x0, x1: S.x1, y: Math.round(S.y) }, t, (genieSettings.arc * layout.u) / ps);
  });

  // Selection is the inverse: a block of the main ink with the selected text
  // knocked out in the ground colour (every ink inverts to ground).
  const sel = selection.filter((r) => visible(r.y, r.h));
  if (sel.length) {
    ctx.save();
    ctx.beginPath();
    for (const r of sel) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.fillStyle = colors.phosphor;
    for (const r of sel) ctx.fillRect(r.x, r.y, r.w, r.h);
    drawWords(() => colors.ground);
    ctx.restore();
  }
}
