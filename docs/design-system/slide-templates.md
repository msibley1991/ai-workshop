# Slide templates

Status: **exploration**, from the slide-templates grilling session (2026-11-21). The approach is built on Swiss modernist layout principles. Not built yet: the lab layout page still has the older Split, with the graphic on the left (see "Not built yet").

## Sections, slides and beats
- **Section:** a tab in the accordion. Its name shows small in the footer strip (see "Footer strip"), not as a Headline at the top of the slide.
- **Slide:** each bullet in the script is a full slide. It uses **one template** for all its beats.
- **Beat:** one press of →. A beat changes only what's inside the slide's regions: the statement gains its next sentence, or a visual steps to its next state (see [graphics.md](graphics.md), "Presentation steps").
- **A slide may hold more than one visual.** The visuals aren't settled, so templates describe regions on the grid, not kinds of visual. Any visual can go in any visual region.

## Swiss principles applied
- **Scale, not width:** a text-only slide gets bigger type, not longer lines. Lines stay around 30 characters.
- **One text axis:** the statement always hangs from the first open column, normally column 1, at the top of row 1. Text sits in the same place on every slide, so when the template changes, only the visuals move.
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
- **The section title** sits on the left, at the text axis (column 1). It's set in the **Section title** style, 24/32 at weight 700, in sentence case. The names come from the script's `##` titles:
  - On creative decisions
  - State of digital media
  - Coding agents
  - Design systems
  - Skills
  - MCPs
  - Make your own tools
  - Conclusion
- **The genie's sink** sits on the right, on the same bottom line. So a small bold name bottom left balances the sink square bottom right, a Swiss running head.
- **The title belongs to the section, not the slide.** It stays still through all the section's slides, with no genie, and changes when the accordion moves to the next tab.
- The hero has no section title.

## Templates
| Template | Statement | Visuals |
|---|---|---|
| **Text** | 64/72, weight 500, columns 1–8 | none |
| **Split** | 48/56, columns 1–4 or 1–6 | one, from the column after the text to the edge, rows 1–6, within its declared span |
| **Wide** | 48/56, columns 1–6 | one, columns 1–12, from the first free row under the full statement to row 6 |
| **Row** | 48/56, columns 1–6 | 2 (6 columns each) or 3 (4 each), placed like Wide, each with its captions inside its own box |
| **Visual** | none | one, columns 1–12 × rows 1–6 |

- **Split's proportions:** text on 4 columns when the visual is the main event and the statement is short, and on 6 when the statement leads. The visual takes the rest (8 or 6 columns on the full grid).
- **First free row:** the statement's height is measured at its full length, every sentence included, from the slide's first beat. The visuals start at the next row below it.
- **The statement is always on top.** There's no "statement below" variant, because it would move text from slide to slide.
- **Hero:** the intro screen keeps its own arrangement, a graphic beside the Display title. It's slide zero.
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
Three phases, in order:
1. **Text out:** the statement funnels into the sink, bottom line first (200 ms per line, follow −0.5; see [motion.md](motion.md)).
2. **Visuals,** all starting together:
   - **A carried visual,** the same scene on both slides (for example the project folder), **moves** to its new box on ease, 400 ms, and steps to its new state on the way. It's matched by its scene name.
   - **Other visuals leave and arrive.** The default entrance is **rise**, and exits reverse their entrance. A slide can name another motion from motion.md (grow, fall, cut).
3. **Text in:** the new statement's first sentence pours out of the sink.

- **Back:** the same phases in reverse.
- **Rapid presses** skip to the end state. **Motion off** cuts everything.
- A 2-line slide change with one moving visual takes about 300 + 400 + 300 = 1 s.

## Between sections
- **→ on a section's last beat** runs the text-out phase, then the accordion jumps to the next tab (400 on ease), and its first slide comes in: visuals, then text.
- **← on a section's first beat** reverses this, back to the previous section's last slide in its final state.
- **Jumping to a tab directly** (a click, the URL hash, or the left nav later) lands on that section's first slide.
- **The hero is slide zero:** → from it opens the first section.

## Authoring (proposed)
A slide is a DOM element that names its template, for example:

```html
<section data-slide data-template="split" data-split="4">
  <p data-statement>…</p>
  <div data-graphic="project-folder"></div>
</section>
```

- Each sentence of a building statement is its own element, revealed one per beat.
- A graphic's states line up with the slide's beats.
- The format gets settled when it's built.

## Not built yet
- The row fields and box fitting (`fit()` in `lab/js/graphic.js` fits a width today).
- Split flipped to text on the left (the layout page draws the graphic first).
- The Text template's 64/72 statement.
- Slides, beats and the three-phase slide change. Text entering from the sink.
- → and ← flowing across sections.

## Open
- The accordion's tab headers also show section names, so they appear twice. That belongs with the left nav and chrome.
- Whether the section title carries its number ("3. Coding agents").
- Reader mode: what someone scrolling the page gets instead of beats.
- Whether Wide and Row ever need the statement wider than 6 columns.
