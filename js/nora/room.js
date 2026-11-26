import { TOOLS } from "./tool.js";

// N13's room: the screens grouped by tool, all nearly the same, a path to walk
// between them, and the words that made them match. Design units; drawn by
// js/nora/stage.js.
//   beat 0: four groups of six screens, one per tool (the scene wipes in).
//   beat 1: an accent dashed path draws through the aisles (800), then a
//           packet walks it on a loop.
//   beat 3: the marked words from the four prompts cut in under the room, a
//           line per stage, 200 apart.
const GROUP = { w: 304, h: 148, sw: 88, sh: 48, gap: 12 }, COLS = [0, 376], ROWS = [0, 196];
const PATH = [[-8, 172], [680, 172], [680, 368], [-8, 368]];
const WORDS = [
  "say what it is, for whom, and when",
  "wireframe · campaign moodboard · only for the visual style",
  "#181269 · Inter 300 and 700 · 12-column grid · 28px",
  "at most 10 degrees · every 22 seconds · scale to 1.05",
];
const WORDS_Y = 400;

export default {
  size: [680, 560],
  draw(S, d) {
    const { P, s, u } = S, b = S.beat, tools = TOOLS.filter((t) => t.url);
    tools.forEach((t, i) => {
      const gx = COLS[i % 2], gy = ROWS[Math.floor(i / 2)];
      d.text(...P(gx, gy), t.name);
      for (let n = 0; n < 6; n++) {
        const [x, y] = P(gx + (n % 3) * (GROUP.sw + GROUP.gap), gy + 40 + Math.floor(n / 3) * (GROUP.sh + GROUP.gap)), w = GROUP.sw * s, h = GROUP.sh * s;
        d.rect(x, y, w, h, { w: 2, r: 4 });
        d.fill(x, y, w, 8 * s, { r: 4 });
        // The same page on every screen; one in each group is a little off.
        const off = n === (i * 2 + 1) % 6;
        d.fill(x + 8 * s, y + 16 * s, (off ? 28 : 36) * s, 6 * s);
        d.fill(x + (off ? 44 : 52) * s, y + 16 * s, 28 * s, 24 * s, { hatch: 2 });
      }
    });

    const walk = S.to("walk", b >= 1 ? 1 : 0, 800, S.dir > 0 ? 400 : 0);
    if (walk > 0) {
      const pts = PATH.map((p) => P(...p));
      d.connector(pts, { ink: "accent", dash: true, reveal: walk, arrow: 0 });
      if (walk >= 1 && S.loop != null) {
        const path = d.rounded(pts), [px, py] = d.along(path, (S.loop % 6000) / 6000);
        d.fill(px - 6 * u, py - 6 * u, 12 * u, 12 * u, { ink: "accent" });
      }
    }

    const total = (WORDS.length - 1) * 200 + 1, words = S.to("words", b >= 3 ? 1 : 0, total, S.dir > 0 ? 700 : 0) * total;
    WORDS.forEach((line, i) => { if (words > i * 200) d.text(...P(0, WORDS_Y + i * 36), line, { ink: "accent" }); });
  },
};
