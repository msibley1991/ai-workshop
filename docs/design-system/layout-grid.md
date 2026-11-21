# Layout grid and spacing

Status: **exploration**. Decided in the first design-system grilling session (2026-11-20) and built on the lab layout page ([`lab/layout.html`](../../lab/layout.html), [`lab/css/layout.css`](../../lab/css/layout.css)). The tokens move to `css/style.css` once they're called settled.

## Canvas
- The page is one canvas, scaled as a whole. Nothing reflows.
- **Height-locked:** always 1080 units tall, scaled to the screen height. The width follows the screen's shape:
  - about 1671 units on the 16" MacBook Pro (1728×1117 fullscreen)
  - 1920 units on a 16:9 projector
- **Stopgap clamp:** width stays within 1440–1920 units (4:3 to 16:9). A narrower window scales by width and centres vertically. A wider one centres the canvas with ground at the sides.
- A responsive reflow for narrow screens is a later session.
- In CSS, `--u` is screen px per unit, `min(100dvh / 1080, 100vw / 1440)`. Every length is written as `N * var(--u)`.

## Spacing
- **Base unit:** 8, with 4 as a half-step.
- **Scale:** 4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- **Content gaps by relationship:**

| Token | Units | Use |
|---|---|---|
| tight | 8 | label and value, lines in a list |
| related | 16 | headline → sub-headline |
| group | 32 | sub-headline → body, between paragraphs |
| section | 64 | between major blocks in a panel |

## Frame and rows
- **Outer margin:** 8 on all four sides, equal to the row gap, so every box has the same thin sliver of ground all round.
- **Rows:** bars 32, tab headers 64, gaps 8. The open intro gets 1080 − 16 − 64 − 128 − 32 = 840. When a tab is open, the closed intro's gap collapses, so the first tab sits 8 under the top bar and an open tab body gets 848.

## Columns
- **One grid for the whole canvas:** frame margin 8 → box inset 24 → 12 columns with 24 gutters. It's computed from the canvas width and never recalculated. About 112 units per column on the MacBook, 133 on the projector.
- Content boxes put their content on this grid. The tab flap ends at column 4 (inset + 4 columns).
- The bottom bar's **Grid** toggle overlays the columns at 25% of the primary ink, across the whole canvas and over the panels.

## Rows
- An open tab's 800-unit content area ends in a **footer strip**: 32 for the sink (left) and the section title (right), with a 16 gap above it.
- **6 row fields of 112, with 16 gutters,** fill the remaining 752. Visuals snap to them, and text flows freely. The bottom of row 6 is the visuals' base line. The templates that use them are in [slide-templates.md](slide-templates.md).

## Panels on the grid
- **Panels cover whole columns, at most 2 each.** The viewer controls cover columns 11–12. The planned left nav will cover columns 1–2.
- **Box lines:** a panel's box runs from the start of its first column out to the frame margin. The content box's outline stops 8 before it, so content in the last open column sits 16 from the content box's line instead of 24. A panel's own contents sit 24 inside its line, so they're off the column lines.
- **Reflow, not recalculation:** the content keeps its columns and moves off the covered ones. Text reflows first, down to a minimum of 4 columns. Only then do graphics give up columns (see [graphics.md](graphics.md)).
  - With one panel open, 10 columns are left. With both open, 8 are left, which still fits a 4-column graphic and 4 columns of text.
- **Order in motion:** opening reflows the content first, then the panel slides in. Closing slides the panel out, then the content reflows back.

## Type and lines
- **Line-heights:** multiples of 8 (4 allowed for small text). No strict baseline grid. Type sizes are in [typography.md](typography.md).
- **Emulated pixel:** measured in units and limited to 1, 2, 4 or 8, then rounded to whole device pixels so scanlines and pixel rows stay even. Spacing can be off by one emulated pixel on screens where a unit isn't a whole number of device pixels.
- **Lines:** counted in emulated pixels, outline 2 and dashed 1.
- **Radius:** 8 units.
