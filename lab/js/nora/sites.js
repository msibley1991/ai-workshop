// N09's three neighbours: three flat figures (a ball for the head, half a ball
// for the body), each at its own screen. Drawn by js/nora/stage.js under the
// slide's prompt, on its right half (the statement stands on the left), three
// across.
//   beat 2 "look left and right": the screens open one after another, 150
//           apart (each grows from its top-left, 300), the figures cut in, and
//           their heads turn: left, ahead, right, ahead, on a loop. The middle
//           one turns the other way, so neighbours look at each other.
//           A few seconds later a different page wipes into each screen,
//           downward (400), 200 apart: same words, different sites.
// Flat for now: hatched 3D figures would need a new shape in Max's engine.
const GAP = 16, SCREEN_H = 120, HEAD = 22, BODY = 46, STAGGER = 150, OPEN = 300;
const FILL_AFTER = 3200;                    // the pages come this long after the beat
const LOOK_MS = 900, LOOKS = [-1, 0, 1, 0]; // each look's hold; where the head points
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export default {
  size: [688, 752],
  enter: "own",
  draw(S, d) {
    const { u } = S, b = S.beat, prompt = S.slide.querySelector(".artefact");
    const total = 2 * STAGGER + OPEN, t = S.to("people", b >= 2 ? 1 : 0, total, S.dir > 0 ? 800 : 0) * total;
    if (!prompt || t <= 0) return;
    // The right six columns, from just under the prompt and its buttons.
    const g = GAP * u, left = (S.W + g) / 2, w = ((S.W - g) / 2 - 2 * g) / 3, sh = SCREEN_H * u, top = S.rel(prompt.getBoundingClientRect()).bottom + 40 * u;
    const filled = S.to("filled", b >= 2 ? 1 : 0, 2 * 200 + 400, S.dir > 0 ? FILL_AFTER : 0, 0) * 800; // starts empty
    // Three pages for one brief: where the heading, the picture and the form land.
    const pages = [
      (x, y) => { d.fill(x + 12 * u, y + 24 * u, w * 0.5, 8 * u); d.fill(x + 12 * u, y + 42 * u, w - 24 * u, 36 * u, { hatch: 2 }); d.rect(x + 12 * u, y + 88 * u, 56 * u, 20 * u, { w: 2, r: 4 }); },
      (x, y) => { d.fill(x + 12 * u, y + 24 * u, w * 0.36, 60 * u, { hatch: 3 }); d.fill(x + w * 0.5, y + 28 * u, w * 0.4, 8 * u); d.fill(x + w * 0.5, y + 46 * u, w * 0.3, 6 * u); d.rect(x + w * 0.5, y + 64 * u, 48 * u, 20 * u, { w: 2, r: 10 }); },
      (x, y) => { d.fill(x + w * 0.25, y + 26 * u, w * 0.5, 10 * u); for (let i = 0; i < 3; i++) d.rect(x + 12 * u + i * ((w - 24 * u) / 3), y + 50 * u, (w - 40 * u) / 3, 56 * u, { w: 2, r: 4 }); },
    ];
    // Where the heads point (-1 left, 1 right), eased between looks.
    const look = (() => {
      if (S.loop == null) return 0;
      const n = Math.floor(S.loop / LOOK_MS), p = (S.loop % LOOK_MS) / LOOK_MS, from = LOOKS[n % LOOKS.length], to = LOOKS[(n + 1) % LOOKS.length];
      return from + (to - from) * ease(clamp((p - 0.6) / 0.4)); // hold, then turn
    })();

    for (let i = 0; i < 3; i++) {
      const k = clamp((t - i * STAGGER) / OPEN);
      if (k <= 0) continue;
      const x = left + i * (w + g), cx = x + w / 2;
      d.rect(x, top, w * k, sh * k, { w: 2 });
      if (k < 1) continue;
      d.fill(x, top, w, 12 * u, { r: 8 });
      const wipe = clamp((filled - i * 200) / 400);
      if (wipe > 0) d.clipped([x, top, w, sh * wipe], () => pages[i](x, top));
      // The figure, facing us from in front of its screen.
      const hy = top + sh + 16 * u + HEAD * u, by = hy + HEAD * u + 4 * u + BODY * u, r = BODY * u, turn = look * (i === 1 ? -1 : 1);
      d.line([...Array.from({ length: 17 }, (_, n) => [cx - r * Math.cos((n / 16) * Math.PI), by - r * Math.sin((n / 16) * Math.PI)]), [cx - r, by]], { w: 2, fill: "ink" });
      d.circle(cx, hy, HEAD * u, { fill: "ground" });
      for (const side of [-1, 1]) d.circle(cx + turn * 9 * u + side * 6 * u * (1 - 0.4 * Math.abs(turn)), hy - 2 * u, 2.5 * u, { w: 2, fill: "ink" });
    }
  },
};
