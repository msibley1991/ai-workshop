# Handoff: genie settled, sink squares, open-tab highlight

Follows [2026-11-21-04-spans-motion-genie.md](2026-11-21-04-spans-motion-genie.md). This is a short follow-up session that settled the text genie and brought it onto the layout page.

## What happened
- **Final genie tuning:** the defaults are in `settings` and `DEFAULT_GRAPHS` in `lab/js/genie-warp.js`, and they're tabulated in [motion.md](../design-system/motion.md).
  - Timing: 300 ms per line, follow −0.5, ease, slideStart 0.67.
  - Funnel: profile 0.8 / 0.79 / 0.77, slit 1, rowBand 1.
  - Spine: arc −48, 3 bends, severity 0.
  - Graphs: the arc eases to full by 0.75 of a line's run, and the narrowing stays at 0 until 0.16, then rises to 1 at the end.
  - Each graph's Reset now restores these tuned graphs.
- **The sink square:** every panel with genie text has an 8 × 8 ink square, one box inset (24) in from its bottom-right corner. It's `<span class="genie-sink" data-genie-sink data-fill>`, styled in `lab/css/layout.css`.
  - Text funnels into it and pours out of it, and rows disappear at its top edge.
  - It stays for as long as the tab or intro is open.
  - The "sink width" dial is gone; the square sets the width.
- **Landing:** over the funnel's last 15% (`LANDING` in `genie-warp.js`), the sides always close onto the square and the swing dies out. Without this, rows that arrived before the narrowing graph had finished landed beside the square.
- **Genie on the layout page (settled, no dials or graphs):**
  - The hero and section text blocks are `data-genie`, and each panel has its square.
  - l toggles the open panel's text, because there are no text steps yet. ← and → still step the graphics.
  - The shared play logic is in the new `lab/js/genie-play.js`, which `layout.js` and `genie.js` both use. On the genie page, `genie.js` takes the keys first, in the capture phase.
- **The open tab stays highlighted:** a tab's header stays inverted while it's open (the label's `aria-current`), on both pages, in `lab/css/layout.css`.

## Current state
- **To run it:** `python3 serve.py`, then:
  - `/lab/layout.html#foundations`: press l for the genie, ← and → for the graphics.
  - `/lab/genie.html`: the dials, plus g for the graph editor.
- **How it was checked:** module probes in the browser pane:
  - the square's size and inset, and that it's drawn in ink
  - ink converging onto the square, and none below its top edge
  - l toggling on both pages, and the genie page handling it only once
  - the open-tab highlight following the tab across switches
  - no console errors

  You've looked at the square and judged it right.
- **Saved values:** browsers keep their saved Genie dials and graphs (`dialkit:lab-genie`, `lab-genie-graphs`). Clear them to see the defaults on the genie page. The layout page always uses the defaults.

## Working preferences
- Write the handoff before committing and pushing.
- Once a lab effect is settled, bring it into the layout page without its tuning UI.

## Open items
- **Text steps:** steps that remove text, which would fire `genie()` instead of the l key.
- **Landing length:** whether `LANDING` (15%) should become a tuned value.
- **Motion still not built:** the shared curves module, graphic enter/exit and loops, stagger, and the chrome timings (the accordion jump is still 500).
- **Carried over from the last handoff:** span edge cases, a full-width graphic layout, the left nav, aesthetic-direction.md's scroll-animation wording, iso parts and routing, and palette tuning.
