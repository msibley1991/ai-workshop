# Handoff: slides 2–4 built, framed and 3D enter/exit motion

Follows [2026-11-22-04-max-slides-and-slide-1.md](2026-11-22-04-max-slides-and-slide-1.md).

This stretch built the visuals for slides 2, 3 and 4 of Max's Section, then replaced rise and fall with a new enter/exit rule for every visual. All of it is committed and pushed (`64b14af`, `6006064`, `0dc5979`). **Next: slide 5.**

## What happened

### 1. Slide 2 ("Design school teaches syntax and application…"), Split 6
- **Scene:** `lab/js/graphics/still-life.js`, a new `kind: "persp"` in the scene engine (`paintPersp` in `graphic.js`).
  - A sphere, a pyramid and a cube on a diagonal, in two-point perspective, hatched by a fixed light.
  - The horizon runs through the middle of the top third, and the cube sits on the upper-right thirds point.
  - The whole group sways 45° and back, 5 s each way (`loop: "sway"`). The cube's perspective lines are clipped to the grid, so they never cross the captions.
- **Beats:**
  1. Captions: Two-point perspective, Rule of thirds, Hatching.
  2. The drawing closes into a picture box. A prompt field below it ("**Prompt:** …") types in, and its three terms are marked.
- **Statement:** the second sentence is centred on the vertical middle (`data-middle`).
- **Emphasis:** text emphasis is now bold 700, never italic.

### 2. Slide 3, Text
- **Beats:** three beats, one sentence each. Sentences 1 and 2 run on in one paragraph, and sentence 3 sits two blank lines lower (`data-gap="2"`). "not" isn't emphasised.
- **Beat 3:** `lab/js/graphics/layer-cube.js` enters on the last 4 columns, vertically centred.
  - A cube of 4 slabs at 0.9.
  - Each slab twists 360° and back, 4 s each leg, 667 ms after the one above.
  - Two 8-px rings tumble on x and z, starting and ending flat on their axes.

### 3. Slide 4 ("Digital design has been constrained by technical limitations & knowledge."), Row
- **Beats:** beat 1 is the statement. Beats 2–4 bring in one site each, left to right:
  1. plain HTML, captioned "Beginnings of the web"
  2. GeoCities, "Websites for everyone"
  3. a phone feed, "Platforms and templates"
- **Layout:** the three frames share one height, and the phone stands on its box's left edge.
- **Loops (`lab/js/site-loops.js`):**
  - **GeoCities:** stepped GIFs at 125 ms per step: the marquee, a blinking NEW! badge, marching construction stripes, and a hit counter.
  - **Feed:** scrolls smoothly and endlessly.
- **Look:** links are in the palette's link ink. The NEW! badge is in a top layer (`data-top`) with a ground fill.
- **Raster additions (`text-raster.js`):**
  - hatched fills (`data-hatch`, `--hatch-shift`)
  - per-corner radii
  - clipped SVG shapes, with fills from `data-fill-ink`
  - the top layer

  `text-layer.css` gives drawn SVGs no fill, so the browser can't paint them black.

### 4. New motion rule: open / close and wipe (recorded in `motion.md`, "Enter and exit")
- **Framed visuals** are the chats, the prompt, the sites, and `page-layout`'s frame. Their frame is marked `data-frame`, or `container: true` on a flat shape.
  - **Enter:** the frame grows from its top-left corner (400), the content wipes downward (400), then the caption cuts in.
  - **Exit:** the reverse.
  - **Text artefacts** type their content instead of wiping it (800) and erase before closing. On a slide change they erase during the text out.
  - **Slide 1's split boxes:** text, marks and links erase with the text out, then each box closes.
- **3D scenes** (the hero stack, the still life, the layer cube) wipe in downward and out upward (800). Captions cut in after the wipe.
- **Slide 2's picture box** counts as a frame. Leaving, its drawing wipes up with the prompt's erase, then both frames close together.
- **Pause:** a slide change holds 400 ms between the old visuals leaving and anything new arriving. Beats have no pause.
- **How it's built:**
  - The raster draws a frame partway open from inline `--open` and `--wipe`. On a `data-clip`, they also cut its descendants, nested clips included. The layout never moves.
  - Scenes go through `setGraphicOpen()`: `Raster.clip` for flat scenes, the picture box for perspective scenes, and a post-paint row wipe for the rest.
  - In `slides.js`: `frameItem`, `wipeItem`, `enterItem`, `leaveItem`, `eraseArtefacts`, `wipeBoxed`. `tween()` items can carry their own `ms`.
- **Removed:** `data-open` and `data-leave="shrink"`. Rise and fall remain only for the footer's section title.

### 5. Repo
- **README:** a "Working together" sync workflow (fetch, then merge `origin/main`) and the lab's current settings.
- **CLAUDE.md:** a Git workflow section. You work directly on `main` until your colleague joins.
- **Ignored:** `demos/`.

## Current state
- **Run:** `python3 serve.py`, then `/lab/layout.html#advanced-topics`.
- **How it was checked:** probes in the browser pane cover behaviour and timing. You checked the look in Chrome: slides 2–4, the framed open, the phone fix, slide 2's exit, the perspective clip and the 3D wipes.
- **Known rough edges, not raised as issues:**
  - The script (`docs/max-pres-draft/max-pres-v3.md`) still has slide 4's old statement wording.
  - `graphics.md` has no section on perspective scenes yet. The still-life file and `paintPersp`'s comments are the reference.

## Next session: slide 5
- **Slide 5** is in section "State of digital media", right after slide 4.
  - **Statement:** "Current system = ∞ programs that all do similar but slightly different things for different uses."
  - **Visual:** the script asks for *multiple filetypes scrambled together*. Later slides reuse this "filetype knot": it bounces with the artist template, then merges into a whirlpool. Design it to carry forward.
- **Approach:** grill it first with `grill-me`. Ask before inventing visuals the script marks *needed*.
- **Reusable now:**
  - open / close (`data-frame`) and the 3D wipe come free on any new visual
  - chats, prompts, crop/split, marks and links
  - scene kinds: iso, flat, persp
- **Remove** the temporary dialkit-hide style in `lab/layout.html` when the layout work ends.

## Working preferences
- You verify visuals in Chrome; probes cover behaviour and timing only.
- Write docs and the handoff at session end, not after each change.
- Don't mention commit status every turn.
- Design-system docs are reference, not blockers.
- Rows are loose: only flag real overlaps.
- Commit and push only when asked.
