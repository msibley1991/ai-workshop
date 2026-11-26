// Slide 5 of Max's Section: "∞ programs that all do similar but slightly
// different things". Eight file types, two for each of slide 8's outputs
// (3D, Texture, Layout, Motion), tied on one elastic cord in a trefoil knot.
// Beat 1: the files sit apart, untied. Beat 2: the cord draws in through them
// and pulls them into the knot, which then tumbles. A file can be pulled and
// springs back. Later slides reuse it: it bounces beside the artist template
// (slide 7), then whirlpools into the four outputs (slide 8), so each file
// carries its group. See js/knot.js.
export default {
  kind: "knot",
  size: [960, 760], // wider than tall: the knot fills Split 4's visual columns
  span: [6, 8],
  // Tied in this order, so neighbours on the cord come from different groups.
  files: [
    { id: "psd", ext: ".psd", group: "texture" },
    { id: "blend", ext: ".blend", group: "3d" },
    { id: "fig", ext: ".fig", group: "layout" },
    { id: "aep", ext: ".aep", group: "motion" },
    { id: "sbsar", ext: ".sbsar", group: "texture" },
    { id: "c4d", ext: ".c4d", group: "3d" },
    { id: "indd", ext: ".indd", group: "layout" },
    { id: "prproj", ext: ".prproj", group: "motion" },
  ],
  // Untied: apart and loosely scattered (design units from the centre; z sets
  // which is in front once the cord runs between them).
  scatter: [
    [-360, -190, 20], [-110, -240, -40], [130, -160, 10], [370, -230, 40],
    [-350, 170, -20], [-130, 230, -10], [110, 150, 30], [360, 210, -30],
  ],
  knot: { scale: [150, 84], depth: 1.1, tilt: 10, period: 24000, phase: 6, stretch: 1.6 }, // phase 6: no file on the axis
  glyph: { w: 176, h: 216, ear: 48, font: 32 },
  spring: { zeta: 0.4, settle: 800, coupling: 48 },
  // Slide 8 is one sequence on the tween's own clock: merge, then make.
  // Merge: the knot drifts to
  // the folder's column and drains into it like a whirlpool (spinning in the
  // screen plane, faster as it shrinks), the project folder pops out, then the
  // four symbols' tiles fan out to the left on connectors, one after another.
  merge: { ms: 2400, drift: [0, 1100], drain: [250, 1300], turns: 2, node: [1300, 1650], tiles: [1550, 2050], stagger: 90 },
  node: { w: 80, h: 64, tab: [32, 12], label: "project/", font: 24 },
  tile: { size: 72, gap: 16, font: 24 },
  tiles: [
    { id: "3d", label: "3D", icon: "cube" },
    { id: "texture", label: "Texture", icon: "swatch" },
    { id: "layout", label: "Layout", icon: "panels" },
    { id: "motion", label: "Motion", icon: "arrow" },
  ],
  // Make (js/sculpt.js): the template's content wipes out (strip) and its
  // boxes hand over to the sculpture, which turns to iso, the link draws, the
  // cards come out of its face, then each spin-swaps into its solid.
  make: { ms: 3300, strip: 400, pivot: [400, 1200], link: [1200, 1500], extrude: [1500, 1900], swap: [1900, 2700], stagger: 300 },
  solids: ["icosahedron", "torus-knot", "twisted-prism"],
  states: [
    { tie: 0, draw: 0 },
    { tie: 1, draw: 1, loop: "tumble", duration: 800 },
    // Slide 8: merge then make, one state; duration = merge.ms + make.ms.
    { tie: 1, draw: 1, merge: 1, make: 1, flow: ["out", "link"], loop: "bob", duration: 5700 },
  ],
};
