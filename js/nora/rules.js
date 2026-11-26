import { tool } from "./tool.js";

// N08's ground rules: five rows, one per row field of the slide (112 with 16
// gutters), each a small picture, the rule and a second line. Drawn by
// js/nora/stage.js in the scene's px.
// Going forward the rules come by themselves, HOLD ms after the one before has
// opened; going back, each is its own press.
//   beat n: rule n opens (its picture's box grows from the top-left, 400, then
//           the picture and the text wipe in, 400). Rule 1, the one that
//           matters most, sits in an accent frame.
//   beat 4: under the statement's [data-nora-target] line, the chosen tool's
//           note for this slide and a button that opens the tool
//           (js/nora/tool.js); nothing in Neutral.
const RULES = [
  ["One chat for everything.", "It's all the AI can see."],
  ["Paste each prompt as it is.", "Not a word changed."],
  ["Design only.", "No back end, no real sign-ups."],
  ["Don't edit by hand.", "It burns credits."],
  ["Results differ between tools.", "A little. That's fine."],
];
const ROW = 128, BOX = 80, TEXT_X = 112, HOLD = 700;
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [688, 752],
  enter: "own",
  draw(S, d) {
    const { u } = S, b = S.beat, q = BOX * u;
    const glyphs = [newChat, copy, page, coins, pair];
    let opened = false;
    RULES.forEach(([rule, more], i) => {
      const k = S.to(`rule${i}`, b >= i ? 1 : 0, 800, i > 0 && S.dir > 0 ? 300 : 0, 0), grow = clamp(k * 2), wipe = clamp(k * 2 - 1);
      if (i === b) opened = k >= 1;
      if (k <= 0) return;
      const y = i * ROW * u, by = y + 16 * u;
      d.rect(0, by, q * grow, q * grow, { w: 2 });
      if (wipe <= 0) return;
      d.clipped([0, y, S.W, ROW * u * wipe], () => {
        glyphs[i](q / 2, by + q / 2);
        d.text(TEXT_X * u, by + 4 * u, rule, { cls: "nora-lead" });
        d.text(TEXT_X * u, by + 46 * u, more);
      });
      if (i === 0 && wipe >= 1) d.rect(-12 * u, y + 4 * u, S.W + 12 * u, (ROW - 24) * u, { ink: "accent" });
    });

    // Forward, each rule brings the next.
    const mem = S.mem;
    if (b >= RULES.length - 1 || S.dir < 0) mem.wait = null;
    else if (opened) {
      if (mem.wait?.beat !== b) mem.wait = { beat: b, at: S.now };
      else if (!mem.wait.fired && (!S.motion || S.now - mem.wait.at >= HOLD)) { mem.wait.fired = true; S.advance(); }
    }

    // The chosen tool's note, under the closing line.
    const line = S.slide.querySelector("[data-nora-target]"), t = tool();
    const note = S.to("note", b >= 4 ? 1 : 0, 400, S.dir > 0 ? 700 : 0);
    if (!line || note < 1 || !t.rules) return;
    const at = S.rel(line.getBoundingClientRect());
    let y = at.bottom + 24 * u;
    d.text(at.left, y, t.name, { ink: "accent" });
    d.text(at.left, (y += 32 * u), t.rules);
    const label = `Open ${t.name}`, bw = S.width(label) + 32 * u, bh = 48 * u, bx = at.left, byy = y + 48 * u;
    const on = !!S.pointer && S.pointer[0] >= bx && S.pointer[0] <= bx + bw && S.pointer[1] >= byy && S.pointer[1] <= byy + bh;
    if (on) d.fill(bx, byy, bw, bh, { r: 8 });
    d.rect(bx, byy, bw, bh, { w: 2 });
    d.text(bx + bw / 2, byy + bh / 2, label, { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
    d.hit(bx, byy, bw, bh, () => window.open(t.url, "_blank", "noopener"));

    // 1: a "+ New chat" button, struck through.
    function newChat(cx, cy) {
      d.rect(cx - 28 * u, cy - 14 * u, 56 * u, 28 * u, { w: 2, r: 6 });
      d.line([[cx - 8 * u, cy], [cx + 8 * u, cy]], { w: 2 });
      d.line([[cx, cy - 8 * u], [cx, cy + 8 * u]], { w: 2 });
      d.line([[cx - 32 * u, cy + 24 * u], [cx + 32 * u, cy - 24 * u]], { ink: "accent" });
    }
    // 2: a copy: one sheet behind another.
    function copy(cx, cy) {
      d.rect(cx - 22 * u, cy - 26 * u, 34 * u, 42 * u, { w: 2, r: 4 });
      d.rect(cx - 12 * u, cy - 16 * u, 34 * u, 42 * u, { w: 2, r: 4, fill: "ground" });
      for (const o of [-4, 6, 16]) d.line([[cx - 4 * u, cy + o * u], [cx + 14 * u, cy + o * u]], { w: 2 });
    }
    // 3: a page: the front, and nothing behind it.
    function page(cx, cy) {
      d.rect(cx - 24 * u, cy - 26 * u, 48 * u, 52 * u, { w: 2, r: 4 });
      d.fill(cx - 24 * u, cy - 26 * u, 48 * u, 10 * u, { r: 4 });
      d.fill(cx - 16 * u, cy - 6 * u, 32 * u, 22 * u, { hatch: 2 });
    }
    // 4: credits: a stack of coins, the top one going.
    function coins(cx, cy) {
      for (const [o, ink] of [[14, "ink"], [2, "ink"], [-10, "ink"]]) d.rect(cx - 22 * u, cy + o * u, 44 * u, 10 * u, { w: 2, r: 5, ink });
      d.rect(cx - 14 * u, cy - 28 * u, 44 * u, 10 * u, { w: 2, r: 5, ink: "accent", dash: true });
    }
    // 5: two results, nearly the same.
    function pair(cx, cy) {
      d.rect(cx - 28 * u, cy - 16 * u, 26 * u, 32 * u, { w: 2, r: 3 });
      d.rect(cx + 2 * u, cy - 12 * u, 26 * u, 32 * u, { w: 2, r: 3 });
      d.fill(cx - 28 * u, cy - 16 * u, 26 * u, 8 * u);
      d.fill(cx + 2 * u, cy - 12 * u, 26 * u, 8 * u);
    }
  },
};
