# Handoff: presentation script flow (max-pres-v3)

Follows [2026-11-01-02-aesthetic-and-effects-lab.md](2026-11-01-02-aesthetic-and-effects-lab.md).

## Project context
The site is a long scroll page that doubles as the presentation (see the earlier handoffs). This session worked on the user's half of the talk. The script lives in [docs/max-pres-draft/](../max-pres-draft/):
- `max-pres-v1.md`, `max-pres-v2.md`: earlier drafts, left untouched.
- **`max-pres-v3.md`: the current script.** Each section is a list of beats. Each beat has `spoken:` (what's said), `text:` (slide text) and `*visual:*` (graphic concept).

## Status
- **Spoken lines: mostly settled.** The user is largely happy with them and writes them in their own voice. Don't rewrite spoken lines unless asked; limit edits to grammar and spelling.
- **Slide text and visuals: provisional.** Both will be redone once the site has a design system. Treat every `text:` and `*visual:*` line as a placeholder.
- Timing assumption: the talk runs about 1 hour, with at least 5 minutes of improvised, unwritten material per numbered section.

## What happened this session
1. Copied v2 to v3.
2. Grilled the user on the flow and recorded the decisions below.
3. Restructured v3:
   - Design Systems moved before Skills.
   - The "skills vs design documents" paragraph moved into Skills.
   - Grammar and spelling fixed only.
   - `*TODO*` markers added.
   - A section 8 heading added.
4. Second grilling, on the conclusion. I drafted section 8, but **the user replaced it with their own spoken text**, so my draft is gone.

The decision notes are also in `~/.claude/plans/your-estimate-doesn-t-consider-sharded-puppy.md`. That file is outside the repo and may not exist on the collaborator's machine; the summary below is what matters.

## Decided flow
- **Spine:** design skill = control. Creative decisions come from your own taste, and AI defaults to the average.
- **Order:**
  1. Recap / creative decisions (with a taste seed)
  2. State of Digital Media
  3. Coding Agents
  4. Design Systems
  5. Skills
  6. MCPs
  7. Make Your Own Tools
  8. Conclusion: Taste
- **Examples:** links to separate pages that open in a new tab, so the presenter keeps their place in the scroll:
  - §3: CLAUDE.md page
  - §4: design system page
  - §5: formatted `/grill-me` session
  - §7: graphics playground
- **§6 MCPs:** a custom Figma ↔ Agent ↔ live code graphic instead of an example link.
- **Graphics:** each section still has its own animated graphics. No screenshots that break the aesthetic direction.
- **No repo walkthrough.** The repo is offered as a downloadable zip, and the example pages refer to its file structure.
- **Cut:** the v1 Weinermobile allegory.
- **Not referenced:** the talk's title, "how (did you [make] this?)". The user explained it in three layers: *how?* / *did you actually make this?* / *what do we mean by making?*

## The user's own edits to v3 (made after my pass)
- **§1:** the taste beat is now written. It adds that AI "has no innate creativity" and defaults to the average or to what the labs call *correct*.
- **§2:**
  - The opening adds "or the technical knowledge of designers."
  - The last slide text is reworded ("But old tools had a *purpose*…").
- **§5:** the final word of the comparison paragraph changed from "show" to "produce".
- **§6:** the TODO graphic is now Figma ↔ Agent ↔ live code.
- **§7:**
  - The spoken line is expanded into three paragraphs, ending with "Go for it" examples (holographic filter, melting buttons, cursor-lit text shadows).
  - Text and visual are marked needed.
- **§8:**
  - Entirely the user's own text: everything technical will change soon, and they cut a planned command-line tutorial. It includes a Shakespeare/literacy analogy ("capability is not what matters") and ends with an invitation to download the repo.
  - Text and visual are marked needed.

## Loose ends in v3
All resolved:
- The user fixed the §4 issues: the skills reference, 10 vs 50 posters, and the missing `spoken:` labels.
- The remaining typos in §1, §7 and §8 are fixed.
- §2's spoiler "Chat becomes just 10% of the process" is deliberately not paid off; the user says it isn't meant to carry weight. Don't flag it again.

## Working preferences from this session
- The user has their own plan for each step. Do exactly what's asked, and don't volunteer next steps or suggestions unless invited. When grilling, give a recommendation for each question.
- When the user says "planning session" for writing, they may mean "you write it". If unclear, ask whether they want a draft or only the decisions.
- The user checks visuals themselves; don't take screenshots to self-check.

## Likely next focus
A design system for the site. The slide text and visuals in v3 wait on it. See [docs/aesthetic-direction.md](../aesthetic-direction.md) for the open questions: type, palette, layout, 3D style, effects. The lab presets in `lab/presets/` are early experiments.

## Suggested skills
- `grill-me`: pin down design-system decisions one at a time before building anything.
- `design:design-system`: structure the design system into documented sections (the talk's §4 describes this very process).
- `sketch` or `claude-design`: throwaway HTML variants to compare directions.
- `figma:figma-use` / `figma:figma-generate-design`: the user's workflow is a Figma wireframe plus live code via MCP.
- `run`: serve the site or lab locally (`python3 serve.py` → http://localhost:8123).
