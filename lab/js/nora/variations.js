// N14's three designs side by side: the target and two variations of it, as
// two-colour screenshots (assets/slides/) in the slide's slots. Drawn by
// js/nora/stage.js in the scene's px.
//   beat 0: the target's frame opens.
//   beat 1: the two variations open beside it, 200 apart.
// Under them, a real button opens the page that holds all three.
const FRAMES = [["v-play", "the target", 0], ["v-base", "variation 1", 1], ["v-run", "variation 2", 1]];
const ALL = "https://claude.ai/artifact/T2pLvDdrP3huNDPoPm2G6L";
const GUTTER = 16, TOP = 40, BAR = 24;
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [688, 752],
  enter: "own",
  draw(S, d) {
    const { u } = S, g = GUTTER * u, w = (S.W - 2 * g) / 3, top = TOP * u, h = Math.min(S.H - top - 80 * u, 520 * u), bar = BAR * u;
    FRAMES.forEach(([slot, name, beat], i) => {
      const k = S.to(slot, S.beat >= beat ? 1 : 0, 800, beat && S.dir > 0 ? 400 + (i - 1) * 200 : 0, 0), grow = clamp(k * 2), wipe = clamp(k * 2 - 1);
      const x = i * (w + g);
      if (wipe < 1) d.slot(slot, 0, 0, 0, 0); else d.slot(slot, x, top + bar, w, h - bar);
      if (k <= 0) return;
      d.text(x, 0, name);
      d.rect(x, top, w * grow, h * grow);
      if (wipe > 0) d.clipped([x, top, w, h * wipe], () => d.fill(x, top, w, bar, { r: 8 }));
    });
    if (S.to("v-run", S.beat >= 1 ? 1 : 0, 800) < 1) return;
    const label = "Open the variations", bw = S.width(label) + 32 * u, bh = 48 * u, by = top + h + 16 * u;
    const on = !!S.pointer && S.pointer[0] >= 0 && S.pointer[0] <= bw && S.pointer[1] >= by && S.pointer[1] <= by + bh;
    if (on) d.fill(0, by, bw, bh, { r: 8 });
    d.rect(0, by, bw, bh, { w: 2 });
    d.text(bw / 2, by + bh / 2, label, { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
    d.hit(0, by, bw, bh, () => window.open(ALL, "_blank", "noopener"));
  },
};
