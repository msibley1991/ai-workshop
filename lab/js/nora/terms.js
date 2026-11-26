// N14's turn from a vague request to exact words. Design units; drawn by
// js/nora/stage.js.
//   beat 0: a chat box opens with the vague request.
//   beat 1: an accent line strikes it through (400), then six terms open under
//           it, two across, 150 apart (each card grows from its top-left, then
//           its content wipes in): the design word, and one exact value for it
//           from today's prompts.
const TERMS = [["Colour", "#B2E64F"], ["Type", "Inter 300 / 700"], ["Grid", "12 columns, 14px gap"], ["Spacing", "28px padding"], ["Shape", "28px radius"], ["Motion", "0.25s, ease-out"]];
const REQUEST = "Make it modern and clean.";
const CARD = { w: 310, h: 88, gap: 20, top: 136 }, STAGGER = 150, OPEN = 600;
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [640, 440],
  enter: "own",
  draw(S, d) {
    const { P, s, u } = S, b = S.beat;
    const open = S.to("open", 1, 800, 0, 0), grow = clamp(open * 2), wipe = clamp(open * 2 - 1);
    d.text(...P(0, 0), "You");
    d.rect(...P(0, 32), 640 * s * grow, 64 * s * grow);
    const [tx, ty] = P(20, 64);
    if (wipe > 0) d.clipped([...P(0, 32), 640 * s, 64 * s * wipe], () => d.text(tx, ty, REQUEST, { ay: 0.5 }));

    const strike = S.to("strike", b >= 1 ? 1 : 0, 400, S.dir > 0 ? 500 : 0);
    if (strike > 0) d.line([[tx - 8 * u, ty], [tx + S.width(REQUEST) + 8 * u, ty]], { ink: "accent", reveal: strike });

    const total = (TERMS.length - 1) * STAGGER + OPEN, t = S.to("terms", b >= 1 ? 1 : 0, total, S.dir > 0 ? 1000 : 0) * total;
    TERMS.forEach(([term, value], i) => {
      const k = clamp((t - i * STAGGER) / OPEN), g = clamp(k * 2), w = clamp(k * 2 - 1);
      if (k <= 0) return;
      const [x, y] = P((i % 2) * (CARD.w + CARD.gap), CARD.top + Math.floor(i / 2) * (CARD.h + CARD.gap)), cw = CARD.w * s, ch = CARD.h * s;
      d.rect(x, y, cw * g, ch * g, { w: 2 });
      if (w > 0) d.clipped([x, y, cw, ch * w], () => {
        d.text(x + 16 * u, y + 10 * u, term);
        d.text(x + 16 * u, y + 44 * u, value, { ink: "accent", cls: "nora-code" });
      });
    });
  },
};
