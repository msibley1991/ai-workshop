// Slide 2 of Max's Section: three objects on a ground plane in two-point
// perspective, hatched by the global light, composed on the rule of thirds.
// They line up on a diagonal from the front left: sphere, pyramid, cube, with
// the cube centred on the upper-right thirds intersection, overlapping.
// Each caption names the technique it points at: the cube's right vanishing
// point, the thirds intersection under the cube, a hatched facet of the sphere.
// Dragging turns the whole group about its centre (pivot).
// State 1 encloses the drawing as the "output" of the prompt field under it:
// guides and captions go, the picture box closes in.
// World units, y up; see paintPersp in js/graphic.js.
const H = 560;

export default {
  kind: "persp",
  size: [600, H],     // design units; the thirds divide this box
  span: [4, 6],       // columns (graphic + captions)
  // Level camera, so verticals stay vertical. The horizon runs through the
  // middle of the top third; the cube's turn puts its right vanishing point at
  // x 540, inside the drawing, and its left one far off the left edge.
  camera: { f: 400, eye: 2.5, horizon: H / 6, cx: 300 },
  pivot: [0.48, 0, -4.85], // the group's centre on the ground
  // Idle sway (states' loop: "sway"): the group turns right until the cube's x
  // edges run to the left third line on the horizon (x 200: cot(59° + yaw) =
  // (200 - 300) / 400), then back; 5 s each way.
  sway: { yaw: 45.036, ms: 5000 },
  parts: [
    // Front, on the lower-left thirds intersection.
    { id: "sphere", type: "sphere", c: [-0.68, 0, -2.85], r: 0.633, bands: 5, segments: 10, yaw: 0 },
    // Between the two, overlapping both.
    { id: "pyramid", type: "pyramid", c: [0.32, 0, -4.4], s: [1.5, 1.75, 1.5], yaw: 53 },
    // Back, centred on the upper-right thirds intersection.
    { id: "cube", type: "box", c: [1.8, 0, -7.3], s: [2, 2, 2], yaw: 59 },
  ],
  // In the picture box (state 1) the drawing is fitted by this part of the
  // design box, the objects' bounds at rest plus a margin, so they fill it.
  frameView: [76, 92, 490, 502],
  guides: { thirds: true, horizon: true, vanish: "cube" },
  labels: [
    { id: "perspective", for: "construction", text: "Two-point perspective", at: [600, 48], side: "right", anchor: { vp: 0 } }, // the cube's x edges: right at rest, sliding left with the sway
    { id: "thirds", for: "thirds", text: "Rule of thirds", at: [600, 232], side: "right", anchor: [400, H / 3] },
    { id: "hatching", for: "sphere", text: "Hatching", at: [600, 520], side: "right", anchor: { part: "sphere" } },
  ],
  states: [
    { guides: true, loop: "sway", labels: ["perspective", "thirds", "hatching"] },
    // reserve: the prompt field's height (184 = 168 + a 16 gap; css/layout.css .prompt-field).
    { frame: 1, reserve: 184, loop: "sway" },
  ],
};
