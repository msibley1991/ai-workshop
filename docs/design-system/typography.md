# Typography

Status: **settled** (2026-11-21). This doc describes what the code does. The tokens are in [`css/style.css`](../../css/style.css), the role rules in [`css/site.css`](../../css/site.css), and the fonts in [`assets/fonts/`](../../assets/fonts/). Where this doc and the code disagree, the code wins: fix the doc.

## Constraints
- The site is hosted on Vercel and opened on school and personal devices, so the faces come from the Google Fonts pool (OFL).
- The font files are served from the repo, not Google's CDN, so nothing depends on Google at the venue.
- Sans only, no serifs ([aesthetic-direction.md](../aesthetic-direction.md)).
- Type is drawn into a low-res canvas, upscaled with nearest-neighbour, and has to survive projector wash-out.

## Faces
- **Chakra Petch** carries everything except code (`--font-sans`). It has one width, and it was chosen because its squared, cut-corner forms suit the low-res raster.
  - It ships in three static weights: 400, 500 and 700 (`assets/fonts/chakra-petch/`).
  - Italics aren't used.
- **JetBrains Mono** (`--font-mono`; variable, 100–800, `assets/fonts/jetbrains-mono/`) is for what a file holds ([text-artefacts.md](text-artefacts.md)). In the code that means:
  - file and folder names in tree panes
  - document names
  - Markdown source
  - spec lines
  - MCP frame names
- Each font folder keeps its OFL.txt.
- The faces were picked on a type specimen in the lab. The rejected candidates (Saira, Michroma, Oxanium) went with the lab on 2026-11-26 and are in git history.

## Roles
Every size is on the spacing scale: 16 · 24 · 32 · 48 · 64 · 96 · 128. Every line-height is a multiple of 8.

| Role | Size/line-height | Weight | Token | Where |
|---|---|---|---|---|
| Display | 128/128 | 700 | `--type-display-*` | the hero title (`.site h1`) |
| Headline | 64/64 | 700 | `--type-headline-*` | glossary terms (`.glossary-term`) |
| Statement | 48/56 | 500 | `--type-statement-*` | slide statements, the hero sub, sub-headlines |
| Statement large | 64/72 | 500 | `--type-statement-large-*` | Text slides; grid statements (slide 7) |
| Statement large, bold | 64/72 | 700 | the same | `data-statement="large"` on Wide and Row slides |
| Body | 32/40 | 400 | `--type-body-*` | body text, glossary definitions, the pair captions (slide 7) |
| Label | 24/32 | 500 | `--type-label-*` | graphic labels, captions |
| Panel text | 24/32 | 500 | `--type-panel-*` | the controls and nav panels, the playground's control columns |
| Section title | 24/32 | 700 | `--type-section-*` | the slide footer's section name and number |
| Tab label | 24, line-height 1 | 500 | `--type-tab-*` | accordion tab headers |
| Bar text | 16/24 | 500 | `--type-bar-*` | bars, key hints, the nav tree (in the bars themselves, line-height 1) |
| Code | 24/32 | 400 | `--type-code-*` | mono in artefacts; 16/24 in the smaller frames (spec lines, MCP frame names) |

- **Exceptions:**
  - A Text slide with `data-statement="body"` (slide 17's long paragraph) drops back to the Statement size, 48/56.
  - Slides show no Headline. The section's name runs in the footer as the Section title.
  - Text inside artefacts and era-site frames (chats, posters, site wireframes) sets its own sizes. Those are listed in text-artefacts.md and the slides' CSS, not here.
- **Floor:** 24 for anything the audience reads. Chrome nobody reads from the room (bar text, key hints) and the small text inside artefact frames may drop to 16.
- **Weights:** 700 for Display, Headline, Section title and emphasis. 500 for Statement, Label, Panel text, Tab label and Bar text. 400 for Body and Code. 300 and 600 aren't used: 300 breaks up on the raster, and dropping 600 gives each weight one job.
- **Emphasis** (`em`) steps up to 700, with no italic and no colour (`.site em`).
- **Measure:** Statement and Body run at most 6 columns (`--measure: 6`, `max-width: var(--span-6)`), so they share one right edge.
- **Case:** sentence case for every role, including labels, bar text and captions, all at default tracking. The site title keeps its lowercase as written.

## Spacing
The vertical gaps are the gap tokens in `css/style.css`:

| Between | Gap | Token |
|---|---|---|
| Label and value, lines in a list, tree entries | 8 | `--gap-tight` |
| Headline → statement, the hero title → its sub, body → body, figure → caption | 16 | `--gap-related` |
| Statement → body, text → code or figure | 32 | `--gap-group` |
| Beats or major blocks, glossary entries | 64 | `--gap-section` |

## Viewer type sizes
The playground's Type tab moves four roles one step up or down the spacing scale: Display, Statement, Body and Label. The code is `typeStore` in [`js/stores.js`](../../js/stores.js), and the saved sizes are in [`presets/type.json`](../../presets/type.json).
- The store sets the `--type-<role>-size` and `-lh` tokens on the root element:
  - Display's line-height equals its size.
  - The others' line-heights run 8 more than the size.
  - Statement large follows one step above the Statement.
- It fires `site:type`, and `js/layout.js` lays the slides out again.
- Headline, Panel text, Section title, Tab label, Bar text and Code don't move. Panel text has its own token so the chrome keeps its size when a viewer moves the Label step.
- Each viewer's changes stay in their browser on top of the saved sizes ([playground.md](playground.md)).

## Rendering
`js/text-raster.js` draws the raw DOM text, so it applies the CSS that canvas text would otherwise ignore:
- `font-stretch` through `ctx.fontStretch`, snapped to the nearest keyword. Chakra Petch has one width, so this only matters if a stretched face comes back.
- `text-transform` on the drawn string.
- `letter-spacing` through `ctx.letterSpacing`.

## Using the tokens
- Role rules use their role's `--type-*` tokens for size, line-height and weight.
- Text with no role (inside artefacts and era-site frames) uses `--space-*` sizes, `--weight-*` weights and `--font-mono`.
- **Exceptions:**
  - `js/knot.js` draws its file glyphs on a canvas with literal font strings (Chakra Petch 500, JetBrains Mono 400), because a canvas can't read CSS variables.
  - `css/text-layer.css` holds fixed base styles for the invisible DOM (`--h1-size` and so on). The `.site` rules override them on every page.
