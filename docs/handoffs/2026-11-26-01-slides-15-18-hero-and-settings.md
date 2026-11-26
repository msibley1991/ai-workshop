# Handoff: slides 15–18, the hero graphic, and the settings rework

Follows [2026-11-24-02-slide-14-skills-and-accent-lines.md](2026-11-24-02-slide-14-skills-and-accent-lines.md).

This was a long session over 2026-11-25 and 26. It built the rest of Max's slides, gave the hero a real graphic, and reworked the lab's dial settings twice. All of it is exploration. The work is in commits `6fe81c9` through `7071e46` (`git log 81732a7..7071e46`). Everything is pushed.

## What happened

### Slides 15–18
Commit `6fe81c9`.
- **Slide 15 (MCPs), Row, three beats:**
  - **Visual:** three panes, Figma, Agent and `localhost:8123`, joined by two-way wires in two lanes.
  - **Beat 2:** the Figma wireframe's headline grows, and the agent's reply types in.
  - **Statement:** two run-on genie spans, then a warning in accent at `data-at="8"`.
  - **Chat text:** set by Max, and Max approved the slide.
- **Slide 16, Text, two beats:** the paragraph, then a link to the playground. The link has no `href` yet but already takes the link style.
- **Slide 17 (conclusion), Text, a sentence per beat:**
  - `data-statement="body"` gives it 48/56 type.
  - The last sentence sits on row 5, with **vision**, **curiosity** and **adaptability** in bold. Adaptability was Max's pick for the third quality.
- **Slide 18 (thank you):** text only. The script's download button isn't built yet.
- **New `slides.js` features** (documented in [slide-templates.md](../design-system/slide-templates.md) and [text-artefacts.md](../design-system/text-artefacts.md)):
  - `data-wire-beat` and `data-wire-step` override a wire's timing.
  - Wires can run in reverse.
  - `data-grow-at` sets `--grow` for a grow tween.
  - `data-step` works on stepped type-at blocks.
  - Stepped visuals enter in steps on a slide change (`laterIn`).
  - `data-row` places a single sentence on a row.

### Hero graphic
`lab/js/graphics/setup.js` is an iso object of the talk's setup:
- Chat and Context on the left, with Chat in front.
- The `project/` plate, holding the Design System tiles and the Generated Tools cubes.
- External Tools on the right, joined over a two-way MCP connector.
- Output at the front.

Max refined the layout over many rounds. Every connector runs on centre lines and stops clear of the objects. The design rule is in the scene's header comment.
- **Bob:** the stacks, context, External Tools and Output bob in a staggered wave. The MCP connector stays still while External Tools bobs.
- **Hit box:** the graphic's box is now the drawing's width, 1240 units hung from the right edge (`css/layout.css`). Max chose not to limit dragging to the drawn shapes.
- **Engine additions in `graphic.js`:**
  - `start: "arrow"` for two-way connectors
  - `on: "<part>"` to draw a part after the part it stands on
  - `captions: "free"` with `align`
  - the `bob` loop
  - `accent: true` on rings (slide 3's layer-cube rings now use it)

  These are documented now: graphics.md ("The hero's setup scene") and `lab/CLAUDE.md`'s scene format.

### Settings rework
1. **Rename** (commit `b7d6d7f`; Max grilled the names): every dial has a plain name that is the same in the menu, the presets, the code and the docs.
   - The old Render menu is now Display.
   - "Phosphor" for the ink colour is now "ink", ghost colours are trail colours (trail 1–3), and the Scanlines switch is Lines.
   - The Genie and Shading panels were renamed the same way. The key tables are in [display.md](../design-system/display.md) and [motion.md](../design-system/motion.md).
   - A small patch to the vendored dialkit splits a trailing number into its own word in labels.
2. **Per palette** (commit `1f7fc4d`):
   - Each palette in `lab/presets/palettes.json` now has a `display` block of effects next to its colours: sharp text, glow, trails, lines, noise and warp.
   - The Palette panel edits both. Display keeps only the shared pixel size and line weight.
   - The trails setting `colours` became `colourCount`, so it doesn't clash with the Colours group.
   - Max tuned Ink and Plasma's effects (commits `1f7fc4d` and `61aab2c`). Blueprint and Vector still have the starting values.

### Smaller changes
- **Dialkit menu:** back on the layout page, with both panels collapsed on load.
- **Glossary:**
  - `docs/glossary.md` and the glossary page in the lab were made in a separate session (`e7313d8`).
  - On the slides, the first time each glossary term appears in a statement it links to its entry (`glossary.html#<id>`). There are 10 links; LLM's is on slide 10, not the hero. The rule is in [components.md](../design-system/components.md), Links.
  - Slide links (these and the playground link) invert on hover and focus, as on the glossary page (commit `7071e46`). Two fixes made it work: `layout.js` re-measures when a statement link is hovered, and an inline fill that wraps now draws one box per line (`text-raster.js`), so a wrapped link no longer inverts the whole sentence.
- **Wording:**
  - slide 10: "A single chat has a limited context window."
  - slide 11: "Rules (CLAUDE.md or AGENTS.md):"
- **Top bar:** the title is back on column 1. Slide 4's browser-bar style had been applying to the page bar too, and is now scoped to `.site-frame`.

## Current state
- **Run:** `python3 serve.py`, then open `/lab/layout.html`.
- **Checks:** browser-pane probes found no console errors, the panel names correct, and the composed palette values right. Max checks looks in Chrome.
- **Not checked by eye:** the rings in accent, and the link hover after the wrap fix (Max reported the whole-sentence inversion; the fix wasn't confirmed before the commit).
- **Docs:** all of this session's work is documented (commit `7071e46`). The handoff's earlier list of missing docs is done.
- **Not built:**
  - the playground page, the target of slide 16's link
  - slide 18's download button
  - the audience play pages for the settings, which were the reason for the rename

## Next
Max hasn't picked the next task. Likely options:
- the settings play pages, built on the renamed settings
- tuning Blueprint and Vector's effects
- the playground page and slide 18's download button

## Suggested skills
- `grill-me` before designing anything new (a play page, a graphic). Max grills every design first.
- `handoff` again at session end.

## Working preferences
- Max verifies visuals in Chrome; probes cover behaviour only.
- Write docs and the handoff at session end.
- Don't mention commit status every turn.
- Commit or push only when asked: "commit" doesn't mean push.
- Max works on `main` until a colleague joins.
- Every dial key is a user-facing name. Keep names consistent across the menu, the presets, the code and the docs.
