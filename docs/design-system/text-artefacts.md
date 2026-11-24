# Text artefacts

Status: **exploration**. Decided in the prompt-blocks grilling session (2026-11-22). **Partly built** in the lab (`lab/layout.html`, `lab/js/artefact.js`, `lab/js/slides.js`): the chat kind with your turn only and typing in (slide 1), the prompt (slide 2), documents (slides 10, 11 and 13), file trees (slides 10–13), and the focus and marked span states (slides 11 and 13). The script's opening sections need these first ([`docs/max-pres-draft/max-pres-v3.md`](../max-pres-draft/max-pres-v3.md) §1, §3–6).

## What they are
- A text artefact is a **graphic made of legible text**: prompts, chats, files and folders shown on a slide.
- **Graphics first, text second.** They behave as graphics (states, zoom, blur, carried moves, the graphic enter/exit motions) and take a template's visual slot like any graphic ([slide-templates.md](slide-templates.md)).
- They **approximate the UI the audience already knows**, drawn in the system's materials: the palette, the 4/2 weights, square corners, Chakra Petch and JetBrains Mono, the 1-unit pixel. They are generic and never a specific product.
- They borrow from the design system only what's listed here. Where this doc and the familiar layout disagree, the familiar layout wins unless it breaks a material rule.

## Kinds
| Kind | Familiar shape | Face |
|---|---|---|
| Prompt | an input field: a box with the text inside and a small send mark bottom right | Chakra Petch 400 |
| Chat exchange | a run of prompt turns: yours boxed on the right (about ⅔ of the width), the agent's unboxed on the left at full width | yours: Chakra Petch 400; the agent's: JetBrains Mono 400 |
| Document | an editor pane: the filename on an inverted header strip (an ink fill, the name knocked out), the raw Markdown body, no line numbers | JetBrains Mono 400 |
| File tree | a framed pane with the root folder as its inverted header; under it, the tree drawn like the left nav ([components.md](components.md)): a trunk under each folder name's first letter, 16 ticks to each row's centre line, the last turning the corner, 2 thick, 24 per level; no ▸/▾ marks; folders end in `/`, closed ones with no `…`; no file icons | JetBrains Mono 400 |

- **Chat speaker labels** ("You", "Claude") are bold: Label size, weight 700, just above each turn on that turn's side. There are no avatars, timestamps or "typing…" indicators.
- **Documents show raw Markdown source,** so the `#` and `-` that do the organising are visible. They are never rendered.
- **Code blocks** aren't artefacts. They use the Code role ([typography.md](typography.md)).

## The face rule
- **Sans for what a person types. Mono for what a machine writes or a file holds.**
- A change of kind can change the face, such as a prompt's decision becoming a line in a file. That change carries meaning: what you said becomes what's filed.

## Size, wrap and detail
- **Resting size:** 24/32 for full text. Zoom states go larger, never smaller.
- **Minimum width: 2 columns,** so several small docs can sit together. Below about 4 columns (about 35 mono characters), the text drops a detail level.
- **Detail levels,** set by state:
  - **Full:** real text at 24/32 or larger. Used for what the slide is about. The type floor applies.
  - **Compact:** real text at 16/24, below the floor. Allowed only when the artefact isn't the focus, as texture that's honestly the file's text.
  - **Wireframe:** the body becomes ink bars, one per line, matching the real line lengths and indents, so the structure still shows.
  - The header Label (filename, root folder, speaker) stays real text at 24 at every level.
  - A change of level is a hard cut. A zoom toward a small doc goes through the levels: wireframe → compact → full.
- **Wrap:** prompts, chat turns and document prose soft-wrap to the box. Wrapped list items hang after the `- `. File trees never wrap: a name that won't fit is cut with `…`.
- **Panels open:** the artefact narrows and rewraps. Its type doesn't shrink.

## The camera
- The artefact is a **sheet** of any length at its resting size. Its box (columns × rows, `data-fit="box"`, as other graphics) is a **camera** on it.
- **Each state sets scroll and zoom.**
  - Scroll moves in whole lines (32 at 24/32) and jumps, never glides.
  - Zoom resets the type larger on the 1-unit pixel, so glyphs stay sharp at every scale. Resting states sit on the type scale. Only tween frames pass through sizes between.
- A zoom to a span is the same mechanism: move the camera to it and raise the zoom.
- **Header strips stay fixed** while the body scrolls.
- **Cut edges fade by pixel blur.** The bottom edge blurs when there's more below, and the top edge blurs once the camera has scrolled past the first line. The pixel steps 2 → 4 → 8 toward the cut, without tints.

## Span states
A span is any run of words in an artefact. Each slide sets every span's state at each of its beats; the system doesn't plan beats.

| State | Look |
|---|---|
| Plain | as set |
| Marked | a solid accent bar behind the span, its text knocked out in the ground colour; many spans can be marked at once |
| Focus | the same accent bar, so it looks the same as marked (2026-11-24); one per graphic, following [graphics.md](graphics.md)'s focus rule |
| Blurred | pixelated blur (below) |

- **The bar** runs the line-height, with 8 of padding at its ends. A wrapped span gets one bar per line, with no join.
- **Accent is for highlights and lines:** focus and marked bars, cross-links, wires, caption leaders and captions, and Markdown symbols (2026-11-24). The cursor, the send mark and speaker labels are ink.

## Cross-links
- A line can run from a span to a word or phrase in the slide's statement.
- **Route:** horizontal, 45°, horizontal. It leaves level with the span's line and arrives level with the target word, ending 8 short of it. In accent.
- **Anchor:** a small square dot on the span's bar, at the end nearer the text. The line is cased in ground where it leaves the artefact's box.
- **Target:** the phrase is set in 700, the existing emphasis. It takes the accent while its span has focus.
- Several spans may link to one phrase. Each line is drawn on its own.
- **Order:** a cross-link draws after its target text has landed and leaves before the text goes, within a slide change's order.
- Caption leaders keep their own rule (45° out, then horizontal).

## Carried spans
- A **span is the smallest thing that can be carried** across a slide change, in the carried-moves phase. It moves as a block, with its bar.
- Spans have **ids**, so a slide can say this span in the prompt is that line in CLAUDE.md.
- **Trim:** only some of a span's words may travel. The rest blur out in the exits phase where they stand, and the carried words close up.
- **Landing:** a face change on arrival (sans to mono) is a hard cut on the landing frame.
- **Evolve:** a span can become different text, such as a chat decision becoming a document. The change is a **retype** (below).
- What each span becomes is the slide's choice.

## Retype
- **Retype is the motion for text changing in place.** The old text is erased and the new text typed character by character at one steady rate, with a block cursor in ink.
- A new chat turn or prompt can also appear empty and be typed in this way, the human's and the agent's alike. Whether it's typed or already there is the slide's choice.
- The genie stays for statements entering and leaving ([motion.md](motion.md)). It isn't used inside artefacts.
- **The rate:** for now a whole turn types in over **400 ms in all**, whatever its length, so a long prompt arrives as fast as a short one (slide 1, 2026-11-22). Erasing takes the same. A per-character rate may still be tuned in the lab and named in motion.md.

## Pixelated blur
- Blur is for **out of focus**. It's the only place the emulated pixel grows past 1 unit, so coarse pixels always mean "not looking here".
- **Scope:** a whole artefact, or any span or line in one (tree entries, document lines, chat turns). Other graphics may use it too, on the whole graphic or a part.
- **Three fixed steps:** the pixel grows to 2, 4 or 8 units: *soft*, *blurred*, *gone*. There's no continuous dial.
- **Tweens** step through the levels with hard cuts and never interpolate.
- **Colour:** each coarse pixel is thresholded to ink or ground, so blur stays in the three-colour palette.
- **Blurred text can't be selected.** It stays in the DOM, but a blurred span or artefact is taken out of selection, along with what's inside it.

## Real files
- **Abridge, don't invent.** An artefact of a real file (CLAUDE.md, a design-system page, a skill) may cut lines or shorten them, with no elision marks.
- Nothing made up goes into a real file's artefact. If a slide needs a line the file lacks, either the file gets the line or the artefact is renamed as an example (`example-skill.md`).
- Made-up artefacts (generic vs detailed prompts, sample chats) never use a real filename.
- **Content check:** before the talk, excerpts are checked against the real files.

## Links
- **Artefacts carry no links.** Links to the real files are ordinary clickable text links in the presentation.

## Authoring
- An artefact is HTML markup: a container that declares its kind (prompt, chat, document, tree), with spans that carry ids. Its text is real DOM text in the type roles, drawn by the text raster.
- **Built so far** (the chat, one turn):

```html
<div class="slide-visual">
  <div class="artefact artefact-chat" data-artefact="chat" data-enter="0" data-solo="0">
    <p class="chat-speaker">You</p>
    <div class="chat-turn" data-box><p data-type>Your request…</p></div>
  </div>
</div>
```

- `data-artefact` makes it a visual for the slides: it rises and falls like a graphic, but has no states. `data-carry` carries it to the next slide ([slide-templates.md](slide-templates.md)).
- `data-enter` is the beat it enters on, and `data-solo` the beats it's shown alone, centred and at 32/40 ([slide-templates.md](slide-templates.md)).
- **Line breaks in a turn** are kept, so a long prompt can put each area (colours, type, layout…) on its own line, as people do in real prompts.
- **Scale:** the whole chat scales together (type, padding, width, gaps), so its line breaks hold when it grows or shrinks. Line heights step with the type (24/32 to 32/40).
- A `[data-type]` block types in after its artefact has risen, with a block cursor in ink. Stepping back erases it, then it falls. The box starts one line tall and grows a line at a time as the text reaches it, like a real input. The word being typed takes its full room from its first letter, so words never jump to the next line partway through.
- **Crop and split (built, slide 1):** `data-crop="3"` on a chat, with `[data-crop-area]` on the focus lines (one `.chat-line` per line of the prompt), erases every other line on that beat (400). The lines shorten as they erase, so the box closes up around the focus lines. `data-split="4"` then splits the turn's outline into one box per area (400; it defaults to the crop beat, right after the erase), spaced so the middle one is centred in the frame and the outer ones sit half a link run above and below, for clean 45° bends. The box doesn't grow.
- **Marked and cross-links (built, slide 1):** `data-mark="5"` wipes an accent bar in behind each line of each area, left to right (400), knocking the text out. Then a line draws from each box's left edge, at its centre, bending 45° at the midpoint with 8-radius bends, all converging on one point 32 past the end of the `[data-link-target]` phrase, where an open chevron (32 tall) rides each tip as it draws (`svg.slide-links`, weight 4, accent).
- **Documents (built, slides 10, 11, 13, 14):** a framed pane (`.doc-pane`, `.md-pane`, `.spec-pane`) with an inverted `.doc-head`. Slide 10's are at the wireframe level (one ink bar per line). Slide 11's is at full detail: on beat 2 it shows no symbols, and on beat 3 `#`, `##` and `-` type in, in accent, hanging in a gutter left of the headings and in the items' indent, so the text never moves (`data-type-at="2"` holds a `[data-type]` block until that beat). Slide 13's design-system docs and slide 14's three skill docs (`build-component.md`, `no-slop.md`, `grill-me.md`) are compact raw Markdown (16/24), each filling its height.
- **File trees (built, slides 10–14):** `.tree-pane` with `ul.tree` lists; each row is `li` > `.tree-trunk`, `.tree-tick` (fills) and `.tree-name`. The raster draws no bullet for a list styled `list-style: none`.
- **Folder swap (built, slides 13 → 14):** `data-closed` on a folder's nested `ul` closes it (no height). When a tree carries to one with other folders open, the new tree starts in the old one's state and spans, the closing folders shrink (200), then the opening ones grow (200) as the spans cut to the new ones. Folders and spans are matched by name, so it runs the same way back.
- **Span states (built):** `.hl` > `.hl-bar` (a fill 8 past the text each end, the line height tall) and `.hl-text`, with `data-span-states="focus,focus,mark"` giving the state per beat (the last holds). Focus and marked are both the accent bar, the text knocked out in ground. The state cuts at the beat's start.
- **Captions on a document (built, slide 11):** `.doc-cap[data-cap-to]` sits level with the `[data-cap-id]` heading: a 6 square dot 16 past the heading's text, a 2 leader on to 8 short of the caption (Label, 500), all in accent. They're re-placed on every layout change, and cut in once the doc has opened.
- **Wires between artefacts (built, slides 10, 11, 13 and 14):** a 45° connector with a chevron from a `[data-wire-to]` element's right edge to the `[data-wire-id]` it names, 16 clear of both, in `svg.slide-wires`, in accent. `data-wire-edge` starts or ends it at the element's frame instead, level with the element, and `data-wire-level` on the end makes it arrive level with the start. A wire draws once both ends are in; on a slide change it erases with the text out.
- Spans with ids, the agent's turn, carried spans and the camera are still to build.

## Open
- ~~**Marked vs selected:** the marked state looks the same as selected text~~: no longer, since marks are accent bars and selection is ink (2026-11-24).
- The retype rate and how the cursor blinks.
- The send mark's shape. (File trees settled on drawn lines and no ▸/▾ marks, 2026-11-23.)
- How carried spans sit with graphics' "a shape's pixels stay inside its recorded box" rule once they're drawn into the raster.
- Whether compact text at 16/24 survives the projector, for the projector test ([display.md](display.md)).
