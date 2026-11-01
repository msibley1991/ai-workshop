// Reads layout from the invisible DOM and redraws it into a low-res 2D canvas.
// measure() is expensive (one Range per word) and runs only when layout changes;
// draw() runs every frame and only translates by the render scroll offset.

const inkOf = (el) => el.closest?.("[data-ink]")?.dataset.ink ?? "phosphor";
const ascentCache = new Map();

function fontOf(style) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function ascentOf(ctx, font) {
  if (!ascentCache.has(font)) {
    ctx.font = font;
    ascentCache.set(font, ctx.measureText("Hg").fontBoundingBoxAscent);
  }
  return ascentCache.get(font);
}

// Document-space rects (client rect + scroll) so scrolling never requires re-measuring.
const toDoc = (r) => ({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height });

export function measure(root, ctx) {
  ascentCache.clear();
  const words = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest("svg")) continue;
    const style = getComputedStyle(parent);
    const font = fontOf(style);
    const ascent = ascentOf(ctx, font);
    const ink = inkOf(parent);
    for (const m of node.data.matchAll(/\S+/g)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      if (rects.length === 1) {
        const r = toDoc(rects[0]);
        words.push({ text: m[0], x: r.x, baseline: r.y + ascent, font, ink });
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
          segment.text += m[0][i];
        } else {
          segment = { text: m[0][i], x: r.x, top: r.y, baseline: r.y + ascent, font, ink };
          words.push(segment);
        }
      }
    }
  }

  const boxes = [...root.querySelectorAll("[data-box]")].map((el) => ({ ...toDoc(el.getBoundingClientRect()), ink: inkOf(el) }));
  const fills = [...root.querySelectorAll("[data-fill]")].map((el) => ({ ...toDoc(el.getBoundingClientRect()), ink: inkOf(el) }));

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

  return { words: words.concat(bullets), boxes, fills, paths };
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

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = colors.accent;
  for (const r of selection) if (visible(r.y, r.h)) ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalAlpha = 1;

  for (const f of layout.fills) {
    if (!visible(f.y, f.h)) continue;
    ctx.fillStyle = colors[f.ink];
    ctx.fillRect(snap(f.x), snap(f.y), snap(f.w), snap(f.h));
  }

  ctx.lineWidth = ps;
  for (const b of layout.boxes) {
    if (!visible(b.y, b.h)) continue;
    ctx.strokeStyle = colors[b.ink];
    ctx.strokeRect(snap(b.x) + ps / 2, snap(b.y) + ps / 2, snap(b.w) - ps, snap(b.h) - ps);
  }

  for (const p of layout.paths) {
    ctx.strokeStyle = colors[p.ink];
    ctx.beginPath();
    p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  ctx.textBaseline = "alphabetic";
  for (const w of layout.words) {
    if (!visible(w.baseline - 200, 400)) continue;
    ctx.font = w.font;
    ctx.fillStyle = colors[w.ink];
    ctx.fillText(w.text, w.x, w.baseline);
  }
}
