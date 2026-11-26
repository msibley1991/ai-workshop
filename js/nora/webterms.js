// N15's small dictionary: a design word, what the web calls it, and an
// example from today's prompts. Design units; drawn by js/nora/stage.js.
// The header is there on arrival; the rows wipe in downward one after another,
// 150 apart, by themselves.
const ROWS = [
  ["Colour", "hex code", "#B2E64F"],
  ["Type", "font-weight", "300, 700"],
  ["Layout", "grid, columns, gap", "12 cols, 14px"],
  ["Spacing", "padding, margin", "28px"],
  ["Shape", "border-radius", "28px"],
  ["Motion", "transition, ease-out", "0.25s"],
  ["Responsive", "breakpoint", "below 900px"],
  ["Interaction", "hover", "scale 1.05"],
];
const COLS = [0, 196, 448], HEAD = ["Design word", "On the web", "Example"], ROW = 52, TOP = 56, STAGGER = 150, WIPE = 400;
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [640, 480],
  enter: "own",
  draw(S, d) {
    const { P, s } = S;
    HEAD.forEach((h, c) => d.text(...P(COLS[c], 0), h, { ink: "accent" }));
    d.line([P(0, 40), P(640, 40)], { reveal: S.to("rule", 1, 400, 0, 0) });
    const total = (ROWS.length - 1) * STAGGER + WIPE, t = S.to("rows", 1, total, 500, 0) * total;
    ROWS.forEach((row, i) => {
      const k = clamp((t - i * STAGGER) / WIPE), y = TOP + i * ROW;
      if (k <= 0) return;
      d.clipped([...P(0, y), 640 * s, ROW * s * k], () => {
        d.text(...P(COLS[0], y + 8), row[0]);
        d.text(...P(COLS[1], y + 8), row[1], { cls: "nora-code" });
        d.text(...P(COLS[2], y + 8), row[2], { ink: "accent", cls: "nora-code" });
      });
      if (k >= 1) d.line([P(0, y + ROW - 4), P(640, y + ROW - 4)], { w: 2 });
    });
  },
};
