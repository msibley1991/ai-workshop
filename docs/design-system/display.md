# Display layer

Status: **exploration**, from the display grilling session (2026-11-21). The look was tuned on the lab layout page ([`lab/layout.html`](../../lab/layout.html)), which is the working basis for the real site. The values below are `lab/presets/render.json`, the shared render settings every lab render page loads (colours come from the palettes). It hasn't been tested on a projector yet (see "Projector test").

## What it is
- The page is drawn through a WebGL "pre-window" display. The DOM is laid out but transparent. Each frame, [`lab/js/text-raster.js`](../../lab/js/text-raster.js) redraws it into a low-res canvas, and [`lab/js/renderer.js`](../../lab/js/renderer.js) runs the passes: content → ghost → blur → display.
- **It stays on the real site as the one renderer.** The settled rules assume it: no fades (motion.md), weights and hatching in emulated pixels (graphics.md), the genie's trail from ghosting, and links and selected text drawn by the raster.
- **One look.** There's no separate presenter or reader look. Viewers who want it calmer use the controls (Motion, Blur, Scanlines). Projector wash-out is a test for the one look, not a second preset. The look is split only if the projector test shows a fix that breaks the laptop view.

## The look
| Effect | Value | What it does |
|---|---|---|
| Emulated pixel | 1 unit (locked) | the screen is always 1080 emulated rows tall, rounded to whole device pixels |
| hardText | 1 | text edges thresholded to 1-bit |
| Glow | intensity 1, radius 1.5, no tint | a soft halo around ink |
| Ghost | decay 0.9, scrollGain 0, blur 0.5 | phosphor trails behind anything that moves; trails persist only on bare ground, so a colour change in place cuts on its first frame |
| Ghost colours | 2 layers, blend, 5 frames per layer, shift 0.4 | trails drift through the palette's ghost colours as they fade |
| Scanlines | opacity 0.5, pitch 2 emulated px, snap scroll | screen texture; scrolling moves in whole scanline steps |
| Jitter | 1.1 emulated px | rows wobble sideways (ambient) |
| Warp | strength 4, size 0.05, 4 per minute, 5.5 s to roll, randomness 0.67 | a rolling CRT band shears rows sideways (ambient) |
| Flicker | 0 | not part of the look |

- **The emulated pixel is locked at 1 unit.** Line weights, hatch spacing, dashes and leader gaps are all counted in emulated pixels, so a larger pixel would double them all and drop Label text to 12 emulated pixels tall. On a 1080p projector one emulated pixel is one real pixel, so there the low-res character comes from the scanlines, hardText and the coarse 4 / 2 weights.
- **Palettes share these values,** light and dark alike. A palette changes colours only (see [palettes.md](palettes.md)).
  - The dark palettes (Plasma, Vector) are to be checked by eye. The effects run in "ink space", so on a dark ground the same glow reads as a brighter bloom.
  - **The one allowed exception:** if the dark palettes need it, a glow strength for dark grounds, picked automatically by the ground's mode. Everything else stays shared.

## Ambient effects
- **Warp and jitter run all the time,** even when nothing is changing. They belong to the screen, not the content.
- They're never timed to a step, and they never stand for anything. Meaning in motion belongs to the loops in [motion.md](motion.md), such as blink for focus and flow for a working connector.
- **No content motion may look like them,** so the motion vocabulary has no sideways shear or row wobble.
- Motion off removes them.

## Viewer controls
These are overrides applied on top of the look at render time (`applyViewer()` in [`lab/js/viewer.js`](../../lab/js/viewer.js)). Turning one back on restores the tuned values. The panel itself is specified in [palettes.md](palettes.md).

| Control | Off removes |
|---|---|
| Motion | ghost trails, jitter, warp and flicker; transitions cut |
| Blur | glow and ghost blur; text goes to plain antialiasing (hardText 0) |
| Scanlines | the scanlines (or pixel grid); snap scroll stays |

- **Scanlines is its own switch** for screens and projectors that rescale the image, where pitch-2 lines turn into moiré. Blur no longer touches the scanlines.

## Fallback
- **Without the display, the page shows its DOM as plain text.** The text is only made transparent once the renderer has drawn its first frame (a class it sets). If WebGL is missing or blocked, JavaScript is off, or a script fails first, the DOM stays visible in the palette's ground and ink, in Chakra Petch, on the same grid.
- The fallback has no effects, graphics or genie. Steps still change the text.
- **A low frame rate is not a reason to fall back.** A slow device keeps the display, and the viewer can turn effects off.

## On the real site
- **Performance to carry over:** the raster's cost is in painting graphics, not in measuring the page (about 1 ms). Keep the lab's caching (two looks per graphic, flow packets drawn on top), the span-based fills and the box-limited leader anchors, and skip hidden content when measuring (see [graphics.md](graphics.md), "Rendering cost").
- **Code:** the raster, the passes, the scene engine and the viewer controls move into the site's `js/`. The dial panels, the preset actions and the vendored dialkit stay in the lab. **The live site has no dial panel.**
- **The look:** one frozen file (proposed `js/display/look.js`) holding only the display values above, plus the dark-glow exception if it's needed. Colours stay in the palettes file. Layout, type and spacing tokens stay in `:root` in `css/style.css`. The effect values aren't CSS tokens, because only the WebGL passes read them.
- **Changing the look:** tune on the lab layout page, then update the look file and this doc together.
- **Lab clean-up (done):** `dark.json`, `presenter.json` and `reader.json` are retired. `light.json` became `render.json` (2026-11-22): one Render menu shared by the layout, genie, type and hierarchy pages, with one save, and no colours, theme or light/dark mode, which all come from the palettes. Its `outline` (the 2-pixel chrome line) doesn't go into the site's look file: there, the line token is in `:root`.

## Projector test
Run once, at the venue or on a comparable projector. Change the one look only for something that fails.
1. **Setup:** the projector at its native resolution, the browser fullscreen, mirroring (not scaled). Note the projector's resolution and the room's lighting.
2. **Scanlines:** no moiré or banding. If there is some, turn Scanlines off for that screen. Lower the tuned opacity only if the lines still read badly at native resolution.
3. **Type:** Label (24) and Statement (48) can be read from the back row, in Ink and in one dark palette.
4. **Hatching and edges:** steps T1–T3 still read as three different shades, and the 4-pixel graphic edges (there's no heavier outer outline since 2026-11-22) still hold an object's shape against the ground.
5. **Accent and links:** orange focus and blue links stay clearly apart from the ink.
6. **Motion:** the genie and a step tween can be followed. Ghost trails don't smear into the next slide, and warp and jitter don't pull the eye while you're talking.
7. **Motion off, Blur off and Scanlines off** each still look intended.

## Open
- The projector test itself.
- Checking Plasma and Vector by eye, and whether they need the dark glow.
- Building the fallback and the frozen look file when the site is built.
