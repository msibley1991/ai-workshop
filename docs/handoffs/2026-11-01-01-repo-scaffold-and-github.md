# Handoff: repo scaffold and GitHub setup

## Project
Two collaborators are building a website about LLM-assisted coding in a creative context. The site is also an example of that kind of work, and its repo will be walked through during the presentation.

## Accomplished
1. **Barebones skeleton created.** Plain HTML/CSS/JS with no framework and no build step, built so an LLM can navigate it quickly. See [CLAUDE.md](../../CLAUDE.md) for the file map and conventions.
   - [index.html](../../index.html): HTML5 boilerplate with an empty `<main>`.
   - [css/style.css](../../css/style.css): empty `:root` token block and a minimal reset.
   - [js/main.js](../../js/main.js): empty entry script, loaded with `defer`.
   - `assets/` and `docs/`: empty except for `.gitkeep` files.
2. **Git and GitHub.** Branch renamed `master` → `main`. Public repo created and pushed: https://github.com/msibley1991/ai-workshop. Local `main` tracks `origin/main`.
3. **README.** [README.md](../../README.md) now explains how to clone, pull the latest `main`, merge `main` into a personal branch, and run locally.

Commits: `716b6f7` (scaffold) and `2d06db1` (README instructions).

## Decisions and user preferences
- The user rejected an earlier, larger proposal (Astro, chapter content, a `process/` folder). They want **minimal scaffolds with no placeholder content**. A presentation-outline image that was briefly in the folder is irrelevant; ignore it.
- `CLAUDE.md` stays short and links out to `docs/` rather than inlining content.
- Design values (colors, fonts, spacing) go only in `:root` in `css/style.css`.

## Open items
- **Partner not yet a collaborator.** They need a GitHub collaborator invite to push branches. Neither the user nor this session has sent one; the partner's GitHub username is still needed (`gh api -X PUT repos/msibley1991/ai-workshop/collaborators/<username>`).
- `CLAUDE.md` still has `Purpose: _TBD_`.
- No context docs exist in `docs/` yet (design, stack, etc.).
- The site hasn't been opened in a browser to check it. To check: `python3 -m http.server`, then http://localhost:8000.

## Suggested skills
- `run`: launch and check the site locally.
- `github-repo-management`: collaborator invites and repo settings.
- `github-pr-workflow`: once the partner starts opening branches and PRs.
- `artifact-design` or `claude-design`: when visual design work begins.
- `grill-me`: to pin down site purpose and content before filling in `CLAUDE.md` and `docs/`.
