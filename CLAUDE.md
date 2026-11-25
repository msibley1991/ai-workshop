# CLAUDE.md

## Goal

This repo is a website that holds our workshop talk on designing with coding agents, and it doubles as the worked example of what the talk teaches. The talk has two parts, Nora's Section and Max's Section. Max's script is [docs/max-pres-draft/max-pres-v3.md](docs/max-pres-draft/max-pres-v3.md). Some of these docs will also become pages on the site, so the audience can see how the project is set up.

## Where to look

- `lab/layout.html`: the talk as it's being built, slide by slide. Read [lab/CLAUDE.md](lab/CLAUDE.md) before working there.
- `lab/`: the playground where the display effects, type, shading and motion are tuned.
- `index.html`, `css/style.css`, `js/main.js`: the site's root files, still a scaffold. The talk moves here once it's settled. Design tokens go in the `:root` block of `css/style.css`.
- `assets/fonts/`: self-hosted fonts, one folder per family, each with its OFL.txt.
- `docs/`: the script, the design system and session handoffs. Read only the ones relevant to the task.
- `serve.py`: serves the repo root on port 8123 (`python3 serve.py`), and saves the lab's presets.

## Rules

- Plain HTML, CSS and JS. No frameworks or build step unless a doc in `docs/` says otherwise.
- Use the tokens from `:root`. Don't hardcode colours, fonts or spacing.
- Design-system docs are exploration unless they say they're settled.
- When you add a doc to `docs/`, add its link below.

## Git

- For now Max works directly on `main`. Once a second person joins, work on a branch and bring in their work with `git fetch origin`, then `git merge origin/main`, then test the site and the lab pages before pushing. The full steps are in [README.md](README.md#working-together).
- Commit, merge and push only when asked.
- `lab/presets/*.json` are written by the lab's save buttons and often conflict. When resolving one, ask which values to keep.

## Docs

- [docs/glossary.md](docs/glossary.md): points to the glossary page, `lab/glossary.html`, which holds the talk's terms from the Figma Glossary frame
- [docs/aesthetic-direction.md](docs/aesthetic-direction.md): visual direction and open questions (exploratory)
- [docs/design-system/layout-grid.md](docs/design-system/layout-grid.md): layout grid and spacing scheme (exploratory, built in the lab layout page)
- [docs/design-system/typography.md](docs/design-system/typography.md): typefaces and type hierarchy (settled; tokens in `css/style.css`)
- [docs/design-system/palettes.md](docs/design-system/palettes.md): viewer-selectable palettes and the controls panel (exploratory, built in the lab layout page)
- [docs/design-system/graphics.md](docs/design-system/graphics.md): flat and isometric graphics, hatch shading, line weights, accent as focus (exploration, built in the lab shading and layout pages)
- [docs/design-system/slide-templates.md](docs/design-system/slide-templates.md): sections, slides and beats; row fields; the five templates; slide and section changes (exploration)
- [docs/design-system/motion.md](docs/design-system/motion.md): motion rules: curves, named durations and sizes, loops, enter/exit, the text genie (exploration; genie built in the lab genie page)
- [docs/design-system/display.md](docs/design-system/display.md): the display layer: one tuned look, ambient effects, viewer overrides, the DOM fallback, the projector test (exploration; tuned on the lab layout page)
- [docs/design-system/text-artefacts.md](docs/design-system/text-artefacts.md): prompts, chats, documents and file trees as graphics of legible text: the face rule, span states, cross-links, carried spans, retype, the camera, detail levels, pixelated blur (exploration; partly built in the lab layout page, slides 1, 2 and 10–13)
- [docs/design-system/components.md](docs/design-system/components.md): interface chrome: bars, palette indicator, key hints, buttons, panels, the subtree nav, tab headers, links (exploration; partly built in the lab layout page)
- [docs/handoffs/](docs/handoffs/): session handoff notes, newest last
