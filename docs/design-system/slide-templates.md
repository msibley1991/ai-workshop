# Slide templates

Status: **exploration**, from the slide-templates grilling session (2026-11-21). The approach is built on Swiss modernist layout principles. **Built in the lab** on [`lab/layout.html`](../../lab/layout.html): tab 2 holds placeholder slides for every template, driven by [`lab/js/slides.js`](../../lab/js/slides.js) (see "In the lab").

## Sections, slides and beats
- **Tab:** one presenter's part. Tab 1 is Nora's and tab 2 is Max's.
- **Section:** a group of slides within a tab, from the script's `##` titles. Its name shows small in the footer strip (see "Footer strip"), not as a Headline at the top of the slide.
- **Slide:** each bullet in the script is a full slide. It normally uses **one template** for all its beats. A slide may change template at a beat (added 2026-11-22; built, but no slide uses it now). The statement then moves and resizes to its new place over 400 on ease, keeping its line breaks, before that beat's visuals come in.
- **Beat:** one press of →. A beat changes only what's inside the slide's regions: the statement gains its next sentence, or a visual steps to its next state (see [graphics.md](graphics.md), "Presentation steps").
- **A slide may hold more than one visual.** The visuals aren't settled, so templates describe regions on the grid, not kinds of visual. Any visual can go in any visual region.

## Swiss principles applied
- **Scale, not width:** a text-only slide gets bigger type, not longer lines. Lines stay around 30 characters.
- **One text axis:** the statement always starts on the first open column, normally column 1. In Text and Split it hangs from the top of row 1. In Wide and Row it stands on the base line under the visuals, so the genie funnels straight down into the sink (bottom left) instead of over them.
- **Asymmetry:** nothing is centred, except a solo artefact shown alone before its comparison (`data-solo`, slide 1 of Max's Section, 2026-11-22). Empty columns are part of the composition. Text is flush left with a ragged right, and hierarchy comes from size and weight, never colour.
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
1. **Text out:** the statement funnels into the sink, bottom line first (200 ms per line, follow −0.5; see [motion.md](motion.md)). Text artefacts erase alongside it, and a boxed scene's drawing wipes up.
2. **Exits:** the old visuals that aren't carried leave, and the old section title with them if the section changes. Exits reverse their entrance: framed visuals close onto their top-left corners and 3D scenes wipe out upward (motion.md, Enter and exit).
   - **Pause:** 400 ms with nothing moving, between the old slide leaving and anything new arriving (added 2026-11-23; first tried at 200). Between beats there's no pause.
3. **Moves:** each **carried visual**, the same scene on both slides (for example the project folder), moves to its new box on ease and steps to its new state on the way. It's matched by its scene name, in order.
4. **Entrances:** the new visuals arrive, and the new section title rises into the strip. Framed visuals open from their top-left corners and 3D scenes wipe in downward; text artefacts type in once their frames are open.
5. **Text in:** the new statement's first sentence pours out of the sink.

- Steps 2–4 are 400 ms each on ease, longer when a step holds an open (800) or a wipe (800), and an empty step is skipped.
- **Back:** the same steps, to the previous slide's final state.
- **Rapid presses** skip to the end state. **Motion off** cuts everything.
- A 2-line slide change with exits, one move and entrances takes about 300 + 400 + 400 + 400 + 300 = 1.8 s. With only a move, it's about 1 s.

## Between sections and tabs
- **Within a tab,** a new section is an ordinary slide change. The footer title changes during the visuals phase.
- **→ on a tab's last beat** runs text out, then the old visuals leave, then the pause, then the accordion jumps to the next tab (400 on ease), and its first slide comes in: visuals, then text. Nothing is carried between tabs.
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
- `data-templates="text,row,row"` gives the slide's template at each beat (the last one holds for later beats), with `data-template` set to the first. On a change, the statement morphs first, then visuals enter. Stepping back reverses it: visuals leave first, then the statement morphs back.
- `data-enter` on a graphic or text artefact is the beat it enters on (default 0). Before that beat it's hidden. On its beat it opens or wipes in (motion.md), and stepping back past it sends it out the way it came. A slide has at least enter + 1 beats.
- `data-enter` on a statement sentence holds it in the sink until that beat, so a statement can come after the visuals (slide 1: the two chats, then the statement on beat 3).
- `data-statement="large"` on a Wide or Row slide: the statement at 64/72 across all open columns, on the base line.
- `data-solo="0"` on a text artefact shows it alone at those beats: centred on both axes over the slide's visual area, with its type at 32/40. On the next beat it moves to its own box and shrinks to 24/32 together (400, ease), before that beat's visuals enter.
- `data-exit` on a statement sentence or a visual is the beat it leaves on. A statement can change within a slide: on that beat the leaving sentences genie out first, then the entering ones pour in (slide 1, beat 4).
- `data-frame` marks a visual's frame (`.chat-turn`, `.prompt-field`, `.site-frame`); a flat scene's frame is its `container: true` shape. Framed visuals open and close (motion.md). It replaced `data-open` and `data-leave="shrink"` (2026-11-23).
- `data-cols`, `data-at` and `data-rows` on a `.slide-visual` place it by hand: its column span, its first column and its row fields (slide 7's knot on columns 1–5, its site on 7–10; slide 8's knot box across all 12 columns and 6 rows).
- `.slide-statement[data-place="grid"]` lays the statement on the slide's own grid as a subgrid, so words can sit under or between visuals (slide 7: a caption under each visual on row 5, "or" centred in column 6, "Old way:" on the base line at 64/72). Its phrases use `data-enter` to follow the graphics.
- `data-carry="<name>"` on an artefact carries it to the next slide's artefact of the same name, which moves to its new box instead of leaving and re-entering (slide 6's artist site to slides 7 and 8). Scenes carry by scene name as before, and a carry backwards cuts.
- `data-stack="<beat>"` on an artefact slides it onto the slide's `data-stack-target` on that beat and cuts it away (slide 6; motion.md).
- `data-handover` on a carried template hands it to a scene that owns it (slide 8: the knot scene hides it once its sculpture takes over).
- Graphic boxes: `data-inset` pads the fit, `data-fit-rows="4"` fits the drawing to the first rows of a taller box (so a carried knot keeps its scale), and `data-knot-col` / `data-node-col` place the knot and folder by column.
- `.slide-statement[data-place="stack"]` is a second statement on 6 columns, hung from row 1 and moved so its `[data-link-target]` line is centred in the frame (slide 1: "Specific instructions / =" then "creative decisions").
- **Within a beat** the phases run in order: leaving and erasing artefacts (together), then a split, then the statement change, then marks, then links. A split on the same beat as a statement change runs with the old sentences' genie out, before the new ones pour in (slide 1, beat 5).

## In the lab
- **`lab/layout.html`, tab 2:** Max's Section from the script, 26 slides in its eight sections, one per bullet. Each statement is the bullet's Text line. For now they're all on the Text template, one beat each, and bullets with no Text line show a `[Placeholder]` statement. Templates, visuals and beats get worked out slide by slide.
- **Hero and tab 1** are on templates too: the hero is Split 6 (see Templates), and tab 1 (the placeholder for Nora's part) has one Split 4 slide with the page layout, in a placeholder section.
- **Tab names** are temporarily "Nora's Section" and "Max's Section", for a layout recording. The hashes are still `#foundations` and `#advanced-topics`.
- **Keys:** ← and →, and PageUp and PageDown from clickers, step beats and flow on across slides, sections and tabs. Clicking a tab or a scroll snap lands on that tab's first slide.
- **Links:** the URL follows the talk: `#advanced-topics/8` is slide 8 of that tab, and `#advanced-topics/7.2` is slide 7's second beat. A reload or a pasted link cuts straight there. `#<tab>` alone is the tab's first slide. The old l toggle is off on this page; the genie page still has it.
- **Rendering cost:** painting a graphic is the expensive step, so the lab keeps its last two painted looks and draws flow packets on top instead of repainting. A carried move or an explode tween still repaints its graphic every frame.
- **Code:** `lab/js/slides.js` (stops, beats, the phases, template placement); box fitting, `setGraphicState()` and `copyGraphicState()` in `lab/js/graphic.js`; the slide grid and footer strip in `lab/css/layout.css`.

## Not built yet
- Real slides from the script: slides 1–8 of tab 2 are built; the rest are still text only (see "In the lab").
- The left nav, and the axis moving to column 3 with it (the code reads `--nav-cols`).
- Reader mode.

## Open
- ~~The accordion's tab headers also show section names, so they appear twice~~: closed. The tabs are named for the presenters' parts, so a header shows the tab and the footer shows the section ([components.md](components.md)).
- ~~Whether the section title carries its number~~: no. Sections are unnumbered everywhere.
- Reader mode: what someone scrolling the page gets instead of beats.
- ~~Whether Wide and Row ever need the statement wider than 6 columns~~: sometimes. `data-statement="large"` (2026-11-22, slide 1) sets a short statement at the Text size, 64/72, across every open column, still on the base line. It's for statements that fit on one line there, so they keep to one row field.
