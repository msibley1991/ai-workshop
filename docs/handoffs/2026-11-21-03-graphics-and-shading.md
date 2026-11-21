# Handoff: graphics style, hatch shading and the scene engine

Follows [2026-11-21-02-typography-and-palettes.md](2026-11-21-02-typography-and-palettes.md). This session ran the third design-system grilling session (graphics). It tested shading on a new lab page, then built a scene engine that draws flat and isometric graphics through the real display layer.

## What happened

### 1. Graphics rules (exploration)
The full spec is in [docs/design-system/graphics.md](../design-system/graphics.md).

**Styles and shading**
- **Two styles:** flat Swiss-modernist diagrams and isometric 3D objects. Every pixel is ground, ink, or accent.
- **Choosing a style:** iso is for things and flat is for relations, but that's a guideline. The final choice is made per graphic. Old website layouts stay flat.
- **Real interfaces:** redrawn as wireframes by default. Screenshots are evidence: one per point at most, captioned, thresholded to two colours.
- **Iso view:** true isometric camera.
  - Drag rotates the object: a full 360° turn, tilt between the side view and top-down.
  - It springs back in about 400 ms with no overshoot.
  - Dragging is blocked during transitions.
- **Light:** one global light, up and to the left (azimuth −60°, elevation 48°), fixed to the viewer.
- **Shading is hatching,** with ink always meaning shadow, in every palette.
  - The ramp is density mode: 4-pixel lines at 45°, face-anchored, five steps (0 / 17 / 33 / 50 / 100%).
  - Dither was tested and dropped.

**Lines and connectors**
- **Weights:** 8 silhouette, 4 internal outlines, 2 connectors and leader lines. Fixed at every size: small graphics get simplified instead.
- **How the 8 is drawn:** the silhouette grows 6 outward plus the centred 4-pixel edge.
- **Rejected:** a keep-out ring between exploded parts.
- **Frames and corners:** graphics have no frame (the dashed box was a wireframe and is removed) and sit on the column grid. Shapes have square corners.
- **Connectors:** horizontal, vertical or 45°, with solid arrowheads. Dashed means hypothetical.
- **Leader lines:**
  - They end in a square dot on the object. The line and the dot are both cased in ground, 2 pixels each side.
  - They always bend: 45° out of the anchor, then horizontal into the label.
  - On iso parts, the dot lands on the part's most visible plane.
  - Captions align per side.
- **Rejected: figure numbering.**
  - **What it was:** captions like "fig 1.a - Pin", lettered per slide by focus order then height, with 5-column slots to fit them.
  - **Why:** too much textual noise, so it was reverted.
  - **Dropped with it:** the definition of a slide (everything visible before the next set of graphics and text, the old "sub-section"). Re-add it to the docs on its own if needed.

**Labels, focus and steps**
- **Labels:** never on hatching. Hover can reveal labels, but never focus.
- **Accent = focus:** one element per graphic. Its outline, hatching and fill turn accent.
- **The presentation moves to forward and back steps,** from scroll-driven animation.
  - Each step is a state, reached with a 400 ms ease-in-out tween (800 is the only longer option).
  - Back reverses the tween. Rapid presses skip to the end state.
  - Motion off cuts transitions.
  - **Loops:** focus blink, flow packet, idle motion (meaning not yet defined).

### 2. Lab pages and code
- **`lab/shading.html`** (+ `js/shading.js`, `css/shading.css`): dither vs hatching side by side.
  - Each side has a step ramp, a flat diagram and a draggable iso stack.
  - A "Shading" dial panel controls it; its defaults are the tuned values.
  - It's standalone, so no display layer.
- **`lab/js/shade.js`:** the low-level engine.
  - Hatch and dither patterns.
  - `Raster`, a convex-polygon raster with face-anchored pattern coordinates, a linear-time `grow`, `silhouette`, and thick, dashed and casing lines.
  - Iso geometry, `fillFace`, `lightVector` and the `Spin` spring.
  - `ISO_STYLE`, which holds the settled values.
- **`lab/js/graphic.js` + `lab/js/graphics/`:** the scene engine. A graphic is JS scene data mounted with `data-graphic="<name>"` and drawn by `text-raster.js`.
  - It covers iso box parts that explode, flat shapes, connectors and labels (DOM text with leaders and hover).
  - It also covers states, focus with blink, and flow packets.
  - The scene format is described in `lab/CLAUDE.md`.
- **`lab/layout.html`:**
  - **Demos:** `exploded-stack` (iso) in the intro and `page-layout` (flat) in Foundations. Step them with ← and →.
  - **Motion:** follows the viewer's setting through `setMotion`.

## Current state
- **To run it:**
  1. Start the lab server with `python3 serve.py`.
  2. Open http://localhost:8123/lab/layout.html and press → to step the graphics.
  3. Open `/lab/shading.html` for the shading test.
- **How it was checked:** pixel counts and probes in the browser pane, not on the full-size page:
  - accent focus pixels
  - 8 vs 4 line weights
  - which face each leader dot lands on
  - caption columns
  - no console errors

  You've looked at the leader dots, their casing and the caption alignment on the page.
- **Scene size:** scenes are a fixed 520 units wide, about 4 columns on the MacBook. They're centred in their slot, never scaled, and may crop on other widths.
- **Labels move when needed:** the layout page re-measures the DOM every frame, so labels can move. A page that doesn't do that would need `lab:layout` events, which the engine fires when labels show or hide.
- **`lab/presets/dark.json`:** committed as it stood. The light and dark presets no longer matter, since colour now comes from the palettes.
- **Commits:**
  - `a9ebd53`: graphics, the engine and this handoff.
  - `a9afe59`: leader-dot casing.
  - `8dbf2cf`: the dark preset.
  - This handoff update.

  Everything is pushed to `origin/main`, and the tree is clean.

## Working preferences (from this session)
- Grill one question at a time with a recommendation. Build a test page when the user wants to compare options.
- The user tunes on dial pages and pastes the panel's values. Make those the defaults: test-page config and `ISO_STYLE`.
- **Don't over-elaborate the shading.** It's for light on 3D, plus an optional pattern for flat graphics.
- Keep meanings, such as what a step or a fill encodes, per graphic, rather than fixing them system-wide.
- **No screenshot self-checks.** Verify with pixel probes and console messages. The user judges the look.

## Open items
- **A motion session (planned):**
  - easing curves for tweens and idle motion
  - the idle-motion vocabulary (bob, sway)
  - the 400/800 durations
- **Presentation:** the steps model replaces scroll animation, but [aesthetic-direction.md](../aesthetic-direction.md) still describes scroll-animated elements. Update it once steps are settled, and decide how steps relate to the accordion sections.
- **The engine:**
  - iso parts other than boxes
  - concave flat polygons
  - connector routing (authors give the points)
  - the minimum graphic size for the fixed weights
  - the leader casing width (2 each side) is still unreviewed
- **Carried over from the last handoff:**
  - dark palettes' ghost and effect tuning
  - the projector default palette
  - hover on links
  - moving the palettes and controls into the real site
  - responsive reflow

## Suggested skills
- `grill-me` for the motion session.
- `diagnose` for raster or engine bugs.
- `design:design-system` when promoting the graphics rules to the site.
