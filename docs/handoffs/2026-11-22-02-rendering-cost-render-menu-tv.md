# Handoff: rendering cost, templates for the hero and tab 1, one Render menu, TV fixes

Follows [2026-11-22-01-display-and-slide-templates.md](2026-11-22-01-display-and-slide-templates.md). This session cut graphic repaint cost, put the hero and tab 1 on slide templates, tidied the presentation draft, merged the render dials into one shared menu, and fixed what showed up on a TV over HDMI (likely the presentation screen).

## What happened

### 1. Graphic repaint cost
- **The 8-px silhouette is gone.** It took 5–28% of a repaint, measured in the pane. Every shape edge is now the 4-px centred edge, and the weights are 4/2. Exploded parts keep their own edges.
- **Side effects, noted in graphics.md "Open":**
  - flat diagrams lose the heavier outer frame
  - parts separate from the first frame of an explode tween
  - scenes still leave about 6 px of room for the old outline
  - If the hierarchy is missed, a wider edge on `outline: "outer"` shapes is cheap.
- **Leader anchors:** `autoAnchor()` scans only the part's face boxes, which `Raster.fill()` records again. It's 6.6× faster, with identical anchors on 720 test cases. Labelled iso states went from about 2.8× a plain repaint to about 1.5×.
  - Rule: a shape's pixels stay inside its recorded box.
- **What's left in every repaint** is mostly the per-pixel hatch test in `compose()`, the next target if stutter remains.

### 2. Hero and tab 1 on templates
- **The hero (slide zero) is Split 6:**
  - the Display title and sub as one statement block, the stack on the right
  - its sink bottom left, no footer title
  - `.site-intro .slides` is 8 shorter than a tab's
- **Tab 1** is one Split 4 placeholder slide in "Placeholder section".
- **The tabs read "Nora's Section" and "Max's Section"** for now, for a layout recording. The hashes are still `#foundations` and `#advanced-topics`.

### 3. Presentation draft
- `docs/max-pres-draft/max-pres-v3.md` has bold labels (Spoken, Text, Visual, Link, TODO) and spacing between parts and slides.
- You removed v1 and v2 and made some wording changes.

### 4. TV over HDMI
- **Line weights:** Chrome rounds computed border widths down to device pixels, so on a DPR-1 screen with a fractional unit, the bars drew 1 emulated pixel against the tabs' 2.
  - Boxes now read `--box-line`, the declared width, set to `var(--line)` on every `[data-box]` in `layout.css`.
- **f toggles fullscreen** (Esc also leaves it). In fullscreen on 1080p, the unit is exactly 1.

### 5. One Render menu (`js/panel.js`, `js/params.js`, `js/main.js`)
- **The layout, genie, type and hierarchy pages (`<body data-render>`) share one "Render" menu:**
  - It holds resolution, glow, ghost, grid, phosphor timing, warp and outline.
  - It's saved only to `presets/render.json`, which replaced `light.json`. Every page loads it on each page load. **Save render settings** writes it and **Revert to saved** reloads it. There are no localStorage copies.
- **No colour, theme or light/dark dials.** Colours come only from the Palette panel. **Save palette** writes just the active palette.
- The specimen (`index.html`) keeps its old Effects Lab panel. It can load the render settings but doesn't save them.
- `render.json` started from the committed values. You then saved new ones, and display.md's look table matches them.

### 6. Display fixes
- **Ghost cut:** any real ink replaces the ghost (`INK_MIN` in `passes/ghost.js`), so a colour change in place lands on its first frame. Before, a change to a dimmer ink, such as ink to accent on a light ground, faded in under the old ghost. Trails now persist only on bare ground.
- **The genie stays in its panel:** the swing toward each side is scaled to the room inside the panel's outline. Toward the edge it's about half the full swing. It used to go 17 px past the left edge.

## Current state
- **To run it:** `python3 serve.py`, then `/lab/layout.html`.
  - ← and → step the slides, c opens the controls, f toggles fullscreen.
  - Keys only work with the dialkit menu minimized and the page clicked.
- **How it was checked:** probes in the pane for timings, anchors, line weights, genie bounds, panels and save actions. You checked visuals, keys and the TV in Chrome.
- **Commits:**
  - silhouette and anchors `acb9ebb`
  - templates and tab names `ddc07ee`
  - draft `72f157f`
  - Render menu, ghost, genie, line weight and fullscreen `bf08f0f`
  - this handoff: the next commit

## Working preferences (from this session)
- Measure before deciding: you set a rule that anything costing more than 10% of a repaint for little visual value goes.
- Test it yourself where possible. You check visuals and the TV in Chrome.
- Commit and push only when asked. Ask about values a file holds when they look overwritten.

## Open items
- **You:**
  - the projector test (display.md), now with the 4-px edges
  - whether flat diagrams need a heavier outer edge
- **Templates:**
  - real slides from the script
  - the real tab names when the recording's done
  - the hero title runs to about four lines at 1440 wide
- **Rendering:** `compose()` per-pixel cost, and tightening the old outline room in scenes.
- **Carried over:**
  - from the last handoff: prompt and text-artefact blocks, interface components, reader mode, the left nav, and the motion items not yet built
  - the iso stack's leaders warn "straight" at very small pane sizes

## Suggested skills
- `grill-me` for prompt blocks or components.
- `diagnose` if stutter remains.
