# Handoff: slides 5–8, the filetype knot and the template sculpture

Follows [2026-11-23-01-slides-2-4-and-motion.md](2026-11-23-01-slides-2-4-and-motion.md).

This session built slides 5–8 of Max's Section, each grilled first with `grill-me`. They share two carried visuals: the "filetype knot" and the artist template site. All of it is exploration. **Next: slide 9.**

## What happened

### 1. Slide 5 ("Current system = ∞ programs…"), Split 4
- **Scene:** `lab/js/graphics/filetype-knot.js`, on a new scene kind `knot` (`lab/js/knot.js`).
  - 8 file glyphs (.psd .blend .fig .aep .sbsar .c4d .indd .prproj, code face, lowercase) on one elastic trefoil cord.
  - 3D positions drawn flat: the glyphs are billboards and always draw above the cord.
  - It tumbles slowly. `phase: 6` keeps every file off the tumble axis.
  - Files can be dragged and spring back (an underdamped spring).
- **Beats:** 1, the files apart. 2, the cord ties them.
- **Tuning:** box 960×760, font 32, scale [150,84], tilt 10.

### 2. Slide 6 ("Templates made using the web easy, but boring."), Row
- Three DOM template sites (`.tpl-site`) from one template: the shop, the artist (in the middle) and the café. Each has a nav, a hatched hero, three cards and a footer.
- **Beat 2, the stack:** the shop and café slide onto the artist while their content (`.tpl-content`) wipes out, then they're **cut** away. A close animation read as the outline glitching, so it was dropped.
- Markup: `data-stack="1"` on the copies, `data-stack-target` on the artist. Code: `stackRun` in `slides.js`.

### 3. Slide 7, the "Old way" comparison
- The artist site carries over from slide 6 (`data-carry="artist-site"`) into columns 7–10. The knot wipes back in on columns 1–5 (`data-inset="64"`, so it clears the top).
- A grid statement (`data-place="grid"`) holds:
  - "Old way:" at 64/72 on the base line
  - a caption under each visual on row 5, at 32/40: "Hard tech, cool graphics" and "Easy tech, boring graphics"
  - "or" at 64/72, centred in column 6
- **Beats:** graphics first, then the words (`data-enter="1"`).
- Fixed: slide 7 needed 3 presses to leave. `beatsOf` counted every sentence as a beat; it now follows `data-enter`.

### 4. Slide 8 ("But what if it *stopped* being technically challenging…"), one beat, one sequence
On one clock (state 2, 5700 ms), in order:
1. The knot drifts to column 5 and drains like a whirlpool into a `project/` folder.
2. Four icon tiles (3D, Texture, Layout, Motion) fan out left on connectors with flow packets.
3. The template's content wipes out, and `lab/js/sculpt.js` takes over, pixel-exact. Its face pivots about the vertical into iso, toward the folder.
4. A straight link draws from the folder's middle to column 6's right edge.
5. The cards extrude, then spin-swap into an icosahedron, a (2,3) torus knot and a twisted prism. They bob.

- **The page:** unshaded (ground with outlines). Only the boxes and solids are hatched.
- **The sculpture's size:** fitted to columns 7–12 and all 6 rows. It's about 4.3 columns wide.
- **The solids:** they stand off the face (`EMERGE 1.2`) and sit one column left (`SHIFT 1`), and the page doesn't move.
- **Turning the solids:** once the build has finished, each solid drags to turn on its own (a `Spin`) and springs back.
- **Carry:** the knot's box spans 12 columns × 6 rows, but `data-fit-rows="4"` keeps slide 7's scale through the carry.

### 5. Slide links (QOL)
- The URL now follows the talk: `#advanced-topics/8` is slide 8, and `#advanced-topics/7.2` is slide 7's second beat. A reload or a pasted link cuts straight there.
- Code: `writeHash()` and `goHash()` in `layout.js`, and `slides.jump()`.
- **Note for probes:** a hash-only navigation doesn't reload the page's modules. Use `location.reload()` after code changes.

### 6. Docs updated
- `graphics.md`: a "Knot scenes and the sculpture" section.
- `motion.md`: the stack move, and "One-beat sequences".
- `slide-templates.md`: the new attributes and links.
- `lab/CLAUDE.md`: `knot.js` and `sculpt.js`, slide links, artefact carry.

## Current state
- **Run:** `python3 serve.py`, then `/lab/layout.html#advanced-topics/5` through `/8`.
- **How it was checked:** probes in the browser pane cover behaviour, positions and timing. You checked the look in Chrome through the slide 8 tuning.
- **Not yet confirmed in Chrome:**
  - the last round: the tiles inset, the solids one column left, the solid drag
  - the links, which you'll see on your next reload
- **Rough edges:**
  - The knot repaints every frame (`now` is in its look key). That's fine so far, but watch for stutter on slide 8 with the projector.
  - The solids' drag pitch uses the iso clamp (−ISO_PITCH to 90 − ISO_PITCH), so they can't be flipped fully over.

## Next session: slide 9
- Pick up after slide 8 in `lab/layout.html` and the script (`docs/max-pres-draft/max-pres-v3.md`).
- Grill it first with `grill-me`. Ask before inventing visuals the script marks *needed*.
- **Reusable now:**
  - carries (`data-carry` for artefacts, scene names for graphics)
  - grid statements
  - stack
  - one-beat sequences
  - the sculpture's solids
  - per-visual `data-cols`, `data-at`, `data-rows`
- **Remove** the temporary dialkit-hide style in `lab/layout.html` when the layout work ends.

## Working preferences
- You verify visuals in Chrome; probes cover behaviour and timing only.
- Write docs and the handoff at session end, not after each change.
- Don't mention commit status every turn.
- Design-system docs are reference, not blockers.
- Rows are loose: only flag real overlaps.
- Commit and push only when asked. Work on `main` until your colleague joins.
