// N03's four live tiles. Drawn by js/nora/stage.js, in the scene's px: the
// tiles share the slide's 12 columns, 3 each, with the grid's 16 gutter.
// Each tile is the thing it names, with its title above and a hint inside:
//   Motion       a ball drops and bounces twice, squashing as it lands, then
//                rests a second and drops again.
//   Interaction  a real button: it inverts under the pointer; a click plays a
//                ripple and counts.
//   3D           Max's layer cube, mounted through his engine in the slide's
//                [data-nora-slot="cube"] (drag to turn, it springs back).
//   Responsive   a mini page with a drag handle on its right edge: 3 columns,
//                then 2, then 1 as it narrows, and the heading shrinks a step.
//                Left alone it steps through its three widths, holding each
//                for 2 s (wide, middle, narrow, middle): cuts, so nothing smears.
// The tiles open left to right, 200 apart (each box grows from its top-left
// corner, 400, then its content wipes in downward, 400), and stay live on
// every beat.
const TITLES = ["Motion", "Interaction", "3D", "Responsive"];
const HINTS = ["drop, two bounces", "hover, then click", "drag to turn", "drag to resize"];
const GUTTER = 16, TOP = 40;                        // units: between tiles; the titles' row
const STAGGER = 200, OPEN = 800;                    // a tile: grow 400, wipe 400
const FALL_MS = 450, BOUNCES = [0.35, 0.12], REST_MS = 1000; // the Motion tile
const RIPPLE_MS = 600;
const PAGE = { min: 96, idle: 3000, hold: 2000, steps: [1, 0.5, 0, 0.5] }; // the Responsive tile
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// The ball's height (0 on the ground, 1 at the top) at t ms into a drop.
function dropHeight(t) {
  if (t < FALL_MS) return 1 - (t / FALL_MS) ** 2;
  let t0 = FALL_MS;
  for (const c of BOUNCES) {
    const dur = 2 * FALL_MS * Math.sqrt(c);
    if (t < t0 + dur) return c * (1 - (2 * ((t - t0) / dur) - 1) ** 2);
    t0 += dur;
  }
  return 0;
}
const DROP_MS = FALL_MS + BOUNCES.reduce((sum, c) => sum + 2 * FALL_MS * Math.sqrt(c), 0);

export default {
  size: [1392, 496],
  enter: "own", // the tiles open themselves; no scene wipe on the way in
  draw(S, d) {
    const { u } = S, g = GUTTER * u, top = TOP * u;
    const w = (S.W - 3 * g) / 4, h = Math.min(w, S.H - top);
    const total = 3 * STAGGER + OPEN, open = S.to("open", 1, total, 0, 0);
    const inside = (p, x, y, bw, bh) => !!p && p[0] >= x && p[0] <= x + bw && p[1] >= y && p[1] <= y + bh;
    const content = [motion, interaction, () => {}, responsive];
    const HINT_H = 64 * u; // the strip at the foot of a tile that holds its hint

    TITLES.forEach((title, i) => {
      const x = i * (w + g), k = clamp((open * total - i * STAGGER) / OPEN), grow = clamp(k * 2), wipe = clamp(k * 2 - 1);
      if (i === 2) d.slot("cube", x + 32 * u, top + 24 * u, w - 64 * u, h - 24 * u - HINT_H);
      if (k <= 0) return;
      d.text(x, 0, title);
      d.rect(x, top, w * grow, h * grow);
      if (wipe > 0) d.clipped([x, top, w, h * wipe], () => {
        content[i](x, top);
        d.text(x + 24 * u, top + h - 48 * u, HINTS[i], { cls: "nora-code" });
      });
    });

    // Motion: a ball drops onto a line, bounces twice and rests.
    function motion(x, y) {
      const floor = y + h - HINT_H - 16 * u, r = 20 * u, cx = x + w / 2, travel = floor - r - (y + 40 * u + r);
      d.line([[x + 48 * u, floor], [x + w - 48 * u, floor]], { w: 2 });
      const t = S.loop == null ? DROP_MS : S.loop % (DROP_MS + REST_MS);
      const lift = dropHeight(t) * travel;
      // It squashes as it meets the line: wider and lower over its last few units.
      const sq = t < DROP_MS ? clamp(1 - lift / (10 * u)) * 0.3 : 0, rx = r * (1 + sq), ry = r * (1 - sq);
      const cy = floor - ry - lift;
      d.line(Array.from({ length: 25 }, (_, i) => [cx + rx * Math.cos((i / 24) * 2 * Math.PI), cy + ry * Math.sin((i / 24) * 2 * Math.PI)]), { w: 2, fill: "ink" });
    }

    // Interaction: a solid button; the pointer inverts it, a click sends out two rings and counts.
    function interaction(x, y) {
      const bw = 192 * u, bh = 56 * u, bx = x + (w - bw) / 2, by = y + (h - HINT_H - bh) / 2;
      const on = inside(S.pointer, bx, by, bw, bh);
      if (S.press.n !== S.mem.press) { S.mem.press = S.press.n; if (inside([S.press.x, S.press.y], bx, by, bw, bh)) { S.mem.ripple = S.now; S.mem.count = (S.mem.count ?? 0) + 1; } }
      const age = S.mem.ripple != null ? (S.now - S.mem.ripple) / RIPPLE_MS : 2;
      if (S.motion && age < 1) for (const lag of [0, 0.3]) {
        const k = clamp(age * 1.3 - lag);
        if (k > 0 && k < 1) { const out = (8 + 40 * easeOut(k)) * u; d.rect(bx - out, by - out, bw + 2 * out, bh + 2 * out, { ink: "accent", w: 2, r: 8 + 40 * easeOut(k) }); }
      }
      if (!on) d.fill(bx, by, bw, bh, { r: 8 });
      d.rect(bx, by, bw, bh);
      d.text(bx + bw / 2, by + bh / 2, S.mem.count ? `Clicked ×${S.mem.count}` : "Click", { ink: on ? "ink" : "ground", ax: 0.5, ay: 0.5 });
    }

    // Responsive: the page's width follows the handle while it's dragged, holds
    // for a moment, then goes back to the loop.
    function responsive(x, y) {
      const left = x + 24 * u, ptop = y + 24 * u, ph = h - 24 * u - HINT_H, min = PAGE.min * u, max = w - 64 * u;
      const loopW = min + (max - min) * (S.loop == null ? 1 : PAGE.steps[Math.floor(S.loop / PAGE.hold) % PAGE.steps.length]);
      const m = S.mem, cur = m.w ?? loopW;
      if (S.press.n !== m.pressR) { m.pressR = S.press.n; if (Math.abs(S.press.x - (left + cur)) < 24 * u && Math.abs(S.press.y - (ptop + ph / 2)) < 48 * u) m.drag = true; }
      if (m.drag && !S.down) { m.drag = false; m.released = S.now; }
      if (m.drag && S.pointer) m.w = clamp(S.pointer[0] - left, min, max);
      let pw = loopW;
      if (m.w != null) {
        // It holds where it was left, then cuts back to the loop.
        pw = m.w;
        if (!m.drag && S.motion && S.now - m.released > PAGE.idle) m.w = null;
      }
      const f = (pw - min) / (max - min), cols = f > 0.66 ? 3 : f > 0.33 ? 2 : 1, pad = 12 * u, gap = 8 * u;
      d.rect(left, ptop, pw, ph, { w: 2 });
      d.fill(left, ptop, pw, 16 * u, { r: 8 });
      d.fill(left + pad, ptop + 28 * u, Math.min(pw - 2 * pad, (cols === 3 ? 128 : cols === 2 ? 96 : 56) * u), (cols === 1 ? 6 : 8) * u);
      d.fill(left + pad, ptop + 44 * u, Math.min(64 * u, pw - 2 * pad), 4 * u);
      // The cells: 6 of them, in as many columns as fit.
      const cw = (pw - 2 * pad - gap * (cols - 1)) / cols, rows = Math.ceil(6 / cols), ch = Math.min(56 * u, (ph - 72 * u - gap * (rows - 1)) / rows);
      for (let i = 0; i < 6; i++) d.rect(left + pad + (i % cols) * (cw + gap), ptop + 60 * u + Math.floor(i / cols) * (ch + gap), cw, ch, { w: 2, r: 2 });
      // The handle: a ground pill on the right edge, two grip lines.
      const gx = left + pw, gy = ptop + ph / 2;
      d.rect(gx - 8 * u, gy - 24 * u, 16 * u, 48 * u, { w: 2, fill: "ground" });
      for (const o of [-3, 3]) d.line([[gx + o * u, gy - 10 * u], [gx + o * u, gy + 10 * u]], { w: 2 });
    }
  },
};
