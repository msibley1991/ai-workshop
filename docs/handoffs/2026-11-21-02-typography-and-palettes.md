# Handoff: typography, palettes and viewer controls

Follows [2026-11-21-01-layout-grid-and-warp.md](2026-11-21-01-layout-grid-and-warp.md). This session ran the second design-system grilling session (typography), then began on colour by building viewer-selectable palettes and a controls panel on the lab layout page.

## What happened

### 1. Typography (settled)
The full spec is in [docs/design-system/typography.md](../design-system/typography.md).
- **Faces:**
  - Chakra Petch everywhere, chosen on a specimen over Saira, Michroma + Oxanium, and Michroma + Chakra.
  - JetBrains Mono only for literal code.
  - Both are Google Fonts (OFL), self-hosted in `assets/fonts/` with their licence files. Only Chakra Petch 400, 500 and 700 ship.
- **Six roles:** Display, Headline, Statement (a beat's projected slide text), Body, Label (with bar text) and Code.
- **Floor:** 24 for anything the audience reads. Chrome may go down to 16.
- **Scale:** sizes come only from the spacing scale, and line-heights stay on multiples of 8.

  | Role | Size/line-height | Weight |
  |---|---|---|
  | Display | 128/128 | 700 |
  | Headline | 64/64 | 700 |
  | Statement | 48/56 | 500 |
  | Body | 32/40 | 400 |
  | Label | 24/32 | 500 |
  | Bar text | 16/24 | 500 |
  | Code | 24/32 | 400 |

  A tighter version on 4-unit line-heights was tried and rejected.
- **Weights:** three, 400, 500 and 700. Emphasis steps up to 700, with no italic.
- **Case:** sentence case everywhere. Caps for labels were tried and rejected.
- **Measure:** Statement and Body run at most 6 columns.
- **Vertical spacing:** headline → statement 16, statement → body 32, body → body 16, text → code or figure 32, figure → caption 16, between beats 64.
- **Where it lives:** the tokens, `@font-face` rules and emphasis rule are in `css/style.css`, along with `--u`, the spacing scale and the gaps. The lab layout page uses the settled roles in place of Eurostile.
- **Lab pages:**
  - `lab/type.html`: the face specimen, keys 1–5.
  - `lab/hierarchy.html`: a "Type scale" dial panel, presets on keys 1–4 and "Copy spec".

### 2. Raster upgrades (`lab/js/text-raster.js`)
The canvas text now honours:
- `font-stretch` (mapped to a canvas keyword)
- `text-transform`
- `letter-spacing`
- `text-decoration: underline` (drawn one emulated pixel thick)

Selected text is drawn as the inverse: an ink-coloured block with the text knocked out in the ground colour.

### 3. Palettes and viewer controls (exploration)
The spec is in [docs/design-system/palettes.md](../design-system/palettes.md).
- **Opening the panel:** on `lab/layout.html`, "Press [c] for controls" in the bottom bar opens a 384-unit panel between the bars. [c] or Esc closes it.
  - It **pushes** the panels left and re-grids them, with `--controls-open`, `--controls-push` and `--box-w` (`--col` follows `--box-w`). The bars stay full width.
  - It slides over 250 ms.
- **Panel contents:**
  - **[Palette]:** Ink (default), Blueprint, Plasma, Vector.
  - **[Display]:** "Motion on / off" and "Blur on / off". Only the chosen option is highlighted.
- **Motion off:** no ghost trails, jitter, warp or flicker. The accordion and panel jump instead of animating. It defaults off under `prefers-reduced-motion`.
- **Blur off:** no glow, trail blur or scanlines, and hardText 0 (plain antialiased text).
- **Remembered:** viewer choices are kept in localStorage (`lab-viewer`).
- **What a palette changes:** colours only (ground, ink, accent, link, ghost 1–3).
  - Light or dark mode follows the ground's brightness (`modeOf()`). It was a setting, and a stray "dark" on Blueprint broke the ghosting, so it was removed.
  - Links are the complement of the ink, except Ink (blue) and Blueprint (gold).
- **Editing palettes:**
  - The source is `lab/presets/palettes.json`.
  - They're edited live in the new **Palette** dial panel (`lab/js/palette-panel.js`). "Save palettes" writes the file through `serve.py`.
  - The active palette is written into the effects dials after the pinned preset loads (`kit.ready` in `panel.js`).
  - Motion and blur are render overrides (`applyViewer()` in `lab/js/viewer.js`).
- **Theme dial:** the effects dial `theme.*.link` was added for the link colour.

### 4. Ghost pass fixes (`lab/js/passes/ghost.js`, `lab/js/main.js`)
- **Fresh ink replaces the ghost.** It used to be merged with the ghost one colour channel at a time, which re-tinted coloured ink every frame and made Blueprint's blue look muddy.
- **A ground change clears the trail history for two frames.** That covers a palette switch, a mode change or editing the ground dial, and it stops a full-screen magenta flash.

Commits: `b3f1d54` (typography), `8a86725` (controls and palettes), and this one (links, inverse selection, handoff). Everything is pushed to `origin/main`.

## Current state
- Run it with `python3 serve.py`, then open http://localhost:8123/lab/layout.html and press [c].
- The light and dark presets were re-saved by the user and committed in `8a86725`.
- "Save palettes" hasn't been tested end to end. It uses the same PUT path as "Save to preset".
- **Unexplained:** the magenta flash on a ground change was fixed by clearing the history, but the shader maths alone doesn't account for how strong it was. The stray dark mode is the likely cause. If odd trails show up after a switch, look at `ghost.js` itself.
- The type specimen's weight ladder shows its 300 and 600 rows at the nearest weight that ships, because those files are gone.

## Working preferences (from this session)
- Grill one question at a time, each with a recommended answer, and build a test page when the user wants to see options.
- **No screenshot self-checks.** Verify with computed styles, geometry, console messages and pixel histograms of the rendered canvas in the user's Chrome tab. The user judges the look.
- The user tunes by eye, then pastes a spec or saves a preset. Give them presets to compare instead of overwriting their dials.
- Commit and push only when asked.

## Open items
- **Palettes:**
  - Tune the ghost colours and the effect strengths for the dark palettes.
  - Choose the presenter's projector default.
  - Decide whether dark palettes need their own "dim" mix.
- **Hover and focus for inline links:** the tab headers invert on hover, but links don't yet.
- **The real site:**
  - Move the controls panel and palettes into the site once settled.
  - Decide whether the layout tokens (`--box-inset`, columns) also go into `css/style.css`.
- **Responsive reflow** for narrow screens, to replace the stopgap clamp.

## Suggested skills
- `grill-me` for the remaining palette decisions.
- `diagnose` for display and effect bugs.
- `design:design-system` when promoting palettes and layout tokens to the site.
