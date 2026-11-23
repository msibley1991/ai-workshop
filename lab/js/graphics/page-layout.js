// Flat demo: an old static website layout, redrawn as a wireframe of its
// structure. Regions are boxes, text is lines, the image is hatched. Labels sit
// off the hatching on the right and connect by cased leader lines, which
// always bend: each label sits above or below its anchor.
// Scene units; `part` groups shapes for focus and hover.
const lines = (x, y0, widths, part) =>
  widths.map((w, i) => ({ type: "rect", x, y: y0 + i * 24, w, h: 8, fill: "solid", outline: "none", part }));

// Shapes are written from the frame's corner; DX shifts them in from the span's edge.
const DX = 8;
const shift = (shapes) => shapes.map((sh) => ({ ...sh, x: sh.x + DX }));

export default {
  kind: "flat",
  size: [520, 560],   // design units; fitted to the span
  span: [3, 4],       // columns (graphic + captions)
  shapes: shift([
    { id: "frame", part: "page", type: "rect", x: 0, y: 24, w: 352, h: 512, fill: "none", outline: "outer", container: true }, // grows open first (graphicFramed)
    { id: "header", part: "header", type: "rect", x: 16, y: 40, w: 320, h: 56, fill: 2 },
    { id: "nav", part: "nav", type: "rect", x: 16, y: 112, w: 88, h: 352, fill: "none" },
    ...lines(32, 128, [56, 40, 56, 48], "nav"),
    { id: "content", part: "content", type: "rect", x: 120, y: 112, w: 216, h: 352, fill: "none" },
    { id: "image", part: "image", type: "rect", x: 136, y: 128, w: 184, h: 104, fill: 3 },
    ...lines(136, 248, [184, 168, 184, 120, 184, 152, 176], "content"),
    { id: "footer", part: "footer", type: "rect", x: 16, y: 480, w: 320, h: 40, fill: 1 },
  ]),
  labels: [
    { id: "header", for: "header", text: "Header", at: [384, 48], side: "right", anchor: [312, 80], hover: true },
    { id: "image", for: "image", text: "Image", at: [384, 168], side: "right", anchor: [304, 208], hover: true },
    { id: "nav", for: "nav", text: "Nav", at: [384, 296], side: "right", anchor: [68, 336], hover: true },
    { id: "content", for: "content", text: "Content", at: [384, 424], side: "right", anchor: [236, 448], hover: true },
    { id: "footer", for: "footer", text: "Footer", at: [384, 528], side: "right", anchor: [312, 496], hover: true },
  ],
  states: [
    {},
    { focus: "header", labels: ["header"] },
    { focus: "nav", labels: ["nav", "content"] },
    { focus: "image", loop: "blink", labels: ["image"] },
    { labels: ["header", "image", "nav", "content", "footer"] },
  ],
};
