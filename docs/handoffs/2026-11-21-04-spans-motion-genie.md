# Handoff: column spans, motion rules and the text genie

Follows [2026-11-21-03-graphics-and-shading.md](2026-11-21-03-graphics-and-shading.md). This session added graphic sizing on the column grid, ran the motion grilling session, and built and tuned a text "genie" effect on a new lab page.

## What happened

### 1. Graphics sized on column spans (committed as `7102a17`)
The rules are in [graphics.md](../design-system/graphics.md) ("Size, placement and shapes") and [layout-grid.md](../design-system/layout-grid.md) ("Columns", "Panels on the grid").
- **The sizing unit is graphic plus captions.** Together they span whole columns.
  - The longest caption on each side ends on the span's edge, and the drawing scales to fit between the caption lines. Line weights and hatching never scale.
  - Left captions all start on the span's left edge, and each leader ends 8 short of its own caption. Right captions start just past one shared caption line.
  - A graphic with no captions spans whole columns itself.
- **Each scene declares `span: [min, max]` in columns.** Both demos are `[3, 4]`.
- **One 12-column grid for the whole canvas,** never recalculated. The Grid overlay draws over the panels.
- **Panels cover whole columns, at most 2 each.** The controls cover 11–12, and a future left nav would cover 1–2 (`--nav-cols`).
  - A panel's box runs from its first column's start to the frame margin. The content box stops 8 short of it, so the inset on that side is 16.
  - Content reflows off covered columns: text first, down to a minimum of 4 columns, then graphics drop toward their minimum span.
  - Opening reflows first, then the panel slides in. Closing slides it out, then reflows.
- The controls panel's settings now stack the name over on / off so they fit in 2 columns.
- **Code:**
  - `fit()`, `captionLines()` and `leaderEnd()` in `lab/js/graphic.js`
  - `reflow()` in `lab/js/layout.js`
  - the fixed grid tracks and `--controls-w` in `lab/css/layout.css`

### 2. Motion rules (exploration)
The spec is the new [motion.md](../design-system/motion.md). A custom slide notation was considered and dropped: these are plain named rules.
- **Character:** smooth and pixel-snapped. No fades, because every pixel is ground, ink or accent.
- **Three kinds of motion:**
  - Enter/exit: rise, fall, grow, shrink, cut, plus genie for text.
  - Change: move, explode, focus, rotate to.
  - Loop: bob, sway, spin, pulse, blink, flow.
- **Curves:** ease (in-out cubic, the default), out (answers input), settle (about 10% overshoot) and drop (gravity, 2 bounces).
- **Named values:**
  - Durations: quick 250 (UI only), default 400, slow 800.
  - Loop periods: 1 / 2 / 4 s.
  - Sizes: 8 / 16 / 32 units. Sway is 4° or 8°.
- **Loops** are sine waves, with the size measured from rest to peak, and each has a defined pivot. A loop eases to rest when its step ends, and dragging pauses loops.
- **Rise and fall** travel in from beyond their container's edge, clipped to the container.
- **Timing:** a step's motions start together. A step can opt into a 100 ms stagger, capped at 800.
- **Chrome (decided, not built):** the accordion jump goes to 400 on ease, and the snap and panels go to quick on out.

### 3. Text genie (`lab/genie.html`)
- **The effect:** a text block funnels into the **bottom-right corner of its panel's box** and pours back out.
  - It goes line by line: the bottom line goes out first, so the top line comes in first.
  - Within a line it's slit-scanned: each row runs at its own time, lower rows ahead, and stretches to fill gaps, which gives the smear.
  - The display layer's ghosting provides the trail.
- **The page:** a copy of `layout.html` with the same display layer, accordion and controls.
  - → genies out, ← back in, l toggles, g shows the graph editor.
  - The Effects Lab and Palette dial panels start collapsed.
- **Dials (Genie panel):**
  - duration (ms per line) and follow (−1 together, 0 one after another, +1 a pause of one duration)
  - curve and slideStart
  - the edge profile p25 / p50 / p75
  - slit, rowBand and sinkWidth
  - arc (the maximum swing), bends and severity
  - trailBoost, plus hold + scrub to freeze a frame
  - "Copy values", which includes the graphs
- **Graph editor (`lab/js/genie-graphs.js`):** two bezier graphs over a line's run.
  - Arc (−1..1) scales the spine's swing, and Narrowing (0..1.2) sets how far the sides pull in.
  - Drag anchors and handles; handles mirror unless Shift is held. Click the curve to add an anchor, Alt-click to remove one, and Reset restores the tuned graph.
  - Graphs are saved in localStorage (`lab-genie-graphs`).
- **Tuned values** are the defaults (`settings` and `DEFAULT_GRAPHS` in `lab/js/genie-warp.js`), and they're tabulated in motion.md:
  - Timing: 300 ms per line, follow −0.5, ease, slideStart 0.67.
  - Funnel: profile 0.8 / 0.79 / 0.77, slit 1, rowBand 1, sink 8 units.
  - Spine: arc −48, 3 bends, severity 0. No trail boost.
  - An 11-line block takes 1800 ms.
- **Code:**
  - `lab/js/genie-warp.js`: timing, graphs and the row warp
  - `lab/js/genie.js`: the dials, keys and panel collapse
  - `lab/js/genie-graphs.js` and `lab/css/genie.css`: the graph editor
  - `text-raster.js`: `[data-genie]` blocks, their line bands and panel box, and drawing them offscreen and warping them
  - `main.js`: the trail boost

## Current state
- **To run it:** `python3 serve.py`, then:
  - http://localhost:8123/lab/genie.html#foundations for the genie
  - `/lab/layout.html` for the spans and panels (press c for the controls)
- **How it was checked:** module probes in the browser pane, with no screenshots:
  - caption edges and leader gaps
  - reflow columns with one and with both panels
  - the warp's rows against the sink and the line timing for each follow value
  - the spine swing and graph evaluation
  - simulated editor drags and the keys
  - no console errors

  You've tuned the genie by eye. `layout.html` has no genie blocks and draws as before.
- **Saved values:** each browser keeps its own saved dial values and graphs, and those override the defaults. To get the defaults back, clear `dialkit:lab-genie` and `lab-genie-graphs`.
- This commit holds the motion docs, the genie page and this handoff.

## Working preferences (from this session)
- Write the handoff before committing and pushing.
- The user tunes on lab pages and pastes "Copy values". Make those the defaults and record them in the docs.
- Ask before guessing what a control means. Here "arc control" meant bezier graphs of curvature over time, not a spatial path or sine dials.
- Keep test pages close to the real page (same display layer and controls), with the dials for the thing under test.
- No screenshot self-checks; verify with probes, and the user judges the look.

## Open items
- **Motion not built yet:**
  - a shared curves module (out, settle, drop)
  - graphic enter/exit and loops (rise, fall, grow, shrink, bob, sway, spin, pulse)
  - stagger
  - the chrome timings (the accordion jump is still 500; the snap and panels still use ease)
- **Genie:**
  - moving it into the real layout on step exits
  - whether the per-line duration becomes a named value
  - the DOM text is only `visibility: hidden` once genied out
- **Spans:**
  - what happens when even a graphic's minimum span plus 4 text columns doesn't fit
  - a layout for full-width graphics with text above or below
  - the real left nav
- **Carried over:**
  - aesthetic-direction.md still describes scroll animation
  - iso parts other than boxes, concave polygons and connector routing
  - dark palette tuning, the projector default, and responsive reflow

## Suggested skills
- `grill-me` for the next design questions, for example building the graphic motions or the genie in the real layout.
- `diagnose` for warp or raster bugs.
