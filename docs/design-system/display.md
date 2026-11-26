# Display layer

Status: **exploration**, from the display grilling session (2026-11-21). The look was tuned on the lab layout page ([`lab/layout.html`](../../lab/layout.html)), which is the working basis for the real site. Each palette carries its own effects (2026-11-25); the values below are the starting values all four palettes share for now, in each palette's `display` block in `lab/presets/palettes.json`. Only pixel size and line weight are shared, in `lab/presets/display.json`. It hasn't been tested on a projector yet (see "Projector test").

## What it is
- The page is drawn through a WebGL "pre-window" display. The DOM is laid out but transparent. Each frame, [`lab/js/text-raster.js`](../../lab/js/text-raster.js) redraws it into a low-res canvas, and [`lab/js/renderer.js`](../../lab/js/renderer.js) runs the passes: content → trails → blur → display.
- **It stays on the real site as the one renderer.** The settled rules assume it: no fades (motion.md), weights and hatching in emulated pixels (graphics.md), the genie's trail from the trails, and links and selected text drawn by the raster.
- **One look per palette** (2026-11-25; until then every palette shared one look). A palette is its colours plus its effects, so choosing a palette chooses the whole look. There's still no separate presenter or reader look: viewers who want it calmer use the controls (Motion, Blur, Lines). Projector wash-out is a test for each palette's look, not a second preset.

## The look
The settings are named and grouped as in the lab's menus ([`lab/js/params.js`](../../lab/js/params.js)): the effects are in the **Palette** panel (`paletteDisplayConfig`, per palette), and Pixels → size and Interface → lineWeight in the **Display** panel (`sharedDisplayConfig`, shared). A menu label is its key in words (`sharpText` is "Sharp Text"), so the names below are the same in the menus, the presets, the code and these docs. Renamed and regrouped on 2026-11-25.

| Group | Setting | Value | What it does |
|---|---|---|---|
| Pixels | size (shared) | 1 unit (locked) | the emulated pixel: the screen is always 1080 emulated rows tall, rounded to whole device pixels |
| | sharpText | 1 | text edges thresholded to 1-bit (0 is plain antialiasing) |
| Glow | strength | 1 | how bright the soft halo around ink is |
| | spread | 1.5 emulated px | how far it reaches |
| | tint | 0 (unused) | how far the glow takes the main ink's colour |
| Trails | length | 0.9 | how much of a trail stays each frame. Trails are left behind anything that moves, and persist only on bare ground, so a colour change in place cuts on its first frame |
| | scrollBoost | 0 (unused) | extra length while scrolling fast |
| | spread | 0.5 emulated px | how far a trail spreads each frame |
| | colourCount | 2 | how many of the palette's trail colours a trail passes through as it fades |
| | colourMode | blend | blend glides between the colours; bands switches each in at full strength |
| | framesPerColour | 5 | frames a trail spends on each colour |
| | colourShift | 0.4 | how far each frame moves toward the next colour |
| Lines | type | scanlines | the screen texture: scanlines, pixel grid or off |
| | strength | 0.5 | |
| | spacing | 2 emulated px | |
| | snapScroll | on | scrolling moves in whole line steps |
| Noise | jitter | 1.1 emulated px | rows wobble sideways (ambient) |
| | flicker | 0 (unused) | brightness flicker; not part of the look |
| Warp | strength | 4 emulated px | a rolling CRT band shears rows sideways (ambient) |
| | bandHeight | 0.05 | the band's height, as a share of the screen |
| | perMinute | 4 | waves per minute |
| | rollTime | 5.5 s | for a wave to roll top to bottom |
| | randomness | 0.67 | varies the waves' timing, size and strength, and roughens their edge |
| Interface | lineWeight (shared) | 2 emulated px | the chrome line (`--line`: bars, tab outlines); not a display effect |

- **Every setting stays in the menus,** including the locked size and the ones the look leaves at 0, so people can try them.
- The defaults in `params.js` are these values. A palette's `display` block loads over them group by group, so a palette missing a setting gets the default.

- **The emulated pixel is locked at 1 unit.** Line weights, hatch spacing, dashes and leader gaps are all counted in emulated pixels, so a larger pixel would double them all and drop Label text to 12 emulated pixels tall. On a 1080p projector one emulated pixel is one real pixel, so there the low-res character comes from the lines, sharpText and the coarse 4 / 2 weights.
- **Pixel size and line weight are shared** by every palette, because weights and type are counted in emulated pixels: they never change between palettes.
- **Every other setting is the palette's** (see [palettes.md](palettes.md)). All four start with the values above.
  - The dark palettes (Plasma, Vector) are to be tuned by eye. The effects run in "ink space", so on a dark ground the same glow reads as a brighter bloom; a dark palette now sets its own glow instead of the dark-glow exception planned before.

## Ambient effects
- **Warp and jitter run all the time,** even when nothing is changing. They belong to the screen, not the content.
- They're never timed to a step, and they never stand for anything. Meaning in motion belongs to the loops in [motion.md](motion.md), such as blink for focus and flow for a working connector.
- **No content motion may look like them,** so the motion vocabulary has no sideways shear or row wobble.
- Motion off removes them.

## Viewer controls
These are overrides applied on top of the look at render time (`applyViewer()` in [`lab/js/viewer.js`](../../lab/js/viewer.js)). Turning one back on restores the tuned values. The panel itself is specified in [palettes.md](palettes.md).

| Control | Off removes |
|---|---|
| Motion | trails, jitter, warp and flicker; transitions cut |
| Blur | glow strength and trail spread; text goes to plain antialiasing (sharpText 0) |
| Lines | the lines (scanlines or pixel grid); snap scroll stays |

- **Lines is its own switch** (called Scanlines until 2026-11-25) for screens and projectors that rescale the image, where spacing-2 lines turn into moiré. Blur doesn't touch the lines.

## Fallback
- **Without the display, the page shows its DOM as plain text.** The text is only made transparent once the renderer has drawn its first frame (a class it sets). If WebGL is missing or blocked, JavaScript is off, or a script fails first, the DOM stays visible in the palette's ground and ink, in Chakra Petch, on the same grid.
- The fallback has no effects, graphics or genie. Steps still change the text.
- **A low frame rate is not a reason to fall back.** A slow device keeps the display, and the viewer can turn effects off.

## On the real site
- **Performance to carry over:** the raster's cost is in painting graphics, not in measuring the page (about 1 ms). Keep the lab's caching (two looks per graphic, flow packets drawn on top), the span-based fills and the box-limited leader anchors, and skip hidden content when measuring (see [graphics.md](graphics.md), "Rendering cost").
- **Code:** the raster, the passes, the scene engine and the viewer controls move into the site's `js/`. The dial panels, the preset actions and the vendored dialkit stay in the lab. **The live site has no dial panel.**
- **The look:** frozen with the palettes: each palette's colours and effects in one file (the lab's `palettes.json` shape), plus the shared pixel size. Layout, type and spacing tokens stay in `:root` in `css/style.css`. The effect values aren't CSS tokens, because only the WebGL passes read them.
- **Changing the look:** tune a palette on the lab layout page (Palette panel), then update the palettes file and this doc together.
- **Lab clean-up (done):** `dark.json`, `presenter.json` and `reader.json` are retired. `light.json` became `render.json` (2026-11-22), then `display.json` (2026-11-25), which now holds only the shared pixel size and line weight; the effects moved into each palette the same day. Its Interface group (`lineWeight`, the 2-pixel chrome line) doesn't go into the site's look file: there, the line token is in `:root`.

## Projector test
Run once, at the venue or on a comparable projector, for each palette the talk may use. Change a palette's look only for something that fails.
1. **Setup:** the projector at its native resolution, the browser fullscreen, mirroring (not scaled). Note the projector's resolution and the room's lighting.
2. **Lines:** no moiré or banding. If there is some, turn Lines off for that screen. Lower the tuned strength only if the lines still read badly at native resolution.
3. **Type:** Label (24) and Statement (48) can be read from the back row, in Ink and in one dark palette.
4. **Hatching and edges:** steps T1–T3 still read as three different shades, and the 4-pixel graphic edges (there's no heavier outer outline since 2026-11-22) still hold an object's shape against the ground.
5. **Accent and links:** orange focus and blue links stay clearly apart from the ink.
6. **Motion:** the genie and a step tween can be followed. Trails don't smear into the next slide, and warp and jitter don't pull the eye while you're talking.
7. **Motion off, Blur off and Lines off** each still look intended.

## Open
- The projector test itself.
- Tuning Plasma and Vector's effects by eye.
- Building the fallback and the frozen look file when the site is built.
