# Handoff: text artefacts and components grilled, chrome and nav built

Follows [2026-11-22-02-rendering-cost-render-menu-tv.md](2026-11-22-02-rendering-cost-render-menu-tv.md). This session grilled two design-system gaps (text artefacts, then interface components), wrote both up, built the components in the lab, and fixed clicker keys. **The next session builds the real slides for Max's Section.**

## What happened

### 1. Text artefacts (`docs/design-system/text-artefacts.md`, new, not built)
- **What they are:** prompts, chats, documents and file trees, shown as **graphics made of legible text**. They're graphics first and text second. They look like the screens the audience already knows, drawn in the system's palette, line weights and type.
- **Kinds:**
  - Prompt: an input field.
  - Chat: your turns boxed on the right, the agent's unboxed on the left, with bold speaker labels.
  - Document: an editor pane showing raw Markdown.
  - File tree: a sidebar list.
- **Face rule:** sans for what a person types, mono for what a machine writes or a file holds.
- **Span states:** plain, marked (an ink bar with the text knocked out), focus (an accent bar, one per graphic) and blurred. Each slide sets every span's state per beat.
- **Cross-links:** a line from a span to a word in the statement, bending horizontal, 45°, horizontal.
- **Carried spans:** spans can be carried to another artefact, trimmed on the way, or evolve. Changed text is **retyped**, character by character with a cursor.
- **Camera:** the artefact is a sheet and its box is a camera on it. Zoom redraws the type larger, scroll jumps by whole lines, and the cut edges fade by pixel blur.
- **Size:** three detail levels (full, compact at 16/24, wireframe), and a minimum width of 2 columns.
- **Blur:** pixelated blur in fixed steps of 2, 4 and 8 units. Blurred text can't be selected.
- **Real files:** abridge, don't invent. Artefacts carry no links.
- **Other docs edited:**
  - typography: the mono rule is wider inside artefacts.
  - motion: the genie is for statements only, and artefacts use retype.
  - graphics Labels: labels may link to a glossary (to be built later).

### 2. Interface components (`docs/design-system/components.md`, new, built)
- **No position display anywhere.** There's no step value or slide count, and **sections aren't numbered**. That closes two open items in slide-templates.
- **Top bar:** the title, and on the right `Palette - Ink` followed by three 8 × 8 boxes.
  - The boxes are ground (ink outline), ink (accent outline) and accent (ink outline). You reordered them at the end of the session.
  - Clicking it opens the controls.
- **Bottom bar:** `[←] [→] Step`, `[n] Nav` and `[g] Grid` on the left; `[f] Fullscreen` and `[c] Controls` on the right.
  - Every bracketed key is a button.
  - A hint stays pressed while its thing is on.
  - The arrow at either end of the talk dims.
  - Grid ships, because the talk is about design.
- **Left nav:** a panel over columns 1–2, and the text axis moves to column 3.
  - It's a drawn subtree: the hero as a root entry, then tab folders (`Max's Section/`) with their sections hanging from trunks and ticks.
  - A folder opens on hover or when the menu highlight is on it. The folder you're in stays open, and the others end in `…`.
  - Clicking a section goes to its first slide, and clicking a folder goes to its tab's first slide. The current section is inverted.
- **Menus:** only one is open at a time, and the c and n keys swap or close them. While a menu is open it takes the keys: ↑ ↓ move the highlight, Tab and Shift+Tab jump between groups, and Enter or Space selects.
- **Clicker keys:** PageDown and PageUp step beats, like → and ←, so a clicker no longer skips tabs. ↑ ↓ and Space still jump tabs. Checked in Chrome with real key presses.
- **Links:** links that leave the site open in a new tab and end in `↗`, with an inverted hover. This isn't built yet, because the page has no such links.

### 3. Lab code
- `lab/js/layout.js`:
  - `makePanel()` drives both panels.
  - The `menu` keys run in the capture phase.
  - The nav tree is built from the page.
  - The bar buttons are wired here.
- `lab/js/slides.js`: adds `goto(i)`, `position()` and an `onMove` callback.
- `lab/css/layout.css`:
  - `--nav-open` and `--nav-push` step the panel boxes in from the left.
  - `.slides` keeps the canvas columns with a negative margin.
  - The sink and footer follow the box edge.
- `lab/genie.html` has the same bars without the nav. There, g still opens the graph editor.
- Two bugs were found and fixed:
  - With motion off, menus didn't take the keys, because the toggle returned early.
  - The swatch fills inherited the button's `--fill-alpha: 0`, so they didn't draw.

## Current state
- **To run it:** `python3 serve.py`, then `/lab/layout.html`. Minimize dialkit and click the page before using keys.
- **How it was checked:**
  - Probes in the browser pane, with motion off because rAF doesn't run while the pane is hidden: panel geometry, axis and sink positions, nav lines and indents, the Esc and swap order, menu keys, jumps, dimmed arrows and console errors.
  - You checked visuals in Chrome, including the palette boxes.
  - **Not judged yet:** panel slides with motion on, and two items inverted at once when the highlight is off the current entry.
- **Commits:** docs `a736f2a`, lab chrome `25e7f74`, swatch order `e0dd4e8`. This handoff is the next commit.

## Working preferences (from this session)
- When a grill ends with "write the doc", write the doc only. Building is a separate request.
- Beats are decided slide by slide. Don't plan beats in system docs.
- Text artefacts are graphics first. Lean toward familiar UI over strict system rules.
- You test visuals in Chrome. Probes cover behaviour.

## Next session: Max's Section slides
- **Source:** `docs/max-pres-draft/max-pres-v3.md`. Each part (`##`) is a section, and each bullet is a slide with Spoken, Text and Visual. The rules are in `slide-templates.md`.
- **Today:** tab 2 (`#advanced-topics`, "Max's Section") holds seven placeholder slides in three made-up sections in `lab/layout.html`. They get replaced. The nav and footer pick up `data-section` names on their own.
- **Order of work, suggested:**
  1. Lay out every section and slide as Text or Split slides, with statements from each slide's **Text** line, one sentence per beat. That gets the whole talk steppable early.
  2. Then the visuals, one at a time. Many say *needed*: ask before inventing any, as the earlier sessions agreed.
- **Blockers for the visuals:**
  - §1 and §3 lean on **text artefacts** (a generic vs detailed prompt, highlighted instructions, a prompt turning into a project folder, CLAUDE.md). None of that is built: no artefact component, span states, cross-links, carried spans, retype or blur. Building it is probably its own piece of work, before or during the slides.
  - Only two scenes exist (`exploded-stack`, `page-layout`). Most visuals will need new scenes in `lab/js/graphics/`.
  - **Links** (§3–5 example links, the §8 download) need the link rules from components.md built.
- **Still open:** the real tab names (after the layout recording), and the projector test (display.md).

## Suggested skills
- `grill-me` per section if a slide's visual is unclear.
- `diagnose` if stutter shows up with more slides.
