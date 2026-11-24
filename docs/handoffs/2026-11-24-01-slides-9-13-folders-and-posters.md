# Handoff: slides 9–13, project folders, docs and the poster grid

Follows [2026-11-23-02-slides-5-8-knot-and-sculpture.md](2026-11-23-02-slides-5-8-knot-and-sculpture.md).

This session built slides 9–13 of Max's Section, most of them grilled first. It also tidied the script and rewrote the root CLAUDE.md. All of it is exploration. **Next: slide 14**, the Skills section's first slide ("Skills: keywords for directions…").

## What happened

### Script and slide list
- **TODO lines belong to the slide before them.** An agent had turned each bullet's TODO (example links, the Figma graphic) into a slide of its own. In `max-pres-v3.md` they're now nested under their bullets, and those five placeholder slides are deleted.
- Max deleted slide 12 ("What else goes in the folder?") and folded the brand-system bullet into the poster bullet, so the "Brand systems…" slide is gone too.
- Text changes Max made in the draft and mirrored on the slides:
  - slide 9's second sentence
  - slide 11's three lines
  - slide 12's three questions

### Slide 9 (Text, two beats)
- Beat 1 is three lines from row 1 (`data-row="1"`), each starting a new line with a blank line between (`.st-line`).
- Beat 2 is the spoiler, hung from the lowest row field it fits in (`data-bottom`).
- Rule for every pure Text slide (no visual): it now starts on row 2.

### Slide 10 (Row, two beats)
- **Beat 1:** slide 1's three separated instruction boxes, plain, on columns 1–4. They type in. "for buy buttons only" is cut from the first box.
- **Beat 2:** the framed `project/` folder on columns 6–7, then the docs.
  - The folder has an inverted header, drawn trunks and ticks like the nav, no ▸/▾ marks and no `…`.
  - It holds `CLAUDE.md`, `design-system/` (`colours.md`, `typography.md`, `layout.md`), `references/`, `skills/` and `tools/`.
  - Wires run from the boxes to the folder's left edge, level with each file. Then the wireframe docs open on columns 10–12, and wires run from the folder's right edge to them (`data-step="1"`).

### Slide 11 (Split 4, three beats)
- **Beat 1:** the folder carries over from slide 10 (`data-carry="project-folder"`). `CLAUDE.md` is in focus (accent bar).
- **Beat 2:** the CLAUDE.md doc for the coffee roastery opens on columns 8–10. It shows no symbols yet. Its captions (Goal, Table of contents, Rules) cut in, and a wire draws from the file.
- **Beat 3:** `#`, `##` and `-` type in, in accent, hanging so the text doesn't move. `CLAUDE.md` steps down to an ink mark.

### Slide 12 (Split 4, three beats)
- **Beat 1:** a Swiss-modern roastery poster at full height:
  - the "roast / day" headline, pulled left onto the first column line
  - "01" in the corner
  - the info columns
  - grid lines ending at each text column's left edge
  - a cup from above: an ink rim (`--st` 5cqw) centred on the third line, coffee half accent and half hatched, and a handle to the first line
- **Beat 2:** three steps of 400. The poster cuts to its wireframe and shrinks onto column 6, four copies fan out across (columns 7–10), then three rows fan out down: 5 × 4.
- **Beat 3:** four identical pictogram "new hires", ink and accent in turn. Their right edges touch column 5's right edge. They rise 100 apart and fade out on exit.

### Slide 13 (Row, one beat)
- The folder on columns 1–2, with `design-system/` in focus and its three files marked.
- Three compact (16/24) raw-Markdown spec docs, `colours.md`, `typography.md` and `layout.md`. They sit 16 inside an accent rectangle on columns 4–12 and rows 1–4, and open 200 apart.
- An accent wire runs level from `design-system/` to the rectangle. There are no file-to-doc wires: the order and the names carry the link.

### Other
- **Grid toggle:** g now also shows the slides' row fields. The raster now draws fainter fills under stronger ones, so the cells read.
- **Raster fix:** it no longer draws a bullet for lists styled `list-style: none`. The stray dots were these bullets.
- **Statement line breaks:** a line break in a statement is a blank line.
- **Docs and READMEs:**
  - The root `CLAUDE.md` is rewritten for the repo's goal: the talk site that is its own worked example. It's written to be shown and will be linked from slide 11.
  - The README intro and `lab/CLAUDE.md`'s opening now match it.
- **Design docs updated:**
  - `text-artefacts.md`: what's built, the File tree and Document kinds.
  - `slide-templates.md`: the new attributes, the TODO rule, the row-2 rule.
  - `motion.md`: the fade exit, the poster grid, `data-delay`.
  - `lab/CLAUDE.md`: a summary of the new code.

## Current state
- **Run:** `python3 serve.py`, then `/lab/layout.html#advanced-topics/9` through `/13`.
- **How it was checked:** probes in the browser pane covered positions, beat order, back steps, carries and slide changes. There were no console errors.
- **Not yet confirmed in Chrome:** the look of slides 10–13 after this session's last rounds, and the timing of slide 13's 200 ms stagger and slide 12's fade. The pane was hidden for the last probes, so animations jumped to their end.
- **Rough edges:**
  - **Narrow canvas:** at the browser pane's 1440-unit width:
    - Slide 12's posters hit the column width, so the grid ends above the bottom.
    - Slide 11's doc fills all 6 rows.
    - Slide 10's folder slightly overflows a 3-row visual area.

    All three should be fine at 1920.
  - **Slide 13's docs:** their text fills only about half to two-thirds of each frame. Max may want more lines.
  - **Root `index.html`:** still a scaffold. The talk moves there later.

## Next session: slide 14
- **Skills section:** the script's bullets for it are "Skills: keywords for directions…" and a spoken-only bullet that has a placeholder slide.
- **Process:** grill each slide first with `grill-me`. Ask before inventing visuals the script marks *needed*.
- **Reusable now:**
  - the project folder (`.tree-pane`, span states)
  - document panes (wireframe, full, compact)
  - wires (`data-wire-*`)
  - captions on docs (`.doc-cap`)
  - `data-step`, `data-delay`, `data-type-at`, `data-exit-fade`
  - carries
- **To do:** remove the temporary dialkit-hide style in `lab/layout.html` when the layout work ends.

## Working preferences
- You verify visuals in Chrome; probes cover behaviour and timing only.
- Write docs and the handoff at session end, not after each change.
- Don't mention commit status every turn.
- Design-system docs are reference, not blockers.
- Rows are loose: only flag real overlaps.
- Commit and push only when asked. Work on `main` until your colleague joins.
