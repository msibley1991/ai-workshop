# Palettes and viewer controls

Status: **exploration**. Started 2026-11-21 and built on the talk page ([`index.html`](../../index.html), [`js/viewer.js`](../../js/viewer.js)). Viewers choose a palette themselves, so there's no single site palette. The colours below are starting values to tune by eye.

## Palettes
A palette is **a whole look** (since 2026-11-25): its colours (the ground, the ink, the accent, the link colour and the three trail colours, trail 1–3) and its display effects (sharp text, glow, trails, lines, noise and warp; see [display.md](display.md)). Only pixel size and line weight are shared. Light or dark mode follows the ground automatically: a ground brighter than mid-grey is light. It isn't a setting, because a light ground in dark mode breaks the trail maths. All four palettes start with the same effects, to be tuned per palette.

| Palette | Mode | Ground | Ink | Accent | Link | Trail 1–3 | Lineage |
|---|---|---|---|---|---|---|---|
| Ink (default) | light | `#F2F6FF` | `#00010F` | `#F38020` | `#0050FF` blue | `#FF0088` `#00C7F7` `#8A1A00` | the tuned light preset |
| Blueprint | light | `#F4F4F0` | `#0050FF` | `#F38020` | `#B8860B` gold | `#F38020` `#F3C020` `#8A1A00` | paperclip-punk source |
| Plasma | dark | `#120A04` | `#FF8A1F` | `#3D7BFF` | `#1F94FF` (complement of ink) | `#FFD27A` `#FF3D1F` `#5A1A00` | PLATO plasma panels |
| Vector | dark | `#050A06` | `#3DFF7A` | `#F38020` | `#FF3DC2` (complement of ink) | `#B6FF3D` `#1FBF5A` `#0A3A1A` | oscilloscope / radar phosphor |

- **Links:** inline links in running text use the palette's link colour and are underlined (the raster draws the underline, one emulated pixel thick).
  - The rule is the complement of the ink: the hue turned 180°.
  - Exceptions: Ink uses blue, because near-black ink has no meaningful complement, and Blueprint uses gold.
- **Selected text is the inverse:** the selection fills with the ink colour, and the selected text is knocked out in the ground colour. This holds in every palette.

"Dim" ink is still mixed from the ground and ink (55% toward the ink).

## Viewer controls
- **Opening:** the bottom bar's right end reads `[c] Controls`, and the top bar's right end shows the palette indicator (`Palette - Ink ■ ■ ■`) ([components.md](components.md)). Pressing [c] or clicking either opens the panel. [c] or Esc closes it, and its hint reads `[c] [Esc] Close`. (The lab still reads "Press [c] for controls".)
- **Panel:** covers grid columns 11–12, between the top and bottom bars. Its box runs from the start of column 11 to the right frame margin, so its width follows the columns: about 272 units on the MacBook and 314 on the projector. The rules are in [layout-grid.md](layout-grid.md) under "Panels on the grid".
- **The content reflows around it.** The content box's outline stops 8 before the panel, and the text moves off columns 11–12. The grid isn't recalculated. The bars stay full width.
  - It slides over 250 ms, or snaps when motion is off. The content reflows before it slides in and after it slides out.
- **Controls:**
  1. **Palette:** Ink · Blueprint · Plasma · Vector.
  2. **Motion: on/off.** Off removes trails, jitter, warp and flicker, and the tab accordion and the panel jump instead of animating. It starts off when the device asks for reduced motion (`prefers-reduced-motion`).
  3. **Blur: on/off.** Off removes the glow halo and the trails' spread, and sets text to a standard softening: sharpText 0, plain antialiased text.
  4. **Lines: on/off.** Off removes the lines (scanlines or pixel grid). Scroll snapping stays. It's a separate switch for screens and projectors that rescale the image and turn the lines into moiré (see [display.md](display.md)).
- **Labels:** group headings are bracketed (`[Palette]`, `[Display]`). Settings under a heading are plain rows, `Motion on / off`, `Blur on / off` and `Lines on / off`, and only the chosen option is highlighted.
- **Remembered:** each viewer's choices are saved in their browser (`localStorage` key `lab-viewer`).

## How it works in the lab
- **Source of truth:** the palettes are in [`presets/palettes.json`](../../presets/palettes.json), each with its colours and a `display` block of effects.
- **Editing:** the **Palette** dial panel edits the active palette: Colours (ground, ink, accent, link and trail 1–3), then its effects (Pixels → sharpText, Glow, Trails, Lines, Noise, Warp). Switching palette switches the effects with the colours, in the same cut.
  - Edits show live, and they're kept when you switch palettes.
  - **Save palette** writes only the active palette, colours and effects, to the file (needs `serve.py`); the others stay as saved. Unsaved edits are lost on reload.
- **Trail history:** a ground change (a palette switch or a ground edit) clears the trail history for two frames, so old trails don't smear over the new ground.
- **Colours and effects live in the palettes.** The lab's Display menu holds only the shared pixel size and line weight (`presets/display.json`); it has no colour dials and no light or dark mode.
- Motion, blur and lines are **overrides applied on top of the dials** at render time. Switching them back on restores the tuned values.

## Open
- Tune each palette's trail colours and effects. The dark palettes still have the light-tuned effects, and dark grounds may want different glow.
- Which palette is the presenter's projector default.
- Whether the dark palettes need their own "dim" mix.
