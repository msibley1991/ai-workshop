# Text artefacts

Status: **exploration**. Decided in the prompt-blocks grilling session (2026-11-22). Nothing is built yet. The script's opening sections need these first ([`docs/max-pres-draft/max-pres-v3.md`](../max-pres-draft/max-pres-v3.md) §1, §3–6).

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
| Document | an editor pane: the filename on a tab-shaped header, the raw Markdown body, no line numbers | JetBrains Mono 400 |
| File tree | a sidebar list: ▸/▾ disclosure marks, indentation, folders ending in `/`, no file icons | JetBrains Mono 400 |

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
| Marked | a solid ink bar behind the span, its text knocked out in the ground colour; many spans can be marked at once |
| Focus | the same bar in the accent; one per graphic, following [graphics.md](graphics.md)'s focus rule |
| Blurred | pixelated blur (below) |

- **The bar** runs the line-height, with 8 of padding at its ends. A wrapped span gets one bar per line, with no join.
- **Accent is for focus only.** The cursor, the send mark, ▸/▾ and speaker labels are ink.

## Cross-links
- A line can run from a span to a word or phrase in the slide's statement.
- **Route:** horizontal, 45°, horizontal. It leaves level with the span's line and arrives level with the target word, ending 8 short of it.
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
- **The rate** is tuned in the lab, then named in motion.md.

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

## Authoring (to build)
- An artefact is HTML markup: a container that declares its kind (prompt, chat, document, tree), with spans that carry ids. The exact attributes are settled when it's built in the lab.
- Its text is real DOM text in the type roles, drawn by the text raster.

## Open
- **Marked vs selected:** the marked state (ink bar, text knocked out) looks the same as selected text ([palettes.md](palettes.md)). Test whether that confuses, and if it does, change one of them.
- The retype rate and how the cursor blinks.
- The send mark's shape, and ▸/▾ as glyphs or drawn marks (this touches the glyph-set gap).
- How carried spans sit with graphics' "a shape's pixels stay inside its recorded box" rule once they're drawn into the raster.
- Whether compact text at 16/24 survives the projector, for the projector test ([display.md](display.md)).
