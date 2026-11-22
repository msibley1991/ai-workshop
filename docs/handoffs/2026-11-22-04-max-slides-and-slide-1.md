# Handoff: Max's Section laid out, slide 1 visual built

Follows [2026-11-22-03-artefacts-components-nav.md](2026-11-22-03-artefacts-components-nav.md).

This session laid out every slide of Max's Section, then built the first visual: slide 1's two-chat comparison. It also adds the first part of the text-artefact system: typing, crop and split, marks and cross-links. **Next: slide 2's visual, then the rest, one at a time.**

## What happened

### 1. Max's Section as slides (committed earlier: `1e21764`, `f938a89`)
- **Source:** `docs/max-pres-draft/max-pres-v3.md`. Each script bullet is one Text slide. A bullet with no Text line gets a `[Placeholder]` statement.
- **Slide numbers:** each slide's number sits beside its section label in the footer (`setNumber`). It counts within the tab, so adding a slide renumbers the rest.
- **Slide 6** uses a real ∞.
- **Dialkit:** a TEMPORARY `<style>` in `lab/layout.html`'s `<head>` hides it, for this layout work. Remove it when done.

### 2. Slide 1 visual (section "On creative decisions")
- **What it compares:** a vague chat ("high converting… make it pop… make no mistakes") and a specific chat (Astro, Tailwind, hex colours, Fraunces/Inter, a 12-column grid, a three.js hero, Stripe links…).
- **The specific chat's lines:** each area of the prompt is its own `.chat-line`. The Colours, Type and Layout lines are `[data-crop-area]`.
- **The old slide 2,** "Specific Instructions = creative decisions.", is gone. It's beats 4–5 of slide 1 now, so the tab has 25 slides.
- **Beats:**
  1. The vague chat, alone and centred at 32/40 (`data-solo`).
  2. It moves left and shrinks to 24/32. The specific chat rises in and types.
  3. "Specific Instructions = specific results." pours in, on the base line at 64/72 bold across 12 columns (`data-statement="large"`).
  4. Box 1 and box 2 change together:
     - **Box 1** erases, then shrinks to nothing onto its top-right corner (`data-leave="shrink"`).
     - **Box 2** erases its non-focus lines (400), keeping their room, then splits into three boxes (400) on its own columns. The middle box is centred in the frame, and the outer two are half a link run above and below it.

     Then the base-line statement sinks, and the stacked "Specific instructions / =" pours in at the top left.
  5. "creative decisions" pours in below "=". Then ink bars wipe in behind the three areas, left to right. Then three lines draw from each box's left-edge centre to 8 units past the phrase, bending 45° at the midpoint and converging on one point.
- **Back** reverses every beat.
- **Last fix:** you saw box 2's erase and split as one motion. The cause was the lines rewrapping and closing while they erased. The erased lines now keep their height, and only the split closes them. Measured: the erase runs 0–425 ms with nothing moving, the split runs 459–860 ms.

### 3. Code
- **`lab/js/artefact.js` (new):** typing, with `typeTo` / `setTyped` and a block cursor. A turn types in over 400 ms in all. Its box grows a line at a time.
- **`lab/js/slides.js`:**
  - `data-enter` / `data-exit` on visuals and sentences.
  - The solo placement.
  - Template morph (`data-templates`, built but unused).
  - A beat-phase engine (`beatPhases` / `runBeat`): within a beat it runs leave and crop together, then the statement change, then marks, then links. Back runs the same phases reversed.
  - `setCropZoom`, `setMarks`, `setLinks`, `placeStack`, `linkPoint`.
- **`lab/css/layout.css`:** chat styles scaled by `--s`, `.chat-line`, `.chat-mark`, `.slide-links`, the large statement, and the stack placement.
- **`lab/js/text-raster.js`:** it skips `visibility: hidden` text, and takes `svg[data-weight]` as the stroke width.
- **Bugs fixed:**
  - text-layer.css forced statement weight 400; it now inherits.
  - `display:flex` beat `[hidden]` on artefacts.
  - The lab has no `--weight-*` / `--type-*` tokens, so use literal values there.
- **Docs:** the mechanics are recorded in `slide-templates.md` (attributes, beat phase order), `text-artefacts.md` (Built so far, crop/split, marks, cross-links) and `lab/CLAUDE.md`.

## Current state
- **To run it:** `python3 serve.py`, then `/lab/layout.html#advanced-topics`.
- **How it was checked:** probes in the browser pane (end states with motion off, and per-frame timing with motion on). You judged the visuals in Chrome. You haven't yet seen the motion after the last fix.
- **Known rough edges, not raised as issues:**
  - The first area box dips about 10 px when the split starts, because the turn's padding drops at p > 0.
  - The `[Placeholder]` statements on other slides still need real lines.

## Working preferences (from this session)
- Design-system docs are reference, not blockers. Graphics get built per slide.
- Record docs at session end only. Writing them each change costs context.
- Don't mention commit status every turn.
- Rows are loose: only flag real overlaps or clipping. Columns still matter.
- You verify visuals. Probes cover behaviour and timing.
- When you report a motion problem, probe the actual beat first. Check the starting index: a probe that starts on the wrong beat is invalid.

## Next session
- **Slide 2 onward,** one visual at a time. Grill each with `grill-me`, and ask before inventing visuals the script marks *needed*.
- **Reuse:** the chat artefact, crop/split, marks and links are now reusable on any slide through the attributes above.
- **Still to build** for later slides: the agent's turn, the other artefact kinds (document, file tree), carried spans, retype of changed text, blur, and new scenes in `lab/js/graphics/`.
- **Remove** the temporary dialkit-hide style when the layout work ends.
