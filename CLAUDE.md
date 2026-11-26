# CLAUDE.md

## Goal

This repo is a website that holds our workshop talk on designing with coding agents, and it doubles as the worked example of what the talk teaches. The talk has two parts, Nora's Section and Max's Section. Max's script is [docs/max-pres-draft/max-pres-v3.md](docs/max-pres-draft/max-pres-v3.md). Some of these docs will also become pages on the site, so the audience can see how the project is set up.

## Where to look

- `index.html`: the talk, slide by slide; `glossary.html`: the glossary. Both run on the display engine in `js/` (render, raster, slides, graphics) with `css/site.css`. Read [js/CLAUDE.md](js/CLAUDE.md), which maps the engine, before working on either.
- `css/style.css`: design tokens (the `:root` block), fonts and registered properties.
- `presets/`: the saved look (palettes and shared display settings), static JSON the site loads. Viewers' own choices stay in their browser.
- `playground.html`: the playground, a tab per tool (genie, shading, type, display); viewers' changes follow them onto the talk. On localhost it also has the full dial panels for tuning and saving the look.
- The site is meant to be published as static files (Vercel): nothing can save there. The dialkit panels load only on localhost, hidden until `d` shows them (`d` again hides them).
- `assets/fonts/`: self-hosted fonts, one folder per family, each with its OFL.txt.
- `docs/`: the script, the design system and session handoffs. Read only the ones relevant to the task.
- `serve.py`: serves the repo root on port 8123 (`python3 serve.py`), and saves `presets/*.json` from the dial panels.

## Rules

- Plain HTML, CSS and JS. No frameworks or build step unless a doc in `docs/` says otherwise.
- Use the tokens from `:root`. Don't hardcode colours, fonts or spacing.
- Design-system docs are exploration unless they say they're settled.
- When you add a doc to `docs/`, add its link below.

## Git

- For now Max works directly on `main`. Once a second person joins, work on a branch and bring in their work with `git fetch origin`, then `git merge origin/main`, then test the talk, the glossary and the playground before pushing. The full steps are in [README.md](README.md#working-together).
- Commit, merge and push only when asked.
- `presets/*.json` are written by the dial panels' save buttons and often conflict. When resolving one, ask which values to keep.

## Docs

- [docs/glossary.md](docs/glossary.md): points to the glossary page, `glossary.html`, which holds the talk's terms from the Figma Glossary frame
- [docs/aesthetic-direction.md](docs/aesthetic-direction.md): visual direction and open questions (exploratory)
- [docs/design-system/layout-grid.md](docs/design-system/layout-grid.md): layout grid and spacing scheme (exploratory, built in the talk page)
- [docs/design-system/typography.md](docs/design-system/typography.md): typefaces and type hierarchy (settled; tokens in `css/style.css`)
- [docs/design-system/palettes.md](docs/design-system/palettes.md): viewer-selectable palettes and the controls panel (exploratory, built in the talk page)
- [docs/design-system/graphics.md](docs/design-system/graphics.md): flat and isometric graphics, hatch shading, line weights, accent as focus (exploration, built in the talk and the playground's Shading tab)
- [docs/design-system/slide-templates.md](docs/design-system/slide-templates.md): sections, slides and beats; row fields; the five templates; slide and section changes (exploration)
- [docs/design-system/motion.md](docs/design-system/motion.md): motion rules: curves, named durations and sizes, loops, enter/exit, the text genie (exploration; genie tuned on the playground's Genie tab)
- [docs/design-system/display.md](docs/design-system/display.md): the display layer: one tuned look, ambient effects, viewer overrides, the DOM fallback, the projector test (exploration; tuned on the talk page)
- [docs/design-system/text-artefacts.md](docs/design-system/text-artefacts.md): prompts, chats, documents and file trees as graphics of legible text: the face rule, span states, cross-links, carried spans, retype, the camera, detail levels, pixelated blur (exploration; partly built in the talk page, slides 1, 2 and 10–13)
- [docs/design-system/components.md](docs/design-system/components.md): interface chrome: bars, palette indicator, key hints, buttons, panels, the subtree nav, tab headers, links (exploration; partly built in the talk page)
- [docs/design-system/playground.md](docs/design-system/playground.md): the playground page: a tab per tool (genie, shading, type, display), curated controls, viewer overrides on preset defaults, the build order (exploration; not built)
- [docs/handoffs/](docs/handoffs/): session handoff notes, newest last
