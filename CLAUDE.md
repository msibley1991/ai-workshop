# CLAUDE.md

Purpose: _TBD_

## File map

- `index.html`: the page. Links `css/style.css` and `js/main.js`.
- `css/style.css`: all styles. Design tokens go in the `:root` block.
- `js/main.js`: entry script (deferred).
- `assets/`: images, fonts, media.
- `docs/`: context docs. Read only the ones relevant to the task.
- `lab/`: effects playground (separate from the site). See [lab/CLAUDE.md](lab/CLAUDE.md) before working there.

## Conventions

- Plain HTML/CSS/JS. No frameworks or build step unless documented in `docs/`.
- Use tokens from `:root` and don't hardcode colors, fonts, or spacing.
- When adding a doc to `docs/`, add a link to it below.

## Docs

- [docs/aesthetic-direction.md](docs/aesthetic-direction.md): visual direction and open questions (exploratory)
- [docs/handoffs/](docs/handoffs/): session handoff notes, newest last
