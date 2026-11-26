// N06's target: the finished site in a frame. Design units; drawn by
// js/nora/stage.js. The site is a full-length screenshot of the play page,
// thresholded to two colours (assets/slides/target-play-ink.png), in the
// slide's [data-nora-slot="shot"].
//   beat 1: the frame opens (it grows from its top-left, 400, then its content
//           wipes in downward, 400). The page then steps down a screen at a
//           time to its foot and back to the top, holding each for 2.5 s:
//           cuts, because a smooth scroll smears in the display's trails. Under the frame, a real
//           button opens the live site in a new tab.
const FRAME = { w: 640, h: 560, bar: 32 };
const SHOT_RATIO = 2100 / 1100;      // the screenshot's height over its width
const HOLD_MS = 2500, STEP = 0.8;    // each screen's hold; how much of the frame a step moves
const LIVE = "https://claude.ai/artifact/NtnsoKzn6WSNavk4rGhY3N";
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [640, 640],
  enter: "own",
  draw(S, d) {
    const { P, s, u } = S, m = S.mem;
    const k = S.to("open", S.beat >= 1 ? 1 : 0, 800, S.dir > 0 ? 600 : 0, 0), grow = clamp(k * 2), wipe = clamp(k * 2 - 1);
    const [x, y] = P(0, 0), w = FRAME.w * s, h = FRAME.h * s, bar = FRAME.bar * s, view = h - bar;
    if (wipe < 1) { m.openAt = null; d.slot("shot", 0, 0, 0, 0); }
    if (k <= 0) return;
    d.rect(x, y, w * grow, h * grow);
    if (wipe > 0) d.clipped([x, y, w, h * wipe], () => d.fill(x, y, w, bar, { r: 8 }));
    if (wipe < 1) return;
    // The page, a screen at a time.
    let shift = 0;
    if (S.loop != null) {
      m.openAt ??= S.loop;
      const travel = Math.max(0, w * SHOT_RATIO - view), stops = Math.ceil(travel / (view * STEP)) + 1;
      shift = Math.min(travel, (Math.floor((S.loop - m.openAt) / HOLD_MS) % stops) * view * STEP);
    }
    d.slot("shot", x, y + bar, w, view, shift);
    const label = "Open the live site", bw = S.width(label) + 32 * u, bh = 48 * u, by = y + h + 16 * u;
    const on = !!S.pointer && S.pointer[0] >= x && S.pointer[0] <= x + bw && S.pointer[1] >= by && S.pointer[1] <= by + bh;
    if (on) d.fill(x, by, bw, bh, { r: 8 });
    d.rect(x, by, bw, bh, { w: 2 });
    d.text(x + bw / 2, by + bh / 2, label, { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
    d.hit(x, by, bw, bh, () => window.open(LIVE, "_blank", "noopener"));
  },
};
