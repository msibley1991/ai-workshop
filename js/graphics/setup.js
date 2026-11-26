// The hero: the setup the talk teaches, as one iso object, hung from the
// right of the hero's 12 columns and 6 rows and reaching left under its text
// (the top left stays clear for the title). project/ is a raised plate
// holding what's in the project, in two equal halves: the design system's
// tiles and the generated tools' cubes (`on: "plate"`, so they paint after
// it). Context and chat stand off it on the left, chat in front, joined both
// ways; context, one cube, reaches the project both ways (it has access to the project,
// but doesn't contain it); chat and the project both feed output, at the
// front; external tools stand apart on the right, joined to the plate by a
// two-way MCP connector. Both two-way links to the plate stop at its edge.
// Captions sit beside their objects (captions: "free"). One state:
// assembled, every label shown, packets on every connector, and the layered
// parts (context, chat's turns and the tiles) bobbing one after another
// (loop "bob"), then external tools and output.
// World units, y up; the plate's top is y 0.3. Points are given in world
// units through the plate (W), whose centre is [0, 0.15, 0].
const W = (x, y, z) => ({ part: "plate", point: [x, y - 0.15, z] });
const box = (id, c, s, extra = {}) => ({ id, box: { c, s }, ...extra });
// An end at a face we can't see: the line comes out from behind the object
// `half` (its half-width across the line) past that face, plus CLEAR so the
// 4 px line and an arrow's spread legs stay off the object; an arrow's tip is
// pulled back about 0.37 world units (32 px at scale 105) from the line's
// end, so an arrow end goes that much less far out.
const CLEAR = 0.15;
const E = (half, arrow = true) => Math.max(CLEAR, half + CLEAR - (arrow ? 0.37 : 0));

// The plate's two halves along x: each object 0.9 square, with equal margins
// (2.6 = 2 * 0.9 + 3 * M) to the edges and between them.
const M = (2.6 - 2 * 0.9) / 3, HALF = 1.3 - M - 0.45; // object centres at x = ±HALF

const parts = [
  box("plate", [0, 0.15, 0], [2.6, 0.3, 2.6]),
  // Design system: three tiles stacked in the left half (bob: the part's
  // place in the bob's stagger order).
  ...[0, 1, 2].map((i) => box(`ds-${i + 1}`, [-HALF, 0.33 + i * 0.32, 0], [0.9, 0.06, 0.9], { on: "plate", bob: 4 + i })),
  // Generated tools: four cubes on a 2 x 2 grid in the right half.
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => box(`gen-${i + 1}`, [HALF + a * 0.25, 0.5, b * 0.25], [0.4, 0.4, 0.4], { on: "plate" })),
  // Context: one cube, left. In this talk a context is a set limit on a
  // chat's memory: one thing that can reach many things.
  box("ctx", [-4.0, 0.4, 0], [0.8, 0.8, 0.8], { bob: 0 }),
  // Chat: three turns stacked square and evenly spaced, straight in front of
  // context and level with output's centre.
  ...[0, 1, 2].map((i) => box(`chat-${i + 1}`, [-4.0, 0.03 + i * 0.28, 3.4], [0.9, 0.06, 0.6], { bob: 1 + i })),
  // External tools: a block with a plug toward the plate, apart on the right
  // (they bob together, after the tiles).
  box("ext", [4.6, 0.45, 0], [0.9, 0.9, 0.9], { bob: 7 }),
  box("ext-plug", [3.95, 0.3, 0], [0.4, 0.2, 0.3], { bob: 7 }),
  // Output: an upright screen at the front, facing front left; it bobs last.
  box("output", [0.8, 0.5, 3.4], [0.1, 1.0, 1.4], { bob: 8 }),
];

export default {
  kind: "iso",
  size: [1240, 752],
  span: [5, 6],
  origin: [580, 360],
  scale: 105,
  captions: "free",
  align: 1, // hung from the box's right edge
  // The bob: each layered part rises `amp` world units and settles over `ms`,
  // `stagger` ms after the one before it in `bob` order.
  bob: { amp: 0.15, ms: 1600, stagger: 120 },
  parts,
  // Every link runs on a centre line: from the middle of one object toward
  // the middle (or the face) of the next, on the ground (y 0). Connectors draw
  // over everything, so a line that leaves or meets an object through a face
  // we can't see ends where it comes out from behind the object: past that
  // face by half the object's width across the line (E below), less the
  // arrow's pull-back where there's an arrow. MCP runs at the plate's top
  // edge, which is the plate's outline on that side.
  connectors: [
    // Context and chat, both ways, down their shared centre line: out of
    // context's front face, into chat's hidden back face.
    { id: "chat-context", pts: [W(-4.0, 0, 0.4), W(-4.0, 0, 3.1 - E(0.45))], start: "arrow", end: "arrow" },
    // Context and the project, both ways: out of context's hidden right face,
    // into the middle of the plate's left face.
    { id: "context-project", pts: [W(-3.6 + E(0.4), 0, 0), W(-1.3, 0, 0)], start: "arrow", end: "arrow" },
    // MCP: both ways, from the plate's edge to the plug at rest; it holds still
    // while external tools bob.
    { id: "mcp", pts: [W(1.4, 0.3, 0), W(3.7, 0.3, 0)], start: "arrow", end: "arrow" },
    // Into output: from the middle of the plate's front face, and from chat's
    // hidden right face along its centre line (no arrow: it starts where it
    // comes out from behind chat).
    { id: "project-out", pts: [W(0, 0, 1.3 + CLEAR), W(0, 0, 2.9), W(0.75, 0, 2.9)], end: "arrow" },
    { id: "chat-out", pts: [W(-3.55 + E(0.3, false), 0, 3.4), W(0.75, 0, 3.4)], end: "arrow" },
  ],
  // Each label's `at` is where its leader ends, 32 past the leader's bend; a
  // left caption's text ends just short of it, a right caption's starts just
  // past it. Rows sit above or below their anchors (leaders run a 45°
  // diagonal, then level).
  labels: [
    { id: "ds", for: "ds-3", text: "Design System", at: [430, 280], side: "left", anchor: { part: "ds-3", point: [-0.45, 0, 0] } },
    { id: "project", for: "plate", text: "project/", at: [364, 330], side: "left", anchor: { part: "plate", point: [-1.3, 0.15, -0.9] } },
    { id: "context", for: "ctx", text: "Context", at: [177, 470], side: "left", anchor: { part: "ctx", point: [-0.4, 0, 0] } },
    { id: "chat", for: "chat-1", text: "Chat", at: [628, 725], side: "right", anchor: { part: "chat-1", point: [0, 0, 0.3] } },
    { id: "ext", for: "ext", text: "External Tools", at: [1069, 30], side: "right", anchor: { part: "ext", point: [0.4, 0.45, 0.4] } },
    { id: "mcp", for: "ext-plug", text: "MCP", at: [692, 180], side: "left", anchor: W(2.55, 0.3, 0) },
    { id: "gen", for: "gen-4", text: "Generated Tools", at: [780, 320], side: "right", anchor: { part: "gen-4", point: [0, 0, 0.2] } },
    { id: "output", for: "output", text: "Output", at: [1037, 520], side: "right", anchor: { part: "output", point: [0, 0, 0.7] } },
  ],
  states: [
    {
      loop: "bob",
      labels: ["ds", "project", "context", "chat", "ext", "mcp", "gen", "output"],
      flow: ["chat-context", "context-project", "mcp", "project-out", "chat-out"],
    },
  ],
};
