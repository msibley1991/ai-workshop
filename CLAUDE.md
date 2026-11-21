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

## Docs

- [docs/aesthetic-direction.md](docs/aesthetic-direction.md): visual direction and open questions (exploratory)
- [docs/design-system/layout-grid.md](docs/design-system/layout-grid.md): layout grid and spacing scheme (exploratory, built in the lab layout page)
- [docs/design-system/typography.md](docs/design-system/typography.md): typefaces and type hierarchy (settled; tokens in `css/style.css`)
- [docs/design-system/palettes.md](docs/design-system/palettes.md): viewer-selectable palettes and the controls panel (exploratory, built in the lab layout page)
- [docs/design-system/graphics.md](docs/design-system/graphics.md): flat and isometric graphics, hatch shading, line weights, accent as focus (exploration, built in the lab shading and layout pages)
- [docs/handoffs/](docs/handoffs/): session handoff notes, newest last
