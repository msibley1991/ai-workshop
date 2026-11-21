# Palettes and viewer controls

Status: **exploration**. Started 2026-11-21 and built on the lab layout page ([`lab/layout.html`](../../lab/layout.html), [`lab/js/viewer.js`](../../lab/js/viewer.js)). Viewers choose a palette themselves, so there's no single site palette. The colours below are starting values to tune by eye.

## Palettes
A palette changes **colours only**: the ground, the ink (the "phosphor" dial), the accent and the three ghost-trail colours. Light or dark mode follows the ground automatically: a ground brighter than mid-grey is light. It isn't a setting, because a light ground in dark mode breaks the ghost maths. The display effects (glow, scanlines, warp, ghosting) stay as tuned, so every palette shares one display layer.

| Palette | Mode | Ground | Ink | Accent | Ghost trails | Lineage |
|---|---|---|---|---|---|---|
| Ink (default) | light | `#F2F6FF` | `#00010F` | `#F38020` | `#FF0088` `#00C7F7` `#8A1A00` | the tuned light preset |
| Blueprint | light | `#F4F4F0` | `#0050FF` | `#F38020` | `#F38020` `#F3C020` `#8A1A00` | paperclip-punk source |
| Plasma | dark | `#120A04` | `#FF8A1F` | `#3D7BFF` | `#FFD27A` `#FF3D1F` `#5A1A00` | PLATO plasma panels |
| Vector | dark | `#050A06` | `#3DFF7A` | `#F38020` | `#B6FF3D` `#1FBF5A` `#0A3A1A` | oscilloscope / radar phosphor |

"Dim" ink is still mixed from the ground and ink (55% toward the ink).

## Viewer controls
- **Opening:** the bottom bar's right end reads "Press [c] for controls". Pressing [c] or clicking it opens the panel. [c] or Esc closes it.
- **Panel:** 384 units wide and a fixed width on every screen. It sits between the top and bottom bars at the right frame margin.
- **It pushes the page.** The panels narrow by 384 + 8, and their 12-column grid is recalculated inside the remaining width. The bars stay full width.
  - On a 1920-wide projector the panels go from 1904 to 1512.
  - On the MacBook they go from about 1655 to 1263.
  - It slides over 250 ms, or snaps when motion is off.
- **Controls:**
  1. **Palette:** Ink · Blueprint · Plasma · Vector.
  2. **Motion: on/off.** Off removes ghost trails, jitter, warp and flicker, and the tab accordion and the panel jump instead of animating. It starts off when the device asks for reduced motion (`prefers-reduced-motion`).
  3. **Blur: on/off.** Off removes the glow halo, the ghost-trail blur and the scanlines (or pixel grid), and sets text to a standard softening: hardText 0, plain antialiased text. Scroll snapping stays.
- **Labels:** group headings are bracketed (`[Palette]`, `[Display]`). Settings under a heading are plain rows, `Motion on / off` and `Blur on / off`, and only the chosen option is highlighted.
- **Remembered:** each viewer's choices are saved in their browser (`localStorage` key `lab-viewer`).

## How it works in the lab
- **Source of truth:** the palettes are in [`lab/presets/palettes.json`](../../lab/presets/palettes.json).
- **Editing:** the **Palette** dial panel edits the active palette: ground, ink, accent and ghost 1–3.
  - Edits show live, and they're kept when you switch palettes.
  - **Save palettes** writes all four to the file (needs `serve.py`). Unsaved edits are lost on reload.
- **Ghost history:** a ground change (a palette switch or a ground edit) clears the trail history for two frames, so old trails don't smear over the new ground.
- **Effects dials:** the active palette is written into the effects dials after the page's pinned preset loads. Don't tune colour in the Effects Lab's Theme folder on this page, because the palette overwrites it on reload. In that folder, the palette's ink is the `phosphor` colour.
- Motion and blur are **overrides applied on top of the dials** at render time. Switching them back on restores the tuned values.

## Open
- Tune each palette's ghost colours and check the dark palettes against the light-tuned effect preset. Dark grounds may want different glow.
- Which palette is the presenter's projector default.
- Whether the dark palettes need their own "dim" mix.
