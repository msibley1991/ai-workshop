# CLAUDE.md

Purpose: _TBD_

## File map

- `index.html`: the page. Links `css/style.css` and `js/main.js`.
- `css/style.css`: all styles. Design tokens go in the `:root` block.
- `js/main.js`: entry script (deferred).
- `assets/`: images, fonts, media. Self-hosted fonts are in `assets/fonts/`, one folder per family, each with its OFL.txt.
- `docs/`: context docs. Read only the ones relevant to the task.
- `lab/`: effects playground (separate from the site). See [lab/CLAUDE.md](lab/CLAUDE.md) before working there.

## Conventions

- Plain HTML/CSS/JS. No frameworks or build step unless documented in `docs/`.
- Use tokens from `:root` and don't hardcode colors, fonts, or spacing.
- When adding a doc to `docs/`, add a link to it below.

## Git workflow

For now Max works directly on `main`. Once a second person joins the repo:

- Work on a branch, not `main`.
- To bring in the other person's work:
  1. Commit.
  2. Run `git fetch origin`.
  3. Run `git merge origin/main`, not the local `main`, which is stale until fetched.
  4. Resolve any conflicts.
  5. Test the site and the lab pages.
  6. Push.

  The full steps are in [README.md](README.md#working-together).
- Merge, push and commit only when the user asks.
- `lab/presets/*.json` are shared files written by the lab's save buttons, so they are likely to conflict. When resolving a conflict in one, ask the user which values to keep.

## Docs

- [docs/aesthetic-direction.md](docs/aesthetic-direction.md): visual direction and open questions (exploratory)
- [docs/design-system/layout-grid.md](docs/design-system/layout-grid.md): layout grid and spacing scheme (exploratory, built in the lab layout page)
- [docs/design-system/typography.md](docs/design-system/typography.md): typefaces and type hierarchy (settled; tokens in `css/style.css`)
- [docs/design-system/palettes.md](docs/design-system/palettes.md): viewer-selectable palettes and the controls panel (exploratory, built in the lab layout page)
- [docs/design-system/graphics.md](docs/design-system/graphics.md): flat and isometric graphics, hatch shading, line weights, accent as focus (exploration, built in the lab shading and layout pages)
- [docs/design-system/slide-templates.md](docs/design-system/slide-templates.md): sections, slides and beats; row fields; the five templates; slide and section changes (exploration)
- [docs/design-system/motion.md](docs/design-system/motion.md): motion rules: curves, named durations and sizes, loops, enter/exit, the text genie (exploration; genie built in the lab genie page)
- [docs/design-system/display.md](docs/design-system/display.md): the display layer: one tuned look, ambient effects, viewer overrides, the DOM fallback, the projector test (exploration; tuned on the lab layout page)
- [docs/design-system/text-artefacts.md](docs/design-system/text-artefacts.md): prompts, chats, documents and file trees as graphics of legible text: the face rule, span states, cross-links, carried spans, retype, the camera, detail levels, pixelated blur (exploration; not built)
- [docs/design-system/components.md](docs/design-system/components.md): interface chrome: bars, palette indicator, key hints, buttons, panels, the subtree nav, tab headers, links (exploration; partly built in the lab layout page)
- [docs/handoffs/](docs/handoffs/): session handoff notes, newest last
