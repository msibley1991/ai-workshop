# CLAUDE.md

Effects lab for the ai-workshop site: a sandbox for tuning a "pre-window UI" display layer (low-res emulation, glow, ghosting, scanlines/grid) with live dials. Direction lives in [../docs/aesthetic-direction.md](../docs/aesthetic-direction.md). It's a sandbox: findings feed the real site's design system, and nothing here is final.

## How it works
- The DOM in `index.html` is **invisible** (transparent text). It does layout, selection, copy and find.
- Each frame, `js/text-raster.js` redraws that layout (words, boxes, fills, SVG shapes, selection) into a low-res 2D canvas, using document coordinates measured once per layout change.
- `js/renderer.js` (three.js) composites that canvas plus the 3D object into a low-res buffer, then runs `js/passes/*`: content → ghost → blur → display.
- Effects work in **ink space**: light themes are inverted so ink is always bright on dark, then inverted back in `display.js`.

## File map
- `index.html`: specimen content. `data-ink="phosphor|accent|dim"` sets color, `data-box` draws a border, `data-fill` a fill, `svg[data-draw]` shapes are traced.
- `css/text-layer.css`: layout of the invisible DOM; type sizes are CSS variables set from the dials.
- `js/params.js`: **all** dial definitions and defaults. Add new parameters here first.
- `js/panel.js`: dialkit panel and preset actions. `js/scroll.js`: snapped render offset and scroll velocity.
- `js/main.js`: frame loop.
- `presets/*.json`: named presets (partial values are fine). Add the file name to `presets.file` options in `js/params.js`.
- `vendor/dialkit/`: vendored dialkit 2.1.0 (plain-JS build). three.js loads from jsdelivr via the import map.

## Conventions
- Plain HTML + ES modules, no build step. Serve the repo root with `python3 -m http.server 8123` and open `/lab/`.
- Any new visual element must be drawable by `text-raster.js` (or the 3D pass), or it won't show.
