// N04's picture of how AI generates: a prompt with a gap, the candidate next
// tokens with their chances (illustrative numbers), and a weighted pick.
// Design units; drawn by js/nora/stage.js.
//   beat 0: the prompt box opens (grows from its top-left, then its text wipes in).
//   beat 1: the bars grow in, longest first.
//   beat 2: a marker runs down the bars, slows and lands on one token, picked
//           by weighted chance for real; it drops into the gap in accent. Then
//           "Run again" appears: a real button, and every click picks again.
const TOKENS = [["modern", 38], ["clean", 24], ["playful", 15], ["bold", 12], ["calm", 11]];
const ROW0 = 136, ROW = 44, BAR_X = 128, BAR_K = 10.5, BAR_H = 20;
const ROLL_MS = 1400, TEXT_MS = 900; // a pick; the wait for the sentence before the first one
const BTN = { x: 0, y: 392, w: 176, h: 56 };
const clamp = (v) => Math.max(0, Math.min(1, v));
function pick() {
  let r = Math.random() * 100;
  for (let i = 0; i < TOKENS.length; i++) if ((r -= TOKENS[i][1]) < 0) return i;
  return 0;
}

export default {
  size: [640, 456],
  enter: "own",
  draw(S, d) {
    const { P, u, s } = S, b = S.beat, m = S.mem;
    const open = S.to("open", 1, 800, 0, 0), grow = clamp(open * 2), wipe = clamp(open * 2 - 1);
    const [bx, by] = P(BTN.x, BTN.y), bw = BTN.w * s, bh = BTN.h * s;
    const over = (p) => !!p && p[0] >= bx && p[0] <= bx + bw && p[1] >= by && p[1] <= by + bh;

    // The pick: which token, and where the marker is on its way there.
    if (b < 2) { m.roll = null; m.runs = []; }
    else if (!m.roll) m.roll = { t0: S.now + (S.dir > 0 && S.motion ? TEXT_MS : 0), i: pick() };
    let p = m.roll ? (S.motion ? clamp((S.now - m.roll.t0) / ROLL_MS) : 1) : 0;
    const pressed = S.press.n !== m.press; m.press = S.press.n;
    if (pressed && m.roll && p >= 1 && over([S.press.x, S.press.y])) { m.roll = { t0: S.now, i: pick() }; p = S.motion ? 0 : 1; }
    const started = !!m.roll && S.now >= m.roll.t0, landed = !!m.roll && p >= 1;
    const steps = m.roll ? 2 * TOKENS.length + m.roll.i : 0;      // twice round, then on to the pick
    const at = started ? Math.round(steps * (1 - (1 - p) ** 2)) % TOKENS.length : -1; // slowing as it goes
    if (landed && !m.roll.logged) { m.roll.logged = true; (m.runs ??= []).push(TOKENS[m.roll.i][0]); }

    // The prompt, with its gap.
    d.text(...P(0, 0), "You");
    d.rect(...P(0, 32), 640 * s * grow, 64 * s * grow);
    if (wipe > 0) d.clipped([...P(0, 32), 640 * s, 64 * s * wipe], () => {
      const lead = "Make the landing page feel ", [x, y] = P(20, 64), wx = x + S.width(lead), word = landed ? TOKENS[m.roll.i][0] : "";
      d.text(x, y, lead, { ay: 0.5 });
      if (word) d.text(wx, y, word, { ink: "accent", ay: 0.5 });
      d.line([[wx, y + 18 * u], [wx + Math.max(96 * u, S.width(word)), y + 18 * u]], { ink: "accent", w: 2 });
    });

    // The candidates.
    const bars = S.to("bars", b >= 1 ? 1 : 0, 800, S.dir > 0 ? 400 : 0);
    if (bars > 0) {
      TOKENS.forEach(([token, pct], i) => {
        const k = clamp(bars * 2 - i * 0.25), y = ROW0 + i * ROW, hit = landed && i === m.roll.i, ink = hit ? "accent" : "ink";
        if (k <= 0) return;
        d.fill(...P(BAR_X, y), pct * BAR_K * s * k, BAR_H * s, { ink, r: 2 });
        if (k < 1) return;
        d.text(...P(20, y + BAR_H / 2), token, { ink, cls: "nora-code", ay: 0.5 });
        d.text(...P(BAR_X + pct * BAR_K + 12, y + BAR_H / 2), `${pct}%`, { cls: "nora-code", ay: 0.5 });
        if (i === at) { // the marker: a solid accent arrowhead, pointing at the row
          const [mx, my] = P(BAR_X + pct * BAR_K + 84, y + BAR_H / 2), r = 10 * u;
          d.line([[mx, my], [mx + 1.6 * r, my - r], [mx + 1.6 * r, my + r], [mx, my]], { ink: "accent", w: 2, fill: "accent" });
        }
      });
      if (bars >= 1) d.text(...P(20, ROW0 + TOKENS.length * ROW), "illustrative", { cls: "nora-code" });
    }

    // Run again, once the first pick has landed, and the last three runs beside it.
    if (b >= 2 && m.runs?.length) {
      const on = over(S.pointer);
      if (on) d.fill(bx, by, bw, bh, { r: 8 });
      d.rect(bx, by, bw, bh);
      d.text(bx + bw / 2, by + bh / 2, "Run again", { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
      const n = m.runs.length;
      m.runs.slice(-3).forEach((word, i) => d.text(...P(BTN.x + BTN.w + 32, BTN.y - 20 + i * 32), `run ${Math.max(1, n - 2) + i} ${word}`, { cls: "nora-code" }));
    }
  },
};
