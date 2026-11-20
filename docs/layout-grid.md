# Layout grid and spacing

Status: **exploration**. Decided in the first design-system grilling session (2026-11-20) and built on the lab layout page ([`lab/layout.html`](../lab/layout.html), [`lab/css/layout.css`](../lab/css/layout.css)). The tokens move to `css/style.css` once they're called settled.

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
- **Rows:** bars 32, tab headers 64, gaps 8. The open panel gets 1080 − 16 − 64 − 128 − 32 = 840.

## Columns
- The grid lives **inside each box**: box edge → 24 inset → 12 columns with 24 gutters.
- The tab flap ends at column 4 (inset + 4 columns).
- The bottom bar's **Grid** toggle overlays the columns at 25% of the primary ink.

## Type and lines
- **Line-heights:** multiples of 8 (4 allowed for small text). No strict baseline grid. Type sizes wait for the type session.
- **Emulated pixel:** measured in units and limited to 1, 2, 4 or 8, so spacing lands on whole pixels and the look is the same on every screen.
- **Lines:** counted in emulated pixels, outline 2 and dashed 1.
- **Radius:** 8 units.
