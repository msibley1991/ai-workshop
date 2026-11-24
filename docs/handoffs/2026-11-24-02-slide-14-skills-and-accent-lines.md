# Handoff: slide 14 (Skills), accent lines and highlights

Follows [2026-11-24-01-slides-9-13-folders-and-posters.md](2026-11-24-01-slides-9-13-folders-and-posters.md).

This session built slide 14, the Skills section's first slide, and made lines and highlights accent across every graphic. All of it is exploration. **Next: the MCPs slide** (now slide 15).

## What happened

### Slide list
- **Slide 15 deleted:** the "skills vs design documents" placeholder. Its script bullet is spoken-only, so it doesn't need a slide. Every later slide moved up one: MCPs is now 15.
- **New rule:** one slide per bullet by default. A spoken-only bullet may fold into the slide before it, decided case by case.

### Accent for lines, labels and highlights
These are now always accent:
- **In graphics:**
  - connectors, with their arrows and flow packets (also the knot's tile connectors and the sculpture link)
  - leader lines and their dots
  - labels
- **In text artefacts:**
  - wires and cross-links
  - doc caption dots, leaders and text
  - mark bars
  - both span states

Marked spans now look the same as focused ones; Max is fine with that. One effect: on slide 11, beat 3's "step down" of `CLAUDE.md` from focus to mark no longer shows.

Labels went accent as a legibility test, and Max then chose to document it.

### Slide 9
The spoiler (`data-bottom`) now sits with its bottom edge on the bottom of row 6. Before, it hung from the top of the lowest row it fit in.

### Slide 14 (Row, two beats)
- **Beat 1:**
  - **Folder:** it carries from slide 13 (`data-carry="project-folder-2"`). In place, `design-system/` closes (200), then `skills/` opens (200) with its three files marked, and `skills/` takes the focus. This is the new folder swap (`treeSwap()`); it runs the same way back.
  - **Docs:** the accent rectangle and three compact skill docs open 200 apart:
    - `build-component.md`, a technical workflow
    - `no-slop.md`, an anti-slop skill
    - `grill-me.md`, how the LLM works with you
  - **Wire:** one accent wire runs level from `skills/` to the rectangle, as on slide 13.
- **Beat 2:** "Warning: sometimes skills can be malicious." pours in, in accent, on the base line from column 8 (`data-at="8"`). It's out of the statement's flow, so the first sentences take fewer rows and the docs get more.
- **Shared tree:** slide 13's tree now holds `skills/`'s files too, closed with `data-closed`.
- **Carries:** a carry into the same box now skips its empty move step.

### Docs
The design docs were checked against the build (the source of truth) and fixed:
- `graphics.md`: accent for lines and labels
- `text-artefacts.md`: spans, wires, captions, carries, the folder swap, the skill docs
- `slide-templates.md`: accent sentences, `data-at`, `data-bottom`, the folder swap step, the bullet rule
- `motion.md`: folder swap timing
- `lab/CLAUDE.md`

## Current state
- **Run:** `python3 serve.py`, then `/lab/layout.html#advanced-topics/13` → 14.
- **How it was checked:** probes in the browser pane covered:
  - the swap order forward and back
  - spans at each end
  - a jump to `#advanced-topics/14`
  - beat 2's column and base line
  - console errors (none)
- **Looks:** Max checked slide 14 in Chrome and it looks fine. The swap's timing wasn't judged, because the pane drops frames.
- **Rough edges:**
  - At 1440 the warning wraps to two lines. At three lines it would rise above the base line.
  - Older contradictions this session didn't touch are left alone, such as motion.md's "No fades" beside its fade exception.

## Next session: MCPs (slide 15)
- **Script:** the bullet's Text line is still empty ("MCP (Model Context Protocol):"). Its TODO is a custom Figma ↔ Agent ↔ live code graphic, with no screenshots.
- **Process:** grill it first with `grill-me`. Ask before inventing visuals the script marks *needed*.
- **Reusable now:**
  - the folder with the swap
  - compact docs
  - wires
  - `data-at` sentences
  - `data-step`, `data-delay`
  - carries
- **To do:** remove the temporary dialkit-hide style in `lab/layout.html` when the layout work ends.

## Working preferences
- You verify visuals in Chrome; probes cover behaviour and timing only.
- Write docs and the handoff at session end.
- Don't mention commit status every turn.
- Design-system docs are reference, not blockers.
- Rows are loose: only flag real overlaps.
- Commit and push only when asked. Work on `main` until your colleague joins.
