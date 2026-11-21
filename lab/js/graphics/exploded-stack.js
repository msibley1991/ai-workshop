// Iso demo: a four-part stack that explodes, labels its parts, shows the pin's
// assembly path (dashed, with a flow packet) and focuses parts in turn.
// World units, y up. Parts are boxes { c: centre, s: size }; `explode` is the
// offset at explode = 1.
export default {
  kind: "iso",
  size: [520, 640],   // design units; fitted to the span
  span: [3, 4],       // columns (graphic + captions)
  origin: [260, 360], // world origin in the scene box
  scale: 96,          // units per world unit
  parts: [
    { id: "base", box: { c: [0, -0.6, 0], s: [2.4, 0.3, 2.4] }, explode: [0, -0.5, 0] },
    { id: "block", box: { c: [0, 0, 0], s: [1.4, 0.9, 1.4] } },
    { id: "cap", box: { c: [0, 0.55, 0], s: [1.4, 0.2, 1.4] }, explode: [0, 0.45, 0] },
    { id: "pin", box: { c: [0, 0.9, 0], s: [0.3, 0.5, 0.3] }, explode: [0, 1.0, 0] },
  ],
  connectors: [
    // Where the pin goes: hypothetical, so dashed.
    { id: "path", part: "pin", pts: [{ part: "pin", point: [0, -0.3, 0] }, { part: "cap", point: [0, 0.1, 0] }], dashed: true, end: "arrow" },
  ],
  // at: where the leader meets the label (scene units); side: which way the text runs.
  // Captions align per side (outermost x). anchor { part } lands on the part's
  // most visible plane; add point: [x, y, z] to pin it by hand.
  labels: [
    { id: "pin", for: "pin", text: "Pin", at: [430, 196], side: "right", anchor: { part: "pin" }, hover: true },
    { id: "cap", for: "cap", text: "Cap", at: [72, 268], side: "left", anchor: { part: "cap" }, hover: true },
    { id: "block", for: "block", text: "Block", at: [440, 360], side: "right", anchor: { part: "block" }, hover: true },
    { id: "base", for: "base", text: "Base", at: [64, 452], side: "left", anchor: { part: "base" }, hover: true },
  ],
  states: [
    { explode: 0, show: ["base", "block", "cap", "pin"] },
    { explode: 1, duration: 800, show: ["base", "block", "cap", "pin"], labels: ["base", "block", "cap", "pin"] },
    { explode: 1, focus: "pin", labels: ["pin"], flow: ["path"] },
    { explode: 1, focus: "cap", loop: "blink", labels: ["cap"], show: ["base", "block", "cap", "pin"] },
    { explode: 0, duration: 800, show: ["base", "block", "cap", "pin"], labels: ["base", "block", "cap", "pin"] },
  ],
};
