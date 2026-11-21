# Graphics

Status: **exploration**, from the graphics grilling session (2026-11-21). Built in the lab: the shading test ([`lab/shading.html`](../../lab/shading.html)) and two scene graphics in the layout test ([`lab/layout.html`](../../lab/layout.html), `[data-graphic]`). The scene engine is [`lab/js/graphic.js`](../../lab/js/graphic.js). It's built on [`lab/js/shade.js`](../../lab/js/shade.js), whose `ISO_STYLE` holds the values below.

## Two styles
- **Flat diagrams:** Swiss-modernist and diagrammatic.
- **Isometric 3D objects:** explanatory objects, such as exploded views.
- Both are made with code and drawn in the page's palette. Every pixel is ground or ink, plus the accent for focus. There are no tints.

## Choosing a style
- **Guideline:** iso is for **things**, anything with physical or structural parts (machines, stacks, layers, anatomy, exploded views). Flat is for **relations** (processes, flows, sequences, comparisons, hierarchies, data, timelines).
- **The final choice is made per graphic.** Some topics stay flat even though they're things. For example, old static website layouts are shown as they were: flat.

## Real interfaces (for example, old website layouts)
- **Default: redrawn as a flat diagram,** a faithful wireframe of the original's structure:
  - boxes for regions
  - lines for text
  - hatching or solid for images
  - 8/4/2 weights and square corners
- **Screenshots are evidence, used sparingly.** A screenshot is shown when the artefact itself is the point.
  - At most one per point, and always captioned.
  - Converted to two-colour ink on ground with a simple threshold, not dither.

## Isometric objects
- **Rendering:** real 3D geometry seen through an orthographic camera locked at true isometric (yaw 45°, pitch 35.264°).
- **Drag to rotate:** the viewer can hold and drag an object to turn it. It springs back to the iso pose on release.
  - **Turning:** a full 360°.
  - **Tilting:** limited to between the side view (0°) and top-down (90°). The underside is never shown.
  - **Spring:** critically damped, about 400 ms, no overshoot.
  - **Motion off:** dragging still works, but the object snaps straight back on release.
  - **Steps:** no dragging during a step's transition.
  - **Cursor:** grab on hover, grabbing while dragging.
- **Light:** one global light, up and to the left (azimuth −60°, elevation 48°). It's fixed to the viewer, so rotating an object re-shades it. Graphics never override it.

## Shading
- **Hatching shows light on 3D objects.** It's also available as an optional pattern fill for flat graphics. Dither was tested and dropped (the code stays in the lab).
- **Ink always means shadow,** in every palette, dark grounds included.
- **The pattern is anchored to each face.** It follows the face when the object turns, rather than staying fixed to the screen.
- **The ramp** is density mode: 4-pixel lines at 45° (relative to the face) with five steps.

  | Step | Lines | Coverage |
  |---|---|---|
  | T0 | none | 0% |
  | T1 | every 24 px | about 17% |
  | T2 | every 12 px | about 33% |
  | T3 | every 8 px | 50% |
  | T4 | solid | 100% |

  Line distance is counted in whole pixels along the dominant axis, so the lines repeat on exact pixel periods.
- **Flat graphics:** what a step or a fill means is decided per graphic when it's built. Filled vs unfilled is one way of showing hierarchy among others.

## Lines
All in emulated pixels:

| Weight | Use |
|---|---|
| 8 | Silhouette: an object's or shape's outer outline |
| 4 | Internal outlines and edges between faces |
| 2 | Connectors and leader lines |

- **Fixed at every size.** The weights and the hatch spacing never scale with a graphic's size. A graphic too small for them is simplified (fewer parts, less detail) rather than thinned. The minimum size will be found by testing.
- **How the iso outline is drawn:** a 6-pixel silhouette grown outward from the true edge, plus 4-pixel face edges centred on the edge (2 of their pixels inside), so it reads as 8.
- **Exploded parts:** they share one merged outline. Gaps narrower than 12 px fill in. A ground "keep-out" ring between parts was tried and rejected.

## Size, placement and shapes
- **No frame.** A graphic has no box around it. The dashed graphic box in the layout test was only a wireframe element, and it's gone.
- **Size and placement:** each graphic is sized and placed per slide to suit the content, always on the column grid.
- **Square corners** on flat graphic shapes. The 8 radius belongs to the interface chrome, which keeps UI and content distinct. Rounding can still carry a meaning, such as a process, when a graphic calls for it.

## Connectors and leader lines
2-pixel lines.
- **Angles:** horizontal, vertical and 45° only. These are the angles that draw pixel-clean.
  - Exception: leader lines may run along iso angles (30°, 150°) where they point into an iso object.
- **Ends:**
  - **Arrows:** a solid triangular arrowhead.
  - **Leader lines:** a small solid square dot where they touch the object, and nothing at the label end.
- **On iso parts, the dot sits on the part's most visible plane:** the face with the most visible area after occlusion. On the demo, that's the top face of the cap and the base.
  - Near-ties go to the face on the label's side.
  - The dot sits well inside the visible area, toward the label.
  - It's chosen again as the object turns.
- **Captions align per side.** All captions on one side of a graphic share one vertical line: left captions right-aligned to it, right captions left-aligned.
- **Leader lines always bend,** in flat graphics too. They run 45° out of the anchor, then horizontally into the label. So a label always sits above or below its anchor, never on its row.
- **Casing:** a leader line that enters a graphic gets a ground-coloured outline (proposed: 2 px each side, to test), so it separates from the object and its hatching.
- **Dashed means hypothetical:** a removed part, an assembly path, where a part travels. Never decoration.

## Labels
- **Never on hatching.** A label sits on bare ground, or on a solid (T4) fill where it's knocked out in the ground colour.
- **Over hatched areas,** the label moves outside the graphic and connects with a leader line.
- **Accent:** a label is accented only when its element has focus.
- **Hover labels:** pointing at a part may reveal its label (with a leader line), following the label rules.
  - Hover never takes the accent; focus stays with the step.
  - Apart from dragging iso objects, this is the only cursor interaction inside a graphic.

## Accent: focus
- The accent marks the **one element the graphic is about right now**, such as the part being explained or the active step.
- That element's outline, hatching and fill switch from ink to accent.
- Only one element per graphic is accented at a time, and the accent can move from step to step.

## Presentation steps
- The presentation is moving from scroll-driven animation to **forward and back steps**, like an animated slide presentation. That keeps graphic and motion timing, and looping, simple.
- **States:** each step names a state for each graphic on screen, such as explode distance, the focused part, pose and visible elements.
- **Tween:** forward moves to the next state through one standard tween, 400 ms ease-in-out. 800 is the only longer duration, and there are no free values.
- **Back:** the same tween to the previous state.
- **Rapid presses:** pressing quickly skips to the end state instead of queuing transitions.
- **Loops:** a state can carry an optional loop, such as an idle turn or a pulse on the focused part. It pauses while the viewer drags.
- **Motion off:** every transition becomes an instant cut.
- **Loops**, all optional per state:
  - **Focus blink:** the focused element switches between accent and ink with a hard cut, about once a second.
  - **Flow packet:** a short solid segment travels along a connector at one constant speed, site-wide. It isn't marching dashes, because dashes mean hypothetical.
  - **Idle motion:** an element may bob, sway or similar. What each motion means isn't defined yet.
  - With motion off, all loops stop. Focus shows as plain accent, and flow shows with arrowheads only.

## Authoring
- **One engine for both styles.** Every graphic is a small JS scene description: shapes or 3D parts, their weights and fills, and named states.
- **Mounting:** a graphic mounts on a DOM element, for example `<div data-graphic="exploded-stack">`, and `shade.js` draws it into the raster.
- **Shared rules:** hatching, the 8/4/2 weights, focus and state tweens are implemented once, for flat and iso alike.
- **Labels stay real DOM text** in the type roles, anchored to points in the scene, so they stay selectable and leader lines can find them.
- **Built in the lab:** [`lab/js/graphic.js`](../../lab/js/graphic.js), with scenes in `lab/js/graphics/`. The scene format is described in [`lab/CLAUDE.md`](../../lab/CLAUDE.md). There are two demos on the layout test, `exploded-stack` (iso) and `page-layout` (flat); step them with ← and →.

## Open
- **Motion session (separate):** easing curves for tweens and idle motion, the idle-motion vocabulary, and the 400/800 durations. Easing matters more than defining each motion's meaning.
- **Not built yet:**
  - idle motion loops: their vocabulary waits for the motion session
  - iso parts other than boxes
  - flat polygons that aren't convex
  - flat connectors with automatic routing: authors give the points
- The minimum graphic or part size for the fixed weights.
