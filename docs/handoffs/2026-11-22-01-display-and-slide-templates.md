# Handoff: display layer, slide templates, and the templates built in the lab

Follows [2026-11-21-05-genie-settled.md](2026-11-21-05-genie-settled.md). This session reviewed the design system for gaps, grilled and documented the display layer, grilled and documented slide templates, built the templates on the lab layout page, and fixed the rendering problems that showed up.

## What happened

### 1. Gaps in the design system
The categories still missing are:
- the display layer (now done)
- interface components (the chrome)
- prompt and text-artefact blocks
- slide templates (now done)
- interaction and keys
- accessibility

Smaller ones: a glyph set, copy conventions and chart rules. Prompt blocks are the next big gap, because the script's opening slides need them.

### 2. Display layer (`docs/design-system/display.md`, new)
- **One look:** the display stays on the real site as the only renderer, with a single tuned look (`lab/presets/light.json`). There are no separate presenter or reader looks.
- **Palettes share the look.** The dark palettes are to be checked by eye. If they need it, a dark-only glow is the one allowed exception.
- **Ambient effects:** warp and jitter never carry meaning, and no content motion may look like them.
- **The emulated pixel is locked at 1 unit.**
- **Without WebGL,** the page shows plain DOM text.
- **The live site has no dial panel.** The lab layout page is the basis for the real site.
- **Projector test:** display.md holds a checklist for it.
- **Changes in the lab:**
  - The viewer controls have a new **Scanlines on/off** toggle, separate from Blur.
  - `dark.json`, `presenter.json` and `reader.json` are retired.
  - `light.json` lost its 3D object values.
- **Genie:** each line now takes **200 ms**, down from 300.

### 3. Slide templates (`docs/design-system/slide-templates.md`, new)
- **Structure:** tab (a presenter's part: tab 1 is Nora's, tab 2 is Max's) → section (the script's `##` titles) → slide (each script bullet, one template) → beat (one press of →).
- **Swiss principles:** bigger type rather than longer lines, one text axis on column 1, asymmetry, and a modular grid.
- **Rows:** 6 fields of 112 with 16 gutters above a **footer strip**. The footer strip has the genie's sink bottom left and the section title (24/32, weight 700) bottom right.
- **Templates:**
  - Text: 64/72 across 8 columns.
  - Split: text on 4 or 6 columns, the visual to the right.
  - Wide and Row: visuals hang from row 1, and the statement stands on the base line under them.
  - Visual: the whole field.
  - The hero is slide zero.
- **Statements build:** each beat pours the next sentence out of the sink.
- **Slide changes run strictly in order:** text out, exits, carried moves, entrances, text in. Nothing new appears until the old slide has gone.
- **→ and ← flow on** across sections and tabs.
- **The script's sections were renamed** (v3).
- typography.md gained the Text statement (64/72) and Section title (24/32, weight 700) styles. Headlines aren't used on slides.

### 4. Built in the lab (`lab/layout.html` tab 2, `lab/js/slides.js`)
- **Tab 2** has seven placeholder slides in three made-up sections, covering every template, with carried visuals.
- **The hero and tab 1** keep their old layout. Each counts as one slide.
- **Graphics fit boxes** of columns × rows (`data-fit="box"`, `data-align`, `setGraphicAlign()`).
- **Fixes along the way:**
  - Nested `data-clip`s now intersect, so footer titles no longer show over closed tabs.
  - The footer and sink sit inside `.slides`.
  - The genie's swing mirrors for a sink on the left.
  - Rise and fall distances were wrong: they were measured to the section wrapper, so exits moved up instead of out.
  - Visuals no longer flash in place on the frame a slide is shown.
- **Rendering:** a graphic repaint cost 57–78 ms, which caused the stutter and the broken ghost trails.
  - `shade.js` now fills in scanline spans and grows outlines only inside the shapes' boxes. The pixels are identical, and it's about 5× faster.
  - `graphic.js` keeps two looks per graphic and draws flow packets on top.
  - `measure()` skips hidden subtrees.
  - These are noted in graphics.md ("Rendering cost"), display.md and lab/CLAUDE.md.

## Current state
- **To run it:** `python3 serve.py`, then `/lab/layout.html#advanced-topics`. ← and → step the slides; c opens the controls.
- **How it was checked:** probes in the browser pane, with no screenshots:
  - template regions and reflow with the controls open
  - beat and genie states
  - frame-by-frame order of exits, moves and entrances, and carried hand-overs
  - rasteriser output against the old code
  - repaint timings
  - no console errors

  The pane's `requestAnimationFrame` doesn't run while the pane is hidden, so probes stand in a 16 ms timer for it, and the timings there run slow. **You haven't yet judged smoothness in Chrome after the rendering fixes.**
- **Commits:**
  - display doc `60c6498`
  - genie 200 ms `f2fd4f0`
  - templates doc `6989b49`
  - templates build `ebc9e55`
  - this handoff and the rendering notes: the next commit

## Working preferences (from this session)
- Handoffs only at the end of a session. Mid-session commits go out without one.
- Ask before building content: placeholder demos, not the real slides.
- The user flags problems from real-browser viewing, so expect timing and visual issues the probes can't see.

## Open items
- **You:** step through tab 2 in Chrome. If carried moves or explode tweens still stutter, they repaint every frame. The next step is a cheaper hatch fill in `compose()`, or caching per explode value.
- **Display:** the projector test, and checking Plasma and Vector by eye.
- **Templates:**
  - Real slides from the script.
  - The hero and tab 1 rebuilt on templates (their sinks are still bottom right).
  - Tab labels showing section names twice.
  - Whether the section title carries its number.
  - Reader mode.
  - The left nav.
- **Carried over:** the motion items not yet built (shared curves module, graphic loops other than blink and flow, stagger, chrome timings), iso parts other than boxes, and span edge cases.
- **Next design-system sessions:** prompt and text-artefact blocks, then interface components.

## Suggested skills
- `grill-me` for prompt blocks or components.
- `diagnose` if stutter remains.
