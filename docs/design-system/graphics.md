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
  - 4/2 weights and square corners
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
| 4 | Every shape edge: outer outlines, internal outlines and edges between faces |
| 2 | Connectors and leader lines |

- **Fixed at every size.** The weights and the hatch spacing never scale with a graphic's size. A graphic too small for them is simplified (fewer parts, less detail) rather than thinned. The minimum size will be found by testing.
- **How edges are drawn:** 4-pixel lines centred on each face's or shape's true edge (2 of their pixels inside). Exploded parts each keep their own edges.
- **The 8-pixel silhouette was dropped** (2026-11-22). It was a 6-pixel outline grown outward around the whole object, so exploded parts shared one merged outline. It cost 5–28% of every repaint (measured on the two demo scenes) and added little to the look.

## Size, placement and shapes
- **No frame.** A graphic has no box around it. The dashed graphic box in the layout test was only a wireframe element, and it's gone.
- **Size and placement:** each graphic is sized and placed per slide to suit the content, always on the column grid.
- **The sizing unit is the graphic plus its captions.** Together they span whole columns, from a column's start edge to a column's end edge. Graphics are drawn with code so that the captions reach that edge:
  - On each side, the longest caption's outer edge lands on the span's edge. Left captions all start on the span's left edge, and the drawing is fitted to the longest one.
  - The drawing fills the rest of the span, scaled to fit between the caption lines. Line weights and the hatch spacing stay fixed (see Lines), so only the geometry scales.
  - **A graphic with no captions** spans whole columns itself: its drawing runs edge to edge.
- **Boxes ([slide-templates.md](slide-templates.md), built in the lab):** a visual fits a box of columns × row fields, scaled to whichever side runs out first and hung from the box's top-left. Captions still end on column edges.
- **Variable span:** each graphic declares a range in columns (for example, 3–4). It can be as wide as all 12 columns, with the text above or below it.
- **Panels open:** when a panel (controls, nav) covers columns, the text reflows first. The graphic keeps its widest span until the text would go under 4 columns. Only then does the graphic drop to fewer columns, down to its minimum. The grid and panel rules are in [layout-grid.md](layout-grid.md).
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
- **Captions align per side,** on their left edges. Left captions all start on the span's left edge, and each leader ends 8 short of its own caption. Right captions all start just past one shared caption line, where their leaders end.
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
- **Glossary links:** a caption label may link to its term's entry in a glossary, where one is relevant. Labels are already real DOM text, so this needs no new mechanism. They use the palette's link style ([palettes.md](palettes.md)). The glossary is built later.
- **Text artefacts** (prompts, chats, documents, file trees) are graphics of legible text, with their own rules for spans, cross-links and pixelated blur: [text-artefacts.md](text-artefacts.md).

## Accent: focus
- The accent marks the **one element the graphic is about right now**, such as the part being explained or the active step.
- That element's outline, hatching and fill switch from ink to accent.
- Only one element per graphic is accented at a time, and the accent can move from step to step.

## Presentation steps
The named curves, durations, loops and enter/exit motions are in [motion.md](motion.md).

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
- **Shared rules:** hatching, the 4/2 weights, focus and state tweens are implemented once, for flat and iso alike.
- **Labels stay real DOM text** in the type roles, anchored to points in the scene, so they stay selectable and leader lines can find them.
- **Built in the lab:** [`lab/js/graphic.js`](../../lab/js/graphic.js), with scenes in `lab/js/graphics/`. The scene format is described in [`lab/CLAUDE.md`](../../lab/CLAUDE.md). The two demo scenes, `exploded-stack` (iso) and `page-layout` (flat), appear on the layout test's hero, tab 1 and template slides; step them with ← and →.
- **Rendering cost:** graphics are painted on the CPU at full emulated-pixel resolution, so painting is the expensive step and is kept rare:
  - Each graphic keeps its last two painted looks, so a blink alternates between them without repainting.
  - Flow packets are drawn over the look each frame instead of being painted into it.
  - Moving a graphic by position is free. Changing its size, state or pose (a carried move, an explode tween, a drag) repaints it every frame.
  - The raster fills shapes in row spans (`lab/js/shade.js`), about 5× faster than before with identical pixels. The grown silhouette was removed for cost (see Lines).
  - Leader anchors on iso parts (the most visible face) are found by scanning only the part's face boxes, not the whole buffer: about 6.6× faster with identical anchors, which took labelled states from about 2.8× a plain repaint to about 1.5×. This relies on a rule: a shape's pixels stay inside the box `Raster.fill()` records for it. Anything new that draws into the raster must keep it.
  - What's left in every repaint is mostly the per-pixel hatch test in `compose()`, the next target if stutter remains.
  - New scenes should avoid huge areas that change every frame.

## Open
- **Motion session (separate):** easing curves for tweens and idle motion, the idle-motion vocabulary, and the 400/800 durations. Easing matters more than defining each motion's meaning.
- **Not built yet:**
  - idle motion loops: their vocabulary waits for the motion session
  - iso parts other than boxes
  - flat polygons that aren't convex
  - flat connectors with automatic routing: authors give the points
- The minimum graphic or part size for the fixed weights.
- **Since dropping the silhouette:**
  - Outer and inner edges share one weight, so in flat diagrams an enclosing box (the page frame in `page-layout`) no longer stands out from the boxes inside it. If that hierarchy is missed, a wider edge on `outline: "outer"` shapes is cheap.
  - During an explode tween, parts separate from the first frame, where the merged outline used to close gaps under 12 px.
  - Scenes still leave room for the old outward growth (`page-layout`'s 8-unit shift), so drawings stop about 6 px short of their span edge. Tighten per scene.
