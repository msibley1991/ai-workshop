# Handoff: layout grid, spacing scheme and warp dials

Follows [2026-11-20-02-lab-ghost-layers-and-layout.md](2026-11-20-02-lab-ghost-layers-and-layout.md). This session started the **design-system grilling sessions**, which settle the design system one topic at a time. The first topic was the layout grid and spacing.

## What happened
1. **Box alignment.** On `lab/layout.html`, the top and bottom bars, the tabs and the dashed graphic boxes now share the same left and right edges.
2. **Grilling session: layout grid and spacing.** The decisions are recorded in [docs/design-system/layout-grid.md](../design-system/layout-grid.md). In short:
   - **Canvas:** the page is one canvas, 1080 units tall, scaled to the screen height.
     - The width follows the screen's shape: about 1671 units on the user's 16" MacBook Pro (1728×1117 fullscreen), 1920 on a 16:9 projector.
     - The width is clamped to 1440–1920 units as a stopgap. A responsive reflow comes in a later session.
   - **Spacing:** 8-unit base. Scale: 4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
   - **Content gaps:** tight 8, related 16, group 32, section 64.
   - **Frame:** an 8 margin on all four sides, equal to the row gap.
   - **Rows:** bars 32, tab headers 64.
   - **Columns:** the grid lives inside each box. Box edge → 24 inset → 12 columns with 24 gutters. The tab flap ends at column 4.
   - **Line-heights:** multiples of 8 (4 allowed for small text).
   - **Lines:** counted in emulated pixels. The emulated pixel is measured in units (1/2/4/8) and rounded to whole device pixels.
3. **Built on the lab layout page** (`lab/css/layout.css`, `lab/layout.html`, `lab/js/main.js`, `lab/js/layout.js`, `lab/js/text-raster.js`).
   - `--u` is screen px per unit. `<body data-canvas>` switches on unit-based pixels and lines.
   - **Grid toggle:** the bottom bar has a toggle that overlays the columns at 25% of the phosphor ink. Its state is remembered in localStorage.
   - **`--fill-alpha`:** `[data-fill]` now supports this. Translucent fills are drawn pre-blended over the ground, so a high `hardText` doesn't erase them.
   - **Collapsed gap:** when a tab is open, the closed intro's gap collapses, so the top tab sits 8 under the top bar.
4. **Scanline banding fix.** A fractional pixel size (1.034 CSS px on the MacBook) made some rows and scanlines a device pixel taller, which showed as darker bands. Emulated pixels are now rounded to whole device pixels.
5. **New Warp dial group:** a rolling CRT/tape wave applied in `lab/js/passes/display.js`.
   - The dials are strength, size, frequency, speed and randomness.
   - Strength 0 is off. Scanlines stay fixed while the image bends.
6. The user re-saved `lab/presets/light.json`. Notable values: hardText 1, glow 0, scanline opacity 1, plus their warp values.
7. The layout grid doc moved into `docs/design-system/`, which will hold the design-system docs from these sessions.

Commits: `f218913`, `479f106`, and this one (doc move and handoff). Everything is pushed to `origin/main`.

## Current state
- Run it with `python3 serve.py`, then open http://localhost:8123/lab/layout.html.
- Type sizes on the layout page are fixed placeholders (h1 128/128, sub 64/72, headline 64/64, body 32/40). They wait for the type session.
- Blocky ghost trails come from the preset (glow 0, hardText 1), not from a bug.
- I couldn't drive dialkit sliders from the built-in browser. I checked that the warp shader compiles, but the user tuned the wave by eye.

## Working preferences (from this session)
- Ask grilling questions one at a time, each with a recommended answer. Explain unfamiliar terms (for example "stage") plainly when asked.
- Read facts from the machine where you can, for example display resolution with `system_profiler`, instead of asking.
- The user checks visuals. Verify with geometry, console and math checks only, no screenshots.
- Commit and push only when asked.

## Open items
- More design-system grilling sessions. The likely next topics are typefaces and the type scale, then the palette and the light/dark default.
- A responsive reflow for narrow screens, to replace the stopgap clamp.
- Promoting the tokens from `lab/css/layout.css` to `css/style.css` once they're settled.

## Suggested skills
- `grill-me` for the next design-system topics.
- `design:design-system` once the tokens are ready to move to `css/style.css`.
- `diagnose` for display and effect bugs.
