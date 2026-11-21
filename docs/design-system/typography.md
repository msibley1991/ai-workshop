# Typography

Status: **settled** (2026-11-21), from the second design-system grilling session. The tokens are in [`css/style.css`](../../css/style.css), and the fonts are self-hosted in [`assets/fonts/`](../../assets/fonts/).
- Faces were compared on the lab type specimen ([`lab/type.html`](../../lab/type.html)).
- The hierarchy was tuned on [`lab/hierarchy.html`](../../lab/hierarchy.html).
- The lab layout page now uses the same roles.

## Constraints
- The site will be hosted on Vercel and opened on school and personal devices, so faces come from the **Google Fonts** pool (OFL).
- We serve the font files ourselves instead of loading them from Google's CDN, so nothing depends on Google at the venue.
- Sans only, no serifs (see [aesthetic-direction.md](../aesthetic-direction.md)).
- Type is drawn into a low-res canvas and upscaled with nearest-neighbour, and it has to survive projector wash-out.

## Working choices
- **One main sans** carries nearly everything.
- **Mono only for literal code:** JetBrains Mono (variable, 100–800).
- **Sans character:** squared and Eurostile-like, matching the technical, pre-window feel. Eurostile itself was a local placeholder and isn't licensed for web use.
- **Width:** big display type uses an extended cut, and body stays at normal width.
- ~~Front-runner: Saira~~ (variable weight and width, the only Google family that does extended display and normal body alone).
- **Chosen (2026-11-21): Chakra Petch throughout**, one family at one width. It was picked on the specimen because its squared, cut-corner forms suit the low-res raster. This drops the extended-display idea. Chakra Petch has static weights 300–700, and only 400, 500 and 700 ship. Italics aren't used.

## Candidates on the specimen
| Key | Candidate | Notes |
|---|---|---|
| 1 | Saira, extended display (125%) + normal body | the front-runner |
| 2 | Saira at one width | control: is the extended cut earning its place? |
| 3 | Michroma display + Oxanium body | two families; Michroma is wide but has one weight |
| 4 | Chakra Petch throughout | squared, static weights 300–700, one width |
| 5 | Michroma display + Chakra Petch body | wide display over a squared body with real weights |

The rejected candidates stay in `lab/fonts/` for the specimen.
- Chakra Petch now lives in `assets/fonts/chakra-petch/`, with only the shipped weights: 400, 500 and 700.
- JetBrains Mono now lives in `assets/fonts/jetbrains-mono/`.
- Each folder keeps its OFL.txt.

## Hierarchy
- **Roles (six):**
  - Display: the hero title.
  - Headline: the section title.
  - Statement: a beat's projected slide text. The hero sub and sub-headline fold into it.
  - Body: longer reading text, for reader mode and explanations.
  - Label: bars, tabs, buttons, diagram labels and captions.
  - Code: JetBrains Mono.
- **Floor:** 24 for anything the audience reads. Chrome nobody reads from the room (bar text, key hints) may drop to 16.
- **Sizes** come only from the spacing scale: 16 · 24 · 32 · 48 · 64 · 96 · 128.
- **Line-heights stay on multiples of 8.** A tighter, 4-unit spec (Statement 48/52, Body 32/36, Label 24/28) was tried and rejected: snapped to 8, the original read best.
- **Chosen scale (statement-led):**

| Role | Size/line-height | Weight |
|---|---|---|
| Display | 128/128 | 700 |
| Headline | 64/64 | 700 |
| Statement | 48/56 | 500 |
| Body | 32/40 | 400 |
| Label | 24/32 | 500 |
| Bar text | 16/24 | 500 |
| Code (JetBrains Mono) | 24/32 | 400 |

- **Three weights:** 700 (Display, Headline), 500 (Statement, Label, bar text) and 400 (Body, Code). 300 and 600 aren't used. 300 breaks up on the low-res raster and washes out on a projector, and dropping 600 gives each weight one job.
- **Emphasis** in running text (the script's `*italic*`) steps up to 700, with no italic and no colour. It needs no extra files, holds up on the raster, and leaves colour to the palette session.
- **Measure:** Statement and Body both run at most 6 columns, so they share one right edge.
- **Vertical spacing** uses the layout gaps:

| Between | Gap |
|---|---|
| Headline → Statement | related 16 |
| Statement → Body | group 32 |
| Body → Body (paragraphs) | related 16, so they read as one block |
| Text → code block or figure | group 32 |
| Figure → its caption | related 16 |
| Beats or major blocks | section 64 |
- Tested on [`lab/hierarchy.html`](../../lab/hierarchy.html) (preset 1).
- **Case:** sentence case for every role, including labels, bar text and captions ("Fig 1. Specific instructions are creative decisions"), all at default tracking. The site title keeps its lowercase as written. Caps for labels (+0.04em) were tried and rejected: sentence case looked better.

## Rendering note
Canvas text ignores `font-stretch` in the `font` string, so `lab/js/text-raster.js` now sets `ctx.fontStretch`. A computed percentage maps to the nearest CSS keyword (125% → `expanded`). Widths between keywords snap to the nearest one in the raster, so the display widths should stay on keyword steps (100 / 112.5 / 125). The raster also applies CSS `text-transform` to the drawn string and sets `ctx.letterSpacing` from `letter-spacing`, since it draws the raw DOM text.
