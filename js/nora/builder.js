import { tool } from "./tool.js";

// N07's website builder: one window, a chat on the left and the live site on
// the right. Drawn by js/nora/stage.js in the scene's px. It borrows Max's
// entrances: a solo artefact shown alone and large that then moves to its box
// (his data-solo), a frame growing from its top-left, typing with a block
// cursor, and parts opening one after another.
//   beat 0: the window alone, large, centred over the slide. It opens (grows,
//           400; its bar wipes in, 400), then plays once: the prompt types in
//           the chat, the reply's lines write out, and the site builds on the
//           right, part by part. The cursor keeps blinking in the prompt field.
//   beat 1: the window shrinks into the visual's box, top right (400), making
//           room for the statement.
//   beat 3: under the docked window, the chosen tool's notes (js/nora/tool.js),
//           each source a line that opens it, and a button that opens the
//           tool. The tool is chosen with the switch in the footer, which
//           appears on this slide and stays to the end of the tab
//           (js/nora/kit.js). While none is chosen, after a pause, an accent
//           arrow draws from under the statement's last line
//           ([data-nora-target]) down to that switch, with a line on what it's
//           for.
const AR = 2;                                         // the window is 640 x 320 design units
const PROMPT = ["Make a sign-up", "page for NMD", "November."];
const TYPE_AT = 900, CHAR_MS = 45, LINE_MS = 150, PART_MS = 250, BLINK_MS = 500;
const CODE = [120, 168, 144, 96];                // the reply's lines, design units
// Going forward the slide plays by itself: each beat steps on to the next
// after its hold (ms after the beat's own motion is done). Going back, every
// beat is its own press.
const HOLDS = [600, 1200, 2000];
const HINT_PAUSE = 1800; // after the last line, before the arrow to the switch
const clamp = (v) => Math.max(0, Math.min(1, v));

export default {
  size: [640, 320],
  enter: "own",
  draw(S, d) {
    const { u } = S, b = S.beat;
    // Where the window is: large and centred over the slide, or in its box.
    const slide = S.rel(S.slide.getBoundingClientRect()), dock = S.to("dock", b >= 1 ? 1 : 0, 400);
    const bigW = Math.min(slide.width * 0.8, (S.H - 80 * u) * AR), big = { x: slide.left + (slide.width - bigW) / 2, y: (S.H - 48 * u - bigW / AR) / 2, w: bigW };
    const w = big.w + (S.W - big.w) * dock, x0 = big.x + (0 - big.x) * dock, y0 = big.y + (0 - big.y) * dock, k = w / 640, h = w / AR;
    const X = (x) => x0 + x * k, Y = (y) => y0 + y * k;
    const rect = (x, y, rw, rh, opts) => d.rect(X(x), Y(y), rw * k, rh * k, opts);
    const fill = (x, y, rw, rh, opts) => d.fill(X(x), Y(y), rw * k, rh * k, opts);

    const open = S.to("open", 1, 800, 0, 0), grow = clamp(open * 2), wipe = clamp(open * 2 - 1);
    // One clock for what plays inside (ms since the slide arrived; all of it at once with motion off).
    const t = S.loop == null ? Infinity : S.loop - TYPE_AT;
    const chars = PROMPT.join("").length, typed = clamp(t / (chars * CHAR_MS)) * chars;
    const tCode = t - chars * CHAR_MS - 300, tSite = tCode - CODE.length * LINE_MS - 300;

    d.rect(x0, y0, w * grow, h * grow);
    if (wipe > 0) d.clipped([x0, y0, w, h * wipe], () => {
      fill(0, 0, 640, 32, { r: 8 });
      // The bar names the chosen tool; in Neutral it names none.
      if (tool().id !== "neutral") d.text(X(16), Y(16), tool().name, { ink: "ground", ay: 0.5 });
      d.line([[X(240), Y(32)], [X(240), Y(320)]], { w: 2 });
      // You describe: the prompt, typed.
      rect(16, 48, 208, 116, { w: 2 });
      let left = Math.floor(typed), cursor = null;
      PROMPT.forEach((line, i) => {
        const part = line.slice(0, Math.max(0, left)), tx = X(16) + 16 * u, ty = Y(48) + 12 * u + i * 32 * u;
        if (part) d.text(tx, ty, part);
        if (left >= 0 && left <= line.length && typed < chars) cursor = [tx + S.width(part), ty];
        left -= line.length;
      });
      if (cursor) d.fill(cursor[0] + 2 * u, cursor[1] + 4 * u, 12 * u, 24 * u);
      // It writes the code: the reply's lines, one after another.
      if (tCode > 0) {
        rect(16, 176, 208, 76, { w: 2 });
        CODE.forEach((len, i) => { const p = clamp((tCode - i * LINE_MS) / LINE_MS); if (p > 0) fill(28, 188 + i * 16, len * p, 6); });
      }
      // The prompt field, its cursor blinking once the typing is done.
      rect(16, 264, 208, 40, { w: 2 });
      if (typed >= chars && (S.loop == null || Math.floor(S.loop / BLINK_MS) % 2 === 0)) fill(28, 274, 10, 20);
      // You see it live: the site, part by part.
      const part = (i) => clamp((tSite - i * PART_MS) / PART_MS);
      if (part(0) > 0) fill(272, 56, 336 * part(0), 16);
      if (part(1) > 0) { rect(272, 88, 336 * part(1), 96 * part(1), { w: 2, r: 4 }); if (part(1) >= 1) fill(272, 88, 336, 96, { hatch: 2, r: 4 }); }
      for (let i = 0; i < 3; i++) if (part(2 + i) > 0) rect(272 + i * 116, 200, 104 * part(2 + i), 88 * part(2 + i), { w: 2, r: 4 });
    });

    // Forward, beats 0 to 2 step on by themselves.
    const done = [tSite >= 5 * PART_MS, dock >= 1, true][b], mem = S.mem;
    if (b > 2 || S.dir < 0) mem.wait = null;
    else if (done) {
      if (mem.wait?.beat !== b) mem.wait = { beat: b, at: S.now };
      else if (!mem.wait.fired && (!S.motion || S.now - mem.wait.at >= HOLDS[b])) { mem.wait.fired = true; S.advance(); }
    }

    // Beat 3, in Neutral: after a pause, an arrow to the switch in the footer.
    const line = S.slide.querySelector("[data-nora-target]"), picker = S.slide.closest("[data-panel]")?.querySelector(".nora-toolbar > button");
    const wanted = b >= 3 && tool().id === "neutral";
    const hint = S.to("hint", wanted ? 1 : 0, wanted ? 800 : 400, wanted && S.dir > 0 ? HINT_PAUSE : 0); // the pause is only on the way in
    if (hint > 0 && line && picker && !picker.closest("[hidden]")) {
      const from = S.rel(line.getBoundingClientRect()), to = S.rel(picker.getBoundingClientRect()), ax = to.left + to.width / 2;
      d.connector([[ax, from.bottom + 24 * u], [ax, to.top - 32 * u]], { ink: "accent", reveal: hint });
      if (hint >= 1) {
        d.text(ax + 32 * u, to.top - 112 * u, "Pick your tool here.", { ink: "accent" });
        d.text(ax + 32 * u, to.top - 80 * u, "Its notes then show on every task slide.", { ink: "accent" });
      }
    }

    // Beat 3: the chosen tool's notes, under the docked window.
    const sw = S.to("switch", b >= 3 ? 1 : 0, 600, S.dir > 0 ? 700 : 0);
    if (sw <= 0 || dock < 1) return;
    const over = (bx, by, bw, bh) => !!S.pointer && S.pointer[0] >= bx && S.pointer[0] <= bx + bw && S.pointer[1] >= by && S.pointer[1] <= by + bh;
    // A real button: solid when chosen or under the pointer.
    const button = (bx, by, label, solid, run) => {
      const bw = S.width(label) + 32 * u, bh = 48 * u, on = solid || over(bx, by, bw, bh);
      if (on) d.fill(bx, by, bw, bh, { r: 8 });
      d.rect(bx, by, bw, bh, { w: 2 });
      d.text(bx + bw / 2, by + bh / 2, label, { ink: on ? "ground" : "ink", ax: 0.5, ay: 0.5 });
      d.hit(bx, by, bw, bh, run);
      return bw;
    };
    const chosen = tool();
    if (sw < 1 || !chosen.notes) return;
    let y = h + 24 * u;
    d.text(0, y, `${chosen.kind}${chosen.tested ? "" : " · not tested yet for this workshop"}`, { ink: "accent" });
    for (const note of chosen.notes) d.text(0, (y += 32 * u), note);
    y += 8 * u;
    for (const src of chosen.sources) { // each note's source: a line that opens it
      d.text(0, (y += 32 * u), `source: ${src.text}`, { cls: "nora-code" });
      d.hit(0, y, S.W, 32 * u, () => window.open(src.url, "_blank", "noopener"));
    }
    button(0, y + 48 * u, `Open ${chosen.name}`, false, () => window.open(chosen.url, "_blank", "noopener"));
  },
};
