// Flat specimen for the playground's Shading tab: the tone steps side by side,
// from empty through hatch steps 1-3 to solid, each a box with the outer edge.
// It shows the shading style as it changes (docs/design-system/playground.md).
const STEP = 96, GAP = 16;
const fills = ["none", 1, 2, 3, "solid"];

export default {
  kind: "flat",
  size: [fills.length * STEP + (fills.length - 1) * GAP, STEP],
  span: [3, 6],
  shapes: fills.map((fill, i) => ({ id: `step-${i}`, type: "rect", x: i * (STEP + GAP), y: 0, w: STEP, h: STEP, fill, outline: "outer" })),
  states: [{}],
};
