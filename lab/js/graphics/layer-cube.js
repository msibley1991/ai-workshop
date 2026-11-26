// Slide 3 of Max's Section, on its third beat: a cube of four stacked slabs
// that twists, each slab turning 360° and back (4 s each leg), two thirds of
// a second after the one above, inside two rings that tumble the same amount on
// different axes, all together. No labels; 4 columns.
// The rings are concentric with different radii, so they can never touch, and
// both clear the cube's corners (half its diagonal, 0.45 × √3 ≈ 0.78) at every
// turn of its slabs.
const SIZE = 0.9, LAYERS = 4, GAP = 0.05; // 0.9: a quarter smaller than the first 1.2
const H = (SIZE - (LAYERS - 1) * GAP) / LAYERS; // each slab's height

export default {
  kind: "iso",
  size: [480, 480],   // design units; fitted to the span
  span: [4, 4],       // columns (no captions)
  origin: [240, 240], // world origin (the cube's centre) in the scene box
  scale: 150,         // units per world unit
  // Top slab first (twist 0), down to the bottom one (twist 3).
  parts: Array.from({ length: LAYERS }, (_, i) => ({
    id: `layer-${i + 1}`,
    box: { c: [0, SIZE / 2 - H / 2 - i * (H + GAP), 0], s: [SIZE, H, SIZE] },
    twist: i,
  })),
  // No tilt: both rings start and end the twist flat, on their own axes (x and
  // z, both in the horizontal plane), and tumble off them in between. Both in
  // the accent.
  rings: [
    { id: "ring-inner", r: 1.25, spin: "x", weight: 8, accent: true },
    { id: "ring-outer", r: 1.5, spin: "z", weight: 8, accent: true },
  ],
  // First tuned at 600 ms legs with a 100 ms stagger, then slowed to 4 s legs
  // keeping that ratio (100 × 4000 / 600).
  twist: { deg: 360, ms: 4000, stagger: 4000 / 6 },
  states: [{ loop: "twist" }],
};
