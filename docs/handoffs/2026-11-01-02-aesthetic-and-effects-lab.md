# Handoff: aesthetic direction and effects lab

Follows [2026-11-01-01-repo-scaffold-and-github.md](2026-11-01-01-repo-scaffold-and-github.md).

## Status: early exploration
The aesthetic is **not decided**. This session was early testing of possible display effects and overall theming. Most of the visual language hasn't been designed yet, including typefaces, layout, flow and pacing, and contained graphics (diagrams, 3D, illustrations). Treat everything below as an experiment, not a direction.

## Accomplished
1. **Starting points recorded.** A grilling session based on Elena Burger's paperclip-punk essay produced initial inspirations and working assumptions (a paperclip-punk base, a pre-window UI display layer, an uncanny mood, projector first). They're in [docs/aesthetic-direction.md](../aesthetic-direction.md). That doc is exploratory: every point in it is open to revision.
2. **Effects lab built:** [lab/](../../lab/), a dialkit playground for testing display effects (low-res emulation, glow, ghosting, scanline/grid with snap scroll, phosphor, theme, type scale, a placeholder low-poly object). The specimen content and the font choices are placeholders. [lab/CLAUDE.md](../../lab/CLAUDE.md) covers the architecture: an invisible DOM text layer, redrawn through WebGL passes in "ink space".
3. **Two test looks saved:** `lab/presets/light.json` (the user's V1) and `lab/presets/dark.json` (their V2). These are temporary snapshots from early testing, not chosen designs. Both turn the grid off, set hardText to 1 and pixelScale to 2. The light look uses a near-black phosphor (`#00010f`), not the blueprint blue.
4. **Shared:** commit `10fbcd1` is pushed to https://github.com/msibley1991/ai-workshop. The README explains how the collaborator runs the lab (`python3 -m http.server 8123` → `/lab/`) and shares presets.

## Things to know
- **Loading a preset overwrites the dialkit version currently selected** (V1, V2…), and those versions persist only in that browser's localStorage. Preset JSON files are the only shared source of truth.
- The lab's built-in preview browser throttles requestAnimationFrame when the pane is hidden, so ghosting and snap scrolling can look wrong in screenshots. Judge motion in a real browser.
- With snap scroll on, the visible render can be up to one grid step away from the invisible DOM, so drag-selection may be slightly off.
- The `presenter` and `reader` presets are untested guesses. Nobody has tested on a projector yet.
- `~/ai-workshop-lab` (outside the repo) is an obsolete copy. The user may delete it; don't use it.

## User preferences
- Keep scaffolds minimal, and don't hard-lock design decisions: everything should be tunable first.
- Ask high-level aesthetic questions before low-level rendering choices; the user deferred the 3D render style deliberately.
- The site is a long, multi-section scroll page that doubles as the presentation, with presenter-only key commands. Display priority is projector first, then web.

## Next steps (not started)
- Keep exploring the aesthetic; most of it is undecided:
  - typefaces and type scale
  - layout and grid
  - flow and pacing of the scroll presentation
  - contained graphics (diagrams, 3D render style, illustrations)
  - palette
  - whether and how the display effects carry over at all
- Only once choices settle: turn the values into tokens in `css/style.css` (`:root`) and decide how the effects layer moves from `lab/` into the real site.
- Collaborator still needs a GitHub collaborator invite to push branches. Their username is needed.

## Suggested skills
- `grill-me`: for the remaining open questions (3D style, palette, type).
- `run`: to start and drive the lab or the site.
- `artifact-design` / `design:design-system`: when turning lab values into a token system.
- `github-pr-workflow`: once the collaborator starts branching.
