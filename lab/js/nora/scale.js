// N01's balance scale: a beam on a post over a hatched base, a pan hanging
// from each end ("good", "bad"). Design units; drawn by js/nora/stage.js.
//   beat 0: the beam tips left and right on a lazy loop (4 s).
//   beat 1: it comes level and holds still.
//   beat 2: an accent connector runs from the base, under the statement, up to
//           the slide's [data-nora-target] word ("designers").
// data-after="stay" (default) keeps the scale through beat 2;
// data-after="leave" draws it off as the old lines go. `?scale=leave` or
// `?scale=stay` in the URL overrides it, to compare the two.
const PIVOT = [220, 40], HALF = 170, POST = 320, PAN = [50, 110];
const BASE = { x: 150, y: 360, w: 140, h: 24 };
const TILT = 4;          // degrees each way while it tips (motion.md, sway angle)
const REST = 4;          // the tilt it holds with motion off
const LOOP_MS = 4000;    // lazy
const TIP = 32;          // the chevron's tip, short of the word (graphics.md)
const TEXT_SWAP_MS = 1100; // the old lines out and the new one in, before the connector draws

export default {
  size: [440, 400],
  draw(S, d) {
    const { P, u } = S, b = S.beat;
    const after = new URLSearchParams(location.search).get("scale") ?? S.opts.after ?? "stay";
    const out = after === "leave" ? S.to("out", b >= 2 ? 1 : 0, 400) : 0;
    const reveal = 1 - out; // arriving and leaving the slide is the stage's wipe
    const level = S.to("level", b >= 1 ? 1 : 0, 400);
    const deg = (1 - level) * (S.loop == null ? REST : TILT * Math.sin((2 * Math.PI * S.loop) / LOOP_MS));
    const a = (deg * Math.PI) / 180, dx = HALF * Math.cos(a), dy = HALF * Math.sin(a);
    const ends = [[PIVOT[0] - dx, PIVOT[1] + dy], [PIVOT[0] + dx, PIVOT[1] - dy]]; // positive: the left end down

    const o = { reveal };
    d.line([P(...ends[0]), P(...ends[1])], o);
    d.line([P(...PIVOT), P(PIVOT[0], PIVOT[1] + POST)], o);
    // Pans hang straight down from the beam's ends.
    ends.forEach(([x, y], i) => {
      d.line([P(x, y), P(x + PAN[0], y + PAN[1]), P(x - PAN[0], y + PAN[1]), P(x, y)], o);
      if (reveal >= 1) d.text(...P(x, y + PAN[1] + 8), i ? "bad" : "good", { ax: 0.5 });
    });
    const [bx, by] = P(BASE.x, BASE.y), bw = BASE.w * S.s, bh = BASE.h * S.s;
    if (reveal >= 1) d.fill(bx, by, bw, bh, { hatch: 2, r: 8 });
    d.rect(bx, by, bw, bh, o);

    // Beat 2: the connector to the word, wherever the text has put it.
    const target = S.slide?.querySelector("[data-nora-target]");
    const conn = S.to("conn", b >= 2 ? 1 : 0, 800, S.dir > 0 ? TEXT_SWAP_MS : 0);
    if (!target || conn <= 0) return;
    const range = document.createRange();
    range.selectNodeContents(target);
    const word = S.rel(range.getBoundingClientRect());
    const start = P(PIVOT[0], BASE.y + BASE.h), tx = word.left + word.width / 4;
    const under = Math.max(word.bottom + 72 * u, start[1] + 48 * u); // the run under the statement
    d.connector([[start[0], start[1] + 8 * u], [start[0], under], [tx, under], [tx, word.bottom + TIP * u]], { ink: "accent", reveal: conn });
  },
};
