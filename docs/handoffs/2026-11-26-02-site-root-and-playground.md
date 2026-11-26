# Handoff: the talk at the site root, and the playground

Follows [2026-11-26-01-slides-15-18-hero-and-settings.md](2026-11-26-01-slides-15-18-hero-and-settings.md).

This session did the two tasks Max set: move the talk and the glossary out of the lab to the site root, then replace the lab's test pages with an on-site playground whose controls change the site. Max chose the order through grilling: migrate first. Everything is committed and pushed, in `47f9462`, `47c42ed`, `c70dc36` and `f698d51` (`git log 16f007c..f698d51`). All of it is exploration.

## What happened

### Task 1: the site root (`47f9462`)
- **Moves:**
  - The talk is `index.html` and the glossary is `glossary.html`.
  - The engine is in `js/`, `css/`, `presets/` and `vendor/`.
  - `lab/css/layout.css` became `css/site.css`.
- **Tokens and paths:**
  - The tokens are merged into `css/style.css`. The two blocks had no conflicting values, and Max confirmed the page looks the same.
  - Presets resolve from `params.js` (`presetURL()`), so pages at any depth share them.
  - `serve.py` saves to `/presets/`.
- **Published site:** it's meant to go on Vercel as static files, so every page reads `presets/display.json` itself, and dialkit loads only on localhost.

### Task 2: the playground
The design is in [playground.md](../design-system/playground.md), including the decisions from the grilling and the build order (steps 1–5, all done).
- **Settings stores** (`47c42ed`):
  - `js/settings.js` and `js/stores.js` hold the genie, shading and type settings. The saved look comes from `presets/genie.json`, `shading.json` and `type.json`, and each viewer's own changes sit on top in their browser.
  - Palette effects are kept per palette for the viewer, in `viewer.js`.
  - `[c]` Controls has a "[Playground] Changes: reset" row, shown only when something differs.
  - The talk's role rules read the `--type-*` tokens.
- **The page** (`c70dc36`):
  - `playground.html` has Genie, Shading, Type and Display tabs, each a specimen beside its curated controls (`js/controls.js`: a steps row and a slider).
  - Every tab has Reset, plus "Save as default" on localhost.
  - Slide 16 links to the page.
- **Dither shading:** Hatch, Bayer 2×2, 4×4 and 8×8, Halftone, Line screen and Blue noise, drawn through one `shadeInk()` with the dither's own tone steps (the Tones slider). Bayer sizes need their own tones: on the hatch ramp's quarters, every Bayer size lit the same pixels.
- **Fixes after Max's checks:**
  - The genie tab's sink sits bottom left.
  - Buttons no longer stay inverted after a click.
  - Display's Reset clears only the active palette.
  - The slides lay out again when a type size changes.
  - Genie in no longer glitches: it now asks for a re-measure when it unhides its block.
- **Step 5** (`f698d51`):
  - On localhost, the full Genie, Shading and Type dial panels sit on their tabs and edit the same stores as the tabs' controls. The Genie panel has the graph editor.
  - The lab is deleted. Its engine map is now [js/CLAUDE.md](../../js/CLAUDE.md).
- **Hidden dials:** Max wanted no dialkit visible on any page. I first removed it entirely, but Max asked to keep it hidden instead. On localhost every dial panel and the graph editor start hidden; `d` shows them, and `d` again hides them (remembered in the browser).

## Current state
- **Run:** `python3 serve.py`, then open `/`, `/glossary.html` or `/playground.html`. Restart any `serve.py` started before `47f9462`, or saving fails, because the save route moved.
- **Checks:** browser-pane probes covered loads, the stores, the controls, reset, the dials syncing both ways, the `d` toggle and the genie. Max checked the migration and the genie fix in Chrome. No one has checked the rest of the playground by eye yet: the controls, the specimens, the dither styles and the drag hint.
- **Docs:** CLAUDE.md, the README, `js/CLAUDE.md` and the design docs match the build. playground.md's "Open" list still holds the tab-label wording and the Type steps' labels.

## Known rough edges
- **Bigger statements:** one type step up makes slide 14's statement span rows 2–6. It may run into the docs above it on busy slides.
- **Fill seams:** the raster's fill tiles are 192 pixels. Halftone, Line screen and some hatch spacings may show a faint seam every 192 pixels in filled areas (not in the graphics).
- **Type dial:** it offers sizes only. The old hierarchy page also had line-height and weight per role.
- **Pane lag:** the browser pane's accordion can lag a tab behind after hash jumps. It's the pane's throttled frame loop, not the page.

## Next
Max hasn't picked the next task. Likely options:
- check the playground by eye, then settle playground.md's open items
- tune Blueprint and Vector's effects (still the starting values)
- slide 18's download button

## Suggested skills
- `grill-me` before designing anything new. Max grills every design first.
- `handoff` again at session end.

## Working preferences
- **Visuals:** Max verifies visuals in Chrome. Probes cover behaviour only, and probes that send keys go to `document.body`.
- **Commits:** commit or push only when asked. Max works on `main` until a colleague joins.
- **Docs:** write docs and the handoff at session end.
- **Choices:** when a choice is ambiguous ("move the dials"), confirm what it means before deleting or building a lot. This session removed dialkit and then put it back.
