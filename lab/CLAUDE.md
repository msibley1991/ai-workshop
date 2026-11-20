# CLAUDE.md

Effects lab for the ai-workshop site: a sandbox for tuning a "pre-window UI" display layer (low-res emulation, glow, ghosting, scanlines/grid) with live dials. Direction lives in [../docs/aesthetic-direction.md](../docs/aesthetic-direction.md). It's a sandbox: findings feed the real site's design system, and nothing here is final.

## How it works
- The DOM in `index.html` is **invisible** (transparent text). It does layout, selection, copy and find.
- Each frame, `js/text-raster.js` redraws that layout (words, boxes, fills, SVG shapes, selection) into a low-res 2D canvas, using document coordinates measured once per layout change.
- `js/renderer.js` (three.js) composites that canvas plus the 3D object into a low-res buffer, then runs `js/passes/*`: content → ghost → blur → display.
- Effects work in **ink space**: light themes are inverted so ink is always bright on dark, then inverted back in `display.js`.

## File map
- `index.html`: specimen content. `data-ink="phosphor|accent|dim|ground"` sets color (a CSS `--ink` custom property wins, so `:hover` rules can recolor; `ground` knocks text out of a fill), `data-box` draws a border (honors CSS `border-radius` and `dashed`), `data-fill` a fill (CSS `--fill-alpha` sets its opacity; hidden fills are skipped), `svg[data-draw]` shapes are traced, `img[data-draw]` images are stretched to their box and tinted with their ink, `data-tab` draws the notched Figma tab outline sized to the element (CSS `--line`, `--tab-header`, `--tab-flap` for where the notch ends, and `--tab-fill` to fill the header strip), and anything inside `data-clip` is drawn clipped to that element.
- `layout.html` + `css/layout.css` + `js/layout.js`: site layout test from the Figma frames "ref1" (home, node 313:125) and "ref2" (section view, node 313:148). The intro and tabs are an accordion: scrolling scrubs between them and snaps to a whole section; clicks, keys and the URL hash (`#foundations` etc.) animate straight there. Tab headers invert on hover/focus. The page is a canvas 1080 units tall scaled to the screen height (`--u` = screen px per unit, width clamped to 1440–1920 units); every length is in units, and the 12-column grid lives inside each box (`--box-inset`, `--col`, `--span-N`, `.site-grid`). Decisions are in [../docs/design-system/layout-grid.md](../docs/design-system/layout-grid.md). The bottom bar's Grid toggle shows the columns at 25% of the phosphor ink (remembered in localStorage). Pages fire `lab:layout` on `window` to force a re-measure when layout changes without a resize (here, every animation frame). `<body data-preset="light">` loads that preset on every load; `data-panel-id` keeps its dial values separate from the specimen's. Type is fixed in CSS (Eurostile, local font), so the Type dials don't apply. `<body data-canvas>` makes `js/main.js` treat pixelScale as units (snapped down to 1/2/4/8) and count lines in emulated pixels: the Outline dial sets `--line` (bars and tab outlines) and `--line-dashed` (graphic frames) is one emulated pixel.
- `css/text-layer.css`: layout of the invisible DOM; type sizes are CSS variables set from the dials.
- `js/params.js`: **all** dial definitions and defaults (including `warp`, the rolling CRT/tape wave applied in `passes/display.js`). Add new parameters here first.
- `js/panel.js`: dialkit panel and preset actions. `js/scroll.js`: snapped render offset and scroll velocity.
- `js/main.js`: frame loop.
- `presets/*.json`: named presets (partial values are fine). Add the file name to `presets.file` options in `js/params.js`. The panel's "Save to preset" overwrites the selected preset file with the current dials (needs `serve.py`, which accepts that PUT from this machine only).
- `vendor/dialkit/`: vendored dialkit 2.1.0 (plain-JS build). three.js loads from jsdelivr via the import map.

## Conventions
- Plain HTML + ES modules, no build step. Serve the repo root with `python3 serve.py` (port 8123, no browser caching) and open `/lab/`.
- Any new visual element must be drawable by `text-raster.js` (or the 3D pass), or it won't show.
