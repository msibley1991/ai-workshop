// N05's three lanes: a request and three runs of it. Drawn by js/nora/stage.js
// in the scene's px: each lane takes 4 of the slide's 12 columns.
//   Code          the same square three times.
//   Vague prompt  three different sunsets.
//   Exact prompt  the same square three times; its exact values are in accent.
// Show, then tell: lane n opens on beat 2n, and its sentence pours in under it
// on the beat after (the slide's grid statement). Going forward, that second
// beat follows by itself, HOLD ms after the lane has opened, so each lane takes
// one press; going back, every beat is its own press.
//   a lane opening: its box grows from the top-left (400), its text wipes in
//   (400), then its runs appear one after another, 300 apart, each with its
//   caption centred under it. The three runs span the request box's width.
const LANES = [
  { title: "Code", code: true, lines: [[["width: 200px; height: 200px;"]], [["background: #2F6BF0;"]]] },
  { title: "Vague prompt", lines: [[["Make a beautiful sunset."]]] },
  { title: "Exact prompt", lines: [[["Make a "], ["200×200", "accent"], [" square,"]], [["fill "], ["#2F6BF0", "accent"], ["."]]] },
];
const GUTTER = 16, BOX_Y = 40, BOX_H = 96, RUN_GAP = 16, OPEN = 800, RUN_STAGGER = 300, HOLD = 400;
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [1392, 496],
  enter: "own",
  draw(S, d) {
    const { u } = S, g = GUTTER * u, w = (S.W - 2 * g) / 3, bw = w - 24 * u;
    const q = (bw - 2 * RUN_GAP * u) / 3, ry = (BOX_Y + BOX_H + 24) * u;
    const opened = [];
    LANES.forEach((lane, i) => {
      const total = OPEN + 3 * RUN_STAGGER;
      const t = S.to(`lane${i}`, S.beat >= 2 * i ? 1 : 0, total, i > 0 && S.dir > 0 ? 400 : 0, 0) * total;
      opened[i] = t >= total;
      if (t <= 0) return;
      const x = i * (w + g), y = BOX_Y * u, grow = clamp(t / 400), wipe = clamp(t / 400 - 1), cls = lane.code ? "nora-code" : "";
      d.text(x, 0, lane.title);
      d.rect(x, y, bw * grow, BOX_H * u * grow);
      if (wipe > 0) d.clipped([x, y, bw, BOX_H * u * wipe], () => {
        const lh = 32 * u, y0 = y + (BOX_H * u - lane.lines.length * lh) / 2 + lh / 2;
        lane.lines.forEach((parts, row) => {
          let tx = x + 20 * u;
          for (const [str, ink = "ink"] of parts) {
            // A label drops its leading spaces, so they are added to its x.
            const text = str.trimStart(), lead = S.width(str, cls) - S.width(text, cls);
            d.text(tx + lead, y0 + row * lh, text, { ink, cls, ay: 0.5 });
            tx += S.width(str, cls);
          }
        });
      });
      for (let n = 0; n < 3; n++) {
        if (t < OPEN + n * RUN_STAGGER) continue;
        const rx = x + n * (q + RUN_GAP * u);
        if (i === 1) sunset(n, rx, ry); else d.fill(rx, ry, q, q, { r: 8 });
        d.text(rx + q / 2, ry + q + 12 * u, `run ${n + 1}`, { cls: "nora-code", ax: 0.5 });
      }
    });

    // The lane on screen has opened: its sentence follows, without a press.
    const m = S.mem, showing = S.beat % 2 === 0 && S.dir > 0;
    if (!showing) m.wait = null;
    else if (opened[S.beat / 2]) {
      if (m.wait?.beat !== S.beat) m.wait = { beat: S.beat, at: S.now };
      else if (!m.wait.fired && (!S.motion || S.now - m.wait.at >= HOLD)) { m.wait.fired = true; S.advance(); }
    }

    // Three sunsets that don't match: over the sea, behind mountains, at night.
    function sunset(n, x, y) {
      const circle = (cx, cy, r, opts) => d.circle(cx, cy, r, opts);
      if (n === 2) { // night: a solid picture, the moon and its reflection knocked out
        d.fill(x, y, q, q, { r: 8 });
        circle(x + q * 0.32, y + q * 0.32, q * 0.13, { ink: "ground", w: 2, fill: "ground" });
        for (const [a, b, yy] of [[0.15, 0.85, 0.74], [0.3, 0.7, 0.84]]) d.line([[x + q * a, y + q * yy], [x + q * b, y + q * yy]], { ink: "ground", w: 2 });
        return;
      }
      d.rect(x, y, q, q);
      if (n === 0) { // a half sun on the horizon
        const hy = y + q * 0.66;
        d.line(Array.from({ length: 17 }, (_, k) => [x + q / 2 - q * 0.26 * Math.cos((k / 16) * Math.PI), hy - q * 0.26 * Math.sin((k / 16) * Math.PI)]), { w: 2, fill: "ink" });
        d.line([[x, hy], [x + q, hy]], { w: 2 });
      } else { // two peaks and a pale sun
        const base = y + q - 4 * u;
        d.line([[x + q * 0.06, base], [x + q * 0.38, y + q * 0.42], [x + q * 0.62, base], [x + q * 0.06, base]], { w: 2, fill: "ink" });
        d.line([[x + q * 0.42, base], [x + q * 0.68, y + q * 0.56], [x + q * 0.94, base], [x + q * 0.42, base]], { w: 2, fill: "ink" });
        circle(x + q * 0.72, y + q * 0.26, q * 0.11, { w: 2 });
      }
    }
  },
};
