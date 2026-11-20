# Handoff: lab ghosting dials and layout test page

Follows [2026-11-20-01-presentation-script-flow.md](2026-11-20-01-presentation-script-flow.md), from the same session.

## What happened
1. **Committed and pushed earlier uncommitted work:**
   - `360cf42`: script drafts v1 and v2
   - `9c6923c`: `serve.py`, plus the README and launch config changes that use it
   - `c1e80eb`: the lab raster extensions and the Figma layout test page (`lab/layout.html`)
2. **`d38d3bf`: removed the "Individual Task" tab** from `lab/layout.html`. The talk is now split into two sections: **Foundations** (Nora, first) and **Advanced Topics** (the user, second). The labels themselves are still placeholders. The `--avail` math in `lab/css/layout.css` is updated for two tabs.
3. **`dbba476`: new dials and a ghost fix.**
   - **outline → width:** sets `--line`, which is the thickness of the bars and tab outlines on the layout page. The dashed graphic placeholders keep `--line-dashed`.
   - **phosphor → layered persistence colors:** `persistenceColor` 2 and 3, `layers` (1–3), `layerMode` (blend / bands) and `layerFrames`.
     - A ghost's age is stored in the ghost texture's alpha and counted in frames. An earlier version judged age by brightness, which made layers invisible.
     - **bands** holds brightness until the last layer and switches colors in whole steps. In bands, shift only tints layer 1.
   - **Fix:** the persistence target is now scaled to the ghost's own brightness, so **shift** changes hue but not fade speed. It used to dim trails on light themes.
4. **`a565a0d`: ghost → blur.**
   - The blur is applied to the feedback every frame, so trails soften as they age.
   - Only ghost pixels (alpha > 0) spread. Neighbors that aren't ghosts stand in as bare ground, or as the pixel itself, so still content is left untouched. An earlier version made antialiased text edges bleed color.

All of this is pushed to `origin/main`. Details are in the shader comments in [lab/js/passes/ghost.js](../../lab/js/passes/ghost.js) and the dial comments in [lab/js/params.js](../../lab/js/params.js).

## Current state
- The user re-saved `lab/presets/light.json` after each change; it's the current look they're tuning. Notable values:
  - shift 1, decay 0.75, blur 1.5
  - 2 layers in blend mode, layerFrames 10
  - outline width 2
- **scroll gain does nothing on `layout.html`.** It reads `window.scrollY`, and that page never scrolls because the wheel drives the accordion. The user said to leave it.
- Layer frames count rendered frames, so timing varies with the display's refresh rate.
- To run it: `python3 serve.py`, then open http://localhost:8123/lab/layout.html. Use the panel's "Save to preset" to write presets (this needs `serve.py`).

## Working preferences (from this session)
- For "would it be possible…?" questions, explain briefly and ask before building.
- Do exactly what's asked and don't pile on suggestions.
- The user checks the look themselves. Verify with console and error checks only, no screenshots.
- The user commits after saving a preset. Commit only what they ask for, then offer to push.

## Open items
- The design system for the site is still undecided (see [docs/aesthetic-direction.md](../aesthetic-direction.md)). The slide text and visuals in `docs/max-pres-draft/max-pres-v3.md` wait on it.
- The layout page uses Eurostile, which isn't in the repo. Collaborators without it see a fallback font.

## Suggested skills
- `run`: start the lab and drive the layout page.
- `diagnose`: for effect bugs. Simulating the shader math in a short script worked well here.
- `grill-me`: before the design-system decisions.
- `design:design-system`: once the look settles and values move into `css/style.css` tokens.
