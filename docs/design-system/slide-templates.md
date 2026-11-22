# Slide templates

Status: **exploration**, from the slide-templates grilling session (2026-11-21). The approach is built on Swiss modernist layout principles. **Built in the lab** on [`lab/layout.html`](../../lab/layout.html): tab 2 holds placeholder slides for every template, driven by [`lab/js/slides.js`](../../lab/js/slides.js) (see "In the lab").

## Sections, slides and beats
- **Tab:** one presenter's part. Tab 1 is Nora's and tab 2 is Max's.
- **Section:** a group of slides within a tab, from the script's `##` titles. Its name shows small in the footer strip (see "Footer strip"), not as a Headline at the top of the slide.
- **Slide:** each bullet in the script is a full slide. It uses **one template** for all its beats.
- **Beat:** one press of →. A beat changes only what's inside the slide's regions: the statement gains its next sentence, or a visual steps to its next state (see [graphics.md](graphics.md), "Presentation steps").
- **A slide may hold more than one visual.** The visuals aren't settled, so templates describe regions on the grid, not kinds of visual. Any visual can go in any visual region.

## Swiss principles applied
- **Scale, not width:** a text-only slide gets bigger type, not longer lines. Lines stay around 30 characters.
- **One text axis:** the statement always starts on the first open column, normally column 1. In Text and Split it hangs from the top of row 1. In Wide and Row it stands on the base line under the visuals, so the genie funnels straight down into the sink (bottom left) instead of over them.
- **Asymmetry:** nothing is centred. Empty columns are part of the composition. Text is flush left with a ragged right, and hierarchy comes from size and weight, never colour.
- **A modular grid:** columns and rows. Visuals fill boxes of fields. Text flows freely from the top using the typography gaps.

## Row fields
- An open tab's content area is **800 units** tall: the 848 body minus the 24 box inset at top and bottom. The canvas is locked to 1080, so this is the same on every screen.
- **The footer strip** takes the bottom 32, with a 16 gap above it (see "Footer strip").
- The remaining 752 is divided into **6 fields of 112, with 16 gutters** (6 × 112 + 5 × 16 = 752). The cells are square on the MacBook, where columns are about 112 wide, and a little wide on the projector (133).
- **The base line** is the bottom of row 6. Visuals in Wide, Row and Visual stand on it, so they never reach the footer strip.
- **Visuals fit boxes:** a visual takes a span of columns and a span of rows. Its drawing and captions are fitted inside, scaled to whichever side runs out first, and hung from the box's top-left corner. Captions still end on column edges, and weights and hatching never scale. Since scenes are code, a scene may also stretch its spacing to fill more of its box.

## Footer strip
- **One line along the bottom of the content area,** 32 tall, with a 16 gap above row 6. Its bottom is the content's bottom line, one box inset (24) above the panel's edge.
- **The genie's sink** sits on the left, at the text axis (column 1), on the content's bottom line. Text always hangs from the left, so it funnels down its own side of the slide instead of over the visuals. The spine's swing is mirrored to match, swinging right, away from the sink's side.
- **The section title** sits on the right, ending just left of the slide number. It's set in the **Section title** style, 24/32 at weight 700, in sentence case, with no section number (decided 2026-11-22, [components.md](components.md)). The names come from the script's `##` titles:
  - On creative decisions
  - State of digital media
  - Coding agents
  - Design systems
  - Skills
  - MCPs
  - Make your own tools
  - Conclusion
- So the sink square bottom left balances a small bold name bottom right, a Swiss running head.
- **The slide number** ends on the last column's edge, in the same style with tabular figures, in a two-digit slot. The section title ends 16 to its left. The number counts slides within the tab, from the page, and changes as soon as a new slide comes on: it doesn't rise or fall with the title (added 2026-11-22).
- **The strip belongs to the tab's open layout:** the title is clipped to its tab, so it never shows over a closed one.
- **The title belongs to the section, not the slide.** It stays still through all the section's slides, with no genie. When the section changes within a tab, the old title falls out of the strip and the new one rises in, during the visuals phase (400 on ease, clipped to the strip). Between tabs it's set before the accordion moves.
- The hero has no section title.

## Templates
| Template | Statement | Visuals |
|---|---|---|
| **Text** | 64/72, weight 500, columns 1–8 | none |
| **Split** | 48/56, columns 1–4 or 1–6 | one, from the column after the text to the edge, rows 1–6 |
| **Wide** | 48/56, columns 1–6, on the base line | one, columns 1–12, from row 1 down to the row above the statement |
| **Row** | 48/56, columns 1–6, on the base line | 2 (6 columns each) or 3 (4 each), placed like Wide, each with its captions inside its own box |
| **Visual** | none | one, columns 1–12 × rows 1–6 |

- **Split's proportions:** text on 4 columns when the visual is the main event and the statement is short, and on 6 when the statement leads. The visual takes the rest (8 or 6 columns on the full grid).
- **Spans:** a scene's declared minimum span still holds when panels cover columns. Its declared maximum doesn't cap a visual in a template, because the box fit already limits the size.
- **How visuals sit in their box:** in Split, Wide and Row, a visual hangs from the top of its box (row 1). In Visual it stands on the base line.
- **Rows for the statement (Wide and Row):** the statement's height is measured at its full length, every sentence included, from the slide's first beat. It takes as many bottom row fields as that needs, set on the base line, and the visuals take the rows above it.
- **Why text goes below in Wide and Row** (changed 2026-11-22): with the sink bottom left, a statement above full-width visuals funnels down across them. Below them, it drops straight into the sink.
- **Hero:** slide zero, on the Split 6 template (changed 2026-11-22). The statement is one block: the Display title and the sub. The visual is to the right. It has no section, so there's no footer title, but its sink is bottom left like every slide's. At 128 on 6 columns, the title takes about four lines on a 1440 canvas.
- **New templates** are added only when a slide doesn't fit these five, the same "named, not free" rule as motion's values. Left out for now: a mirrored Split (it breaks the text axis) and an unequal Row.

## Panels
- With the controls open (columns 11–12 covered, 10 left), the text keeps its columns. Split's visual drops toward its minimum span, and Wide, Row and Visual lose columns from the right. Three Row visuals at 10 columns become 3 + 3 + 3, with one column empty. The rules are in [layout-grid.md](layout-grid.md).
- A Text slide (columns 1–8) never reflows for the controls.
- If the left nav covers columns 1–2, the text axis moves to column 3, and 3–10 still holds the Text template's 8 columns. The axis moves only when a viewer opens a panel, never between slides.

## Building a statement
- **Earlier sentences stay.** Each beat adds the next sentence below the last, in ink, with no dimming. The accent stays inside graphics.
- **New text pours out of the sink,** the reverse of the genie exit, into its place. Stepping back sends the newest sentence back in. The sink is where all text comes from and goes to.
- The statement's region is sized for its full text from the first beat, so sentences never push each other around.

## Changing slides
Each step starts only when the one before has finished, so nothing new appears until the old slide has gone:
1. **Text out:** the statement funnels into the sink, bottom line first (200 ms per line, follow −0.5; see [motion.md](motion.md)).
2. **Exits:** the old visuals that aren't carried leave, and the old section title with them if the section changes. Exits reverse their entrance, so a risen visual falls out.
3. **Moves:** each **carried visual**, the same scene on both slides (for example the project folder), moves to its new box on ease and steps to its new state on the way. It's matched by its scene name, in order.
4. **Entrances:** the new visuals arrive, and the new section title rises into the strip. The default entrance is **rise**, and a slide can name another motion from motion.md (grow, fall, cut).
5. **Text in:** the new statement's first sentence pours out of the sink.

- Steps 2–4 are 400 ms each on ease, and an empty step is skipped.
- **Back:** the same steps, to the previous slide's final state.
- **Rapid presses** skip to the end state. **Motion off** cuts everything.
- A 2-line slide change with exits, one move and entrances takes about 300 + 400 + 400 + 400 + 300 = 1.8 s. With only a move, it's about 1 s.

## Between sections and tabs
- **Within a tab,** a new section is an ordinary slide change. The footer title changes during the visuals phase.
- **→ on a tab's last beat** runs text out, then the old visuals fall out, then the accordion jumps to the next tab (400 on ease), and its first slide comes in: visuals, then text. Nothing is carried between tabs.
- **← on a tab's first beat** reverses this, back to the previous tab's last slide in its final state.
- **Jumping to a tab directly** (a click, the URL hash or a scroll snap) lands on that tab's first slide. **Jumping to a section** from the left nav lands on that section's first slide ([components.md](components.md)).
- **The hero is slide zero:** → from it opens tab 1.

## Authoring
As built on the lab layout page:

```html
<div class="slides">
  <div data-section="Coding agents">
    <section class="slide" data-slide data-template="split" data-split="4">
      <div class="slide-statement">
        <p data-genie>First sentence.</p>
        <p data-genie>Second sentence, on the next beat.</p>
      </div>
      <div class="slide-visual">
        <div data-graphic="project-folder" data-fit="box" data-align="top" data-states="0,2"></div>
      </div>
    </section>
  </div>
</div>
<footer class="slide-footer" data-clip><p class="slide-section-title">Coding agents</p></footer>
```

- `data-template`: text, split, wide, row or visual. `data-split`: 4 or 6.
- Each sentence is its own `[data-genie]` block, revealed one per beat.
- `data-states` lists the graphic's scene state for each beat. Without it, the graphic steps through every state in order. A slide has as many beats as its longest list.
- `data-fit="box"` fits the graphic to its region; `data-align` is `top` for Split, Wide and Row, and `bottom` for Visual.
- A carried visual is the same scene on consecutive slides in one tab, matched in order.

## In the lab
- **`lab/layout.html`, tab 2:** Max's Section from the script, 26 slides in its eight sections, one per bullet. Each statement is the bullet's Text line. For now they're all on the Text template, one beat each, and bullets with no Text line show a `[Placeholder]` statement. Templates, visuals and beats get worked out slide by slide.
- **Hero and tab 1** are on templates too: the hero is Split 6 (see Templates), and tab 1 (the placeholder for Nora's part) has one Split 4 slide with the page layout, in a placeholder section.
- **Tab names** are temporarily "Nora's Section" and "Max's Section", for a layout recording. The hashes are still `#foundations` and `#advanced-topics`.
- **Keys:** ← and →, and PageUp and PageDown from clickers, step beats and flow on across slides, sections and tabs. Clicking a tab, the URL hash or a scroll snap lands on that tab's first slide. The old l toggle is off on this page; the genie page still has it.
- **Rendering cost:** painting a graphic is the expensive step, so the lab keeps its last two painted looks and draws flow packets on top instead of repainting. A carried move or an explode tween still repaints its graphic every frame.
- **Code:** `lab/js/slides.js` (stops, beats, the phases, template placement); box fitting, `setGraphicState()` and `copyGraphicState()` in `lab/js/graphic.js`; the slide grid and footer strip in `lab/css/layout.css`.

## Not built yet
- Real slides from the script: tab 2 is laid out as text only (see "In the lab"); templates, visuals and beats are next.
- The left nav, and the axis moving to column 3 with it (the code reads `--nav-cols`).
- Reader mode.

## Open
- ~~The accordion's tab headers also show section names, so they appear twice~~: closed. The tabs are named for the presenters' parts, so a header shows the tab and the footer shows the section ([components.md](components.md)).
- ~~Whether the section title carries its number~~: no. Sections are unnumbered everywhere.
- Reader mode: what someone scrolling the page gets instead of beats.
- Whether Wide and Row ever need the statement wider than 6 columns.
