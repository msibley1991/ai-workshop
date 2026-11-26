// N02's speed comparison: two lanes from one start line, on one time axis.
// Design units; drawn by js/nora/stage.js.
//   Without AI (top):  Idea -> Sketch -> Mock-up -> a stretch of nudging
//                      -> Prototype, far right.
//   With AI (bottom):  Idea -> Sketch -> (Mock-up) -> AI -> Prototype. The
//                      mock-up is dashed: it can be part of the process, or
//                      skipped. Its prototype is there while the top lane is
//                      still nudging (the marker).
//   beat 0: the top lane (it wipes in with the scene); its rectangle twitches
//           and the counters tick up.
//   beat 1: the top lane holds still; the bottom lane's steps open 400 apart
//           (each box grows from its top-left corner, 400, then its content
//           wipes in downward, 400), then the marker draws.
//   beat 2: the prototype comes alive (the dot rides its wave) and the dashed
//           loop back to Sketch draws, then carries a packet round.
// The prototype's button is real: it inverts while the pointer is on it.
// Connectors follow graphics.md: 4 thick, an open chevron 32 tall, its tip 32
// short of what it points at; dashed means hypothetical.
const BH = 64, GAP = 64, TIP = 32;
const TOP = 40, BOT = 340;                         // each lane's boxes' top
// Each step: [x, width, name].
const LANE_TOP = [[0, 72, "Idea"], [136, 96, "Sketch"], [296, 120, "Mock-up"], [480, 240, ""], [784, 136, "Prototype"]];
const LANE_BOT = [[0, 72, "Idea"], [136, 96, "Sketch"], [296, 120, "Mock-up"], [480, 72, "AI"]];
const NUDGE = LANE_TOP[3];
const WIN = { x: 616, y: BOT, w: 216, h: 232, bar: 32 }; // the bottom lane's Prototype
const MARK_X = WIN.x - 16;                         // falls in the top lane's nudging
const STEP_MS = 400, TWITCH_MS = 500, TWITCH = [0, 3, 6, 3]; // the rectangle's steps, design units
const OPEN_MS = 2 * STEP_MS;                       // a step: grow, then wipe
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [920, 664],
  draw(S, d) {
    const { P, u, s } = S, b = S.beat;
    const label = (x, y, str, opts) => d.text(...P(x, y), str, opts);
    // The arrow into a step at x, from the step before it.
    const arrowIn = (x, y, k) => d.connector([P(x - GAP, y + BH / 2), P(x - TIP, y + BH / 2)], { ink: "accent", reveal: clamp(k * 4) });
    // A step (k 0..1): its arrow in and its box growing from its top-left
    // corner over the first half, its name wiping in downward over the second.
    const step = ([x, w, name], y, k, dash = false) => {
      if (k <= 0) return;
      const grow = clamp(k * 2), wipe = clamp(k * 2 - 1);
      if (x > 0) arrowIn(x, y, k);
      d.rect(...P(x, y), w * s * grow, BH * s * grow, { dash });
      if (wipe > 0 && name) d.clipped([...P(x, y), w * s, BH * s * wipe], () => label(x + w / 2, y + BH / 2, name, { ax: 0.5, ay: 0.5 }));
    };

    // ---- Without AI ----
    label(0, 0, "Without AI");
    LANE_TOP.forEach((st) => step(st, TOP, 1));
    // The twitch and the counts run on beat 0 and hold where they stopped.
    if (b === 0 && S.loop != null) S.mem.n = Math.floor(S.loop / TWITCH_MS);
    const n = S.mem.n ?? 0, dx = b === 0 ? TWITCH[n % TWITCH.length] : 0;
    const [rx, ry] = P(NUDGE[0] + 16 + dx, TOP + 16), rw = 56 * s, rh = 32 * s;
    d.fill(rx, ry, rw, rh, { hatch: 2, r: 4 });
    d.rect(rx, ry, rw, rh, { w: 2, r: 4 });
    label(NUDGE[0] + 96, TOP + BH / 2, "+1mm", { cls: "nora-code", ay: 0.5 });
    [`nudge ×${47 + n}`, `export ×${12 + Math.floor(n / 4)}`, "\"is it working?\""].forEach((str, i) => label(WIN.x, TOP + BH + 12 + i * 32, str, { cls: "nora-code" }));

    // ---- With AI ----
    // Six items, each OPEN_MS long, starting STEP_MS apart.
    const total = 5 * STEP_MS + OPEN_MS, bot = S.to("bot", b >= 1 ? 1 : 0, total, S.dir > 0 ? 400 : 0);
    const seq = (i) => clamp((bot * total - i * STEP_MS) / OPEN_MS);
    if (bot > 0) label(0, BOT - 40, "With AI");
    LANE_BOT.forEach((st, i) => step(st, BOT, seq(i), st[2] === "Mock-up"));
    const wk = seq(4), wgrow = clamp(wk * 2), wwipe = clamp(wk * 2 - 1);
    if (wk > 0) {
      arrowIn(WIN.x, BOT, wk);
      d.rect(...P(WIN.x, WIN.y), WIN.w * s * wgrow, WIN.h * s * wgrow);
    }
    if (wwipe > 0) d.clipped([...P(WIN.x, WIN.y), WIN.w * s, WIN.h * s * wwipe], () => prototype(S, d, b >= 2));
    // The marker: the AI lane has a working prototype while the other is still nudging.
    const mk = seq(5);
    if (mk > 0) {
      d.line([P(MARK_X, TOP + BH + 4), P(MARK_X, BOT - 8)], { ink: "accent", reveal: mk, dash: true });
      if (mk >= 1) label(MARK_X + 12, BOT - 40, "first working prototype", { ink: "accent" });
    }

    // ---- The loop back to Sketch ----
    const lp = S.to("loop", b >= 2 ? 1 : 0, 800, S.dir > 0 ? 600 : 0);
    if (lp > 0) {
      const y = WIN.y + WIN.h + 40, from = WIN.x + WIN.w / 2, to = LANE_BOT[1][0] + LANE_BOT[1][1] / 2;
      const pts = [P(from, WIN.y + WIN.h + 2), P(from, y), P(to, y), P(to, BOT + BH + TIP)];
      d.connector(pts, { ink: "accent", reveal: lp, dash: true });
      if (lp >= 1) {
        label(to + 32, y + 8, "change it, see it again", { ink: "accent" });
        if (S.loop != null) { // a packet going round, 96 units a second
          const path = d.rounded(pts), [px, py] = d.along(path, ((S.loop / 1000) * 96 * u) / pathLength(path) % 1);
          d.fill(px - 4 * u, py - 4 * u, 8 * u, 8 * u, { ink: "accent" });
        }
      }
    }
  },
};

const pathLength = (pts) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// The prototype window's inside: a title bar, a hatched picture, a dot on a
// wave and a button. Alive: the dot rides the wave. The button answers the
// real pointer at any time: it inverts, and the picture's hatching thickens.
function prototype(S, d, alive) {
  const { P, u, s } = S, x = WIN.x, y = WIN.y;
  const [bx, by] = P(x, y);
  d.fill(bx, by, WIN.w * s, WIN.bar * s, { r: 8 });
  d.text(...P(x + 16, y + WIN.bar / 2), "Prototype", { ink: "ground", ay: 0.5 });
  const [qx, qy] = P(x + 32, y + WIN.bar + 136), qw = (WIN.w - 64) * s, qh = 44 * s;
  const on = !!S.pointer && S.pointer[0] >= qx && S.pointer[0] <= qx + qw && S.pointer[1] >= qy && S.pointer[1] <= qy + qh;
  const [ix, iy] = P(x + 16, y + WIN.bar + 16), iw = (WIN.w - 32) * s, ih = 56 * s;
  d.fill(ix, iy, iw, ih, { hatch: on ? 3 : 1, r: 4 });
  d.rect(ix, iy, iw, ih, { w: 2, r: 4 });
  // The wave, dashed, and the dot on it.
  const wy = y + WIN.bar + 100, x0 = x + 16, span = WIN.w - 32;
  const wave = (k) => P(x0 + span * k, wy + 12 * Math.sin(k * 2 * Math.PI));
  d.line(Array.from({ length: 33 }, (_, i) => wave(i / 32)), { w: 2, dash: true });
  const t = alive && S.loop != null ? 0.5 - 0.5 * Math.cos((2 * Math.PI * (S.loop % 2000)) / 2000) : 0.5;
  d.circle(...wave(t), 8 * u, { w: 2, fill: "ink" });
  // The button.
  if (on) d.fill(qx, qy, qw, qh, { r: 8 });
  d.rect(qx, qy, qw, qh, { w: 2 });
  d.text(qx + qw / 2, qy + qh / 2, "hover me", { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
}
