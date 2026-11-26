# Playground

Status: **exploration**. Decided in the playground grilling session (2026-11-26). Nothing is built yet. The build order is at the end.

The playground is a page where viewers try the tools the talk was made with: the genie, the shading, the type and the display. Changes there are the viewer's own, and they follow the viewer onto the talk and the glossary. Slide 16 links to it ("Test these tools out at the playground").

## The page
- **One page,** `playground.html` at the site root, on the same canvas, bars and display layer as the talk.
- **A tab per tool** in the site's accordion: Genie, Shading, Type, Display. Each tab can be linked to directly (`playground.html#genie` and so on), as the talk's tabs are.
- **Each tab has a specimen** beside its controls: test content made for that tool, not a slide from the talk. The specimens are drawn by the site's engine, so what viewers see matches the talk.
  - **Genie:** a multi-line statement block with its sink square, and Genie out / in buttons.
  - **Shading:** a step ramp, a flat diagram and an isometric object. All three are drawn by the site's graphic engine, not the lab's standalone shading canvas.
  - **Type:** a ladder of the exposed roles (display, statement, body, label).
  - **Display:** text, boxes and something that moves, so glow, trails, lines, noise and warp all show.

## Controls
A curated few per tool, 4–6 each, chosen so each one visibly changes the talk. They can be changed later in the stores without changing the interface.

| Tool | Setting | Control | Key |
|---|---|---|---|
| Genie | Speed | slider | `lineTime` |
| | Overlap | slider | `lineGap` |
| | Swing | slider | `swing` |
| | Bends | steps 1 / 2 / 3 / 4 | `bends` |
| | Smear | slider | `smear` |
| Shading | Style | steps: Hatch / Bayer 4×4 / Halftone dot / Line screen / Blue noise | `technique` + `pattern` |
| | Angle, Spacing, Line width (Hatch only) | sliders | `hatch.angle`, `hatch.spacing`, `hatch.lineWidth` |
| | Cell size (dithers only) | slider | `dither.cellSize` |
| | Light angle (every style) | slider | `lightAngle` |
| Type | Display, Statement, Body, Label | steps − / 0 / + (one step on the spacing scale) | `display`, `statement`, `body`, `label` |
| Display (per palette) | Glow | slider | `glow.strength` |
| | Trails | slider | `trails.length` |
| | Lines | steps scanlines / pixel grid / off, plus a strength slider | `lines.type`, `lines.strength` |
| | Noise | slider | `noise.jitter` |
| | Warp | slider | `warp.strength` |

- **The keys are the settings' existing names** (see display.md and motion.md), so the playground, the presets, the code and the docs share one name for each setting.
- **Error diffusion is left out** of the shading styles (Floyd–Steinberg, Atkinson). It needs a whole-image pass and crawls while graphics move.
- **Type range:** each role moves at most one step up or down the spacing scale (statement 48 → 32 or 64). Line-height follows the role: display's equals its size; statement, body and label run 8 more than their size (48/56, 32/40, 24/32). The tightest slides get checked at each end, and overflow is clipped by the existing `data-clip`.

### The two controls
Both have to be drawable by the raster, so they're made of boxes, fills and bar text.
- **Steps:** a row of bar buttons, as in the Controls panel's on / off rows. The chosen one is pressed (`aria-pressed`) and inverted.
- **Slider:** a real `<input type="range">` laid out invisibly, for keys, touch and screen readers. It's drawn as a boxed track (`data-box`) with a filled bar up to the value (`data-fill`, its width from the value), and the value as bar text beside it. It sits on the grid, in units.

## Where the values live
- **Saved defaults are presets,** static JSON committed to the repo and loaded like the palettes:
  - `presets/genie.json`
  - `presets/shading.json`
  - `presets/type.json`
  - `presets/palettes.json` for the display effects, as now

  The constants in code (`settings` in `js/genie-warp.js`, `ISO_STYLE` in `js/shade.js`) stay only as fallbacks for a missing file.
- **The viewer's changes** are kept in localStorage, on top of the presets, and apply on every page. Display changes are kept per palette, so switching palette shows that palette's own values with the viewer's changes to it.
- **Reset:**
  - Each playground tab has a Reset bar button.
  - The `[c]` Controls panel on every page gets a "Playground changes: reset" row, shown only when something differs from the saved look.
- **Saving the defaults:** on localhost, each tab shows "Save as default". It writes that tool's preset through `serve.py`, and the published site (static) hides it.
- **Your full dials:** each tool's dialkit panel (Genie with its graph editor, Shading, Type scale) moves onto its playground tab, localhost only, as Display and Palette are on the talk. It edits the same store that "Save as default" writes. After that, `lab/` is deleted, along with `type.css` and the rejected fonts in `lab/fonts/`.

## Build order
1. **Settings stores.**
   - A small store module, `js/settings.js`, for genie, shading and type: load the preset, apply the viewer's localStorage overrides, set, reset, subscribe, report whether anything differs, and save the preset on localhost. `viewer.js` is the pattern to follow.
   - The display store is the palette, already in `viewer.js`: add the viewer's per-palette overrides to `paletteValues()`.
   - **Genie:** the store writes into the `settings` object in `genie-warp.js`, which is already read live.
   - **Type:** `css/site.css`'s role rules (`h1`, `.site-hero-sub`, `.site-headline`, `.site-subheadline`, `.site-body` and the slide statement and label rules) switch to the `--type-*` tokens in `css/style.css`. The store sets those tokens on `:root`, then fires `lab:layout` so the raster measures again.
   - **Shading:** `ISO_STYLE` becomes the store's live object. `graphic.js` reads `ISO_STYLE.innerEdges` once, at load (`INNER`), so that has to be read at paint time. Graphics and the raster's hatch tiles repaint when the store changes.
   - **Reset:** the "Playground changes: reset" row goes into the Controls panel, in `index.html`, `glossary.html` and `js/layout.js`.
2. **The two controls:** the steps row and the slider, as markup with `css/site.css` rules. One small module binds a control to a store key.
3. **The playground page:**
   - `playground.html` and its specimens, on the accordion: reuse `js/layout.js` if its panel and tab handling holds for four tabs, and otherwise give it its own driver, as `glossary.js` is.
   - Slide 16's link gets `href="playground.html"`.
4. **Dither in the engine:**
   - One ink function in `shade.js` picks hatch or the dither `threshold()` by the style. It replaces the direct `hatchInk()` calls in `graphic.js`, `sculpt.js` and the raster's tiles in `text-raster.js`, and the tone steps in `knot.js` go through the same style.
   - A dither's pattern coordinates follow `patternAnchor`, as hatching does.
5. **Full dials onto the tabs, then delete the lab.** The genie graph editor (`lab/js/genie-graphs.js`) moves to `js/`. The lab pages' docs and links get updated.

Each step ends with probes in the browser pane (no console errors, values reaching the talk, reset working, nothing loading off localhost that shouldn't) and Max checking the look in Chrome.

## Open
- Wording of the playground's tab labels and the reset row.
- Whether the Type tab's steps should show the resulting size ("48") or only − / 0 / +.
- What the Display tab's specimen moves: a looped object, or text that genies.
