# Motion

Status: **exploration**, from the motion grilling session (2026-11-21). These are the standard motion rules for graphics, text and chrome. Each motion is a named rule with fixed values, so a slide's motion can be described in a few words and built one way. Step behaviour (states, the tween, rapid presses) is in [graphics.md](graphics.md) under "Presentation steps".

## Character
- **Smooth and pixel-snapped:** motion is eased at the full frame rate, and positions land on whole emulated pixels.
- **No fades.** Every pixel is ground, ink or accent, so things appear and leave by moving, growing or cutting.
- **Motion off** (viewer controls): every transition cuts, and no loops run.

## Kinds of motion
| Kind | When it runs | Motions |
|---|---|---|
| Enter / exit | once, when an element appears or leaves | open / close (framed visuals), wipe (3D scenes), rise, fall, grow, shrink, cut, genie (text only) |
| Change | from one state to the next, on a step | move, explode, focus, rotate to |
| Loop | repeats while a step holds | bob, sway, spin, pulse, blink, flow |

## Curves
For enter/exit and change. Loops have their own shapes (below).

| Curve | Shape | Use |
|---|---|---|
| ease | in-out cubic | the default: state to state |
| out | decelerating | motion that answers input or continues a gesture (panels, scroll-snap) |
| settle | overshoots about 10%, settles back once | a springy arrival |
| drop | gravity, landing with 2 shrinking bounces | only for falling onto something |

## Named values
| Value | Words |
|---|---|
| Duration | quick 250 (interface only), default 400, slow 800. Framed visuals: grow 400, wipe 400 (first tried at 200 each); typing 800 (first 400); 3D wipe 800 |
| Loop period | fast 1 s, default 2 s, lazy 4 s |
| Size | small 8, default 16, large 32 units |
| Sway angle | 4° (default) or 8° |

There are no free values. If a motion needs something else, that's a new named value.

## Chrome
- **Accordion:** jumping to a section (a click, a key or the URL hash) is 400 on ease. The snap after a scroll is quick (250) on out.
- **Panels:** sliding in and out is quick (250) on out.
- **Iso drag:** the spring-back stays a critically damped spring of about 400 ms, with no overshoot.

## Loops
All are sine waves unless noted. The size is the travel from rest to the peak, one way.

| Loop | Motion |
|---|---|
| bob | moves up and down from rest, ± size |
| sway | rotates about the element's base centre, ± the sway angle |
| spin | one full turn per period. Iso objects turn about the vertical axis; flat shapes turn in the plane, about their centre |
| pulse | scales about the centre, from 1 to 1 + size / width |
| blink | the focus switches between accent and ink with a hard cut, 500 ms half-period |
| flow | a packet travels along a connector, linear, 48 emulated px per second |

- **Leaving a step:** a running loop eases back to rest along the step's tween, so nothing snaps.
- **Dragging** pauses the graphic's loops. They restart from rest after the spring-back.

## Enter and exit
Added 2026-11-23: every visual on a slide now enters and leaves by **open / close** or **wipe**. Rise and fall are left only for the footer's section title.

- **Open / close (framed visuals):** a visual with a frame (a chat or prompt box, a site's browser or phone frame, a flat scene's outer frame such as page-layout) enters in two steps, then its caption:
  1. **Grow:** the frame grows from its **top-left corner** to full size, right and down together (400, ease).
  2. **Wipe:** its content is revealed by an edge moving **downward**, top to bottom (400, ease).
  3. **Cut:** its caption cuts in.
  - It leaves the reverse way: the caption cuts out, the content wipes up, then the frame closes onto its top-left corner.
  - **Text artefacts** (chats, prompt fields): their content step is **typing** (800 in all) instead of the wipe, with the speaker label or "Prompt:" cutting in as typing starts. Leaving, they erase (800), then the frame closes. On a slide change they erase during the text out.
  - **Split boxes** (slide 1): each box is its own frame. Leaving, the boxes' text and marks erase with the links during the text out, each box keeping its height, then each box closes onto its own top-left corner.
  - **A perspective scene in its picture box** (slide 2's second beat) counts as framed, its box as the frame. Leaving, its drawing wipes up during the text out, alongside the prompt's erase, then both frames close together.
- **Wipe (3D scenes):** iso and perspective scenes that have no frame (the hero stack, the still life, the layer cube) wipe in downward from the top of the drawing (800, ease) and wipe out upward. Captions and leader lines cut in after the wipe and cut out before it.
- **rise / fall:** the element travels in from beyond its container's edge, clipped to the container. Rise comes up from below, and fall comes down from above (use drop to land on something). A part's container is its graphic span; a text block's or graphic's container is its panel.
- **grow / shrink:** scale from 0, about the element's base centre.
- **cut:** instant.
- **Exits reverse their entrance.**

- **Fade (slide 12's figures):** `data-exit-fade` fades a visual's fills out (400) on its exit, within a slide and on a slide change. It's the one exception to "exits reverse their entrance"; the figures still rise in.

- **Stack (slide 6):** copies of a template slide onto the one that stays (800, ease) while their content wipes out upward over the first half, so their empty outlines land on its boxes. Then they're **cut** away. A close animation there read as the remaining outline glitching. Back reverses it.

## One-beat sequences (exploration)
Added 2026-11-23. A graphic may run a longer, ordered sequence in one beat, on one clock, as long as the order holds. Slide 8's merge-and-make is one state (5700 in all):
1. **Merge (2400):** the knot drifts, then drains into the folder (250–1300), the folder pops (backed out, 1300–1650), then the tiles fan out 90 ms apart.
2. **Make (3300):** the template's content wipes out (400), its face pivots to iso (400–1200), the link draws (1200–1500), the cards extrude (1500–1900), then swap into solids 300 ms apart (1900–3300).
3. **Bob:** the solids bob as a loop, and the connectors carry flow packets.

Slide 12's **poster grid** (beat 2, after the line pours in) is three steps of 400: the poster cuts to its wireframe level and shrinks into the grid's top-left cell; four copies cut in on it and fan out across together; then three copies of the row fan out down together (5 × 4). Back plays it in reverse, and the poster cuts back to full detail at the end.

## Timing within a step
- Everything in a step starts together.
- A step can opt into a **stagger**: elements start 100 ms apart in reading order (top to bottom, then left to right). The whole step stays at or under 800. Built as `data-delay` (slide 12's figures 100 apart; slide 13's docs 200 apart, a deliberate deal-out).
- Rapid presses skip everything to the end state.

## Genie (text)
- **The sink:** an **8 × 8 ink square** one box inset (24) in from a bottom corner of each panel that has genie text. On slides it's the **bottom-left** corner, under the text axis, so text funnels down its own side and not over the visuals ([slide-templates.md](slide-templates.md)). The hero, tab 1 and the genie page still have text on the right and keep it bottom right. It stays for as long as that tab or intro screen is in use, because every slide's text in the panel comes and goes through it.
- **Text's only enter and exit:** text that a step removes funnels into the square, and stepping back pours it out again. New text pours out of the square on a forward step too.
- **Line by line:** the bottom line goes out first, so on the way back the top line comes in first. Each line starts halfway through the previous line's run.
- **Funnel with full slit-scan:**
  - Within a line, every row runs at its own moment in time, with lower rows well ahead, so the text smears and stretches as it goes.
  - The sides pull in quickly near the top and hold most of the way down.
  - **Landing:** over the funnel's last 15%, the sides always close onto the square and the swing dies out, whatever the graphs say, so the text visibly goes into it.
  - The spine swings 48 units at most, away from the sink's side (left for a sink on the right, right for one on the left), in three S-bends down the funnel.
  - **It stays inside its panel** (2026-11-22). The S-bends swing back toward the sink's side too, so each side's swing is scaled down to the room between the funnel and the panel's inner edge (inside its outline). With the text axis at column 1, the swing back toward the edge is about half the full swing, and the swing away from it stays full.
- **Curvature over time:** two bezier graphs, each played over a line's own run, set how much the funnel curves at each moment. They're edited on the genie page (g).
  - **arc:** eases up to the full swing by three quarters of the run, then holds.
  - **narrowing:** stays wide until about a sixth of the run, then pulls in gradually, reaching full only at the end.
- **Slide:** a row holds in place while it bends, then slides down into the square from two thirds of its time, on ease.
- **Trail:** no extra phosphor trail beyond the display layer's own ghosting.
- **Text enters from the sink too:** a new sentence pours out of the square into its place, the reverse of the exit. The order of a slide change (text out, visuals, text in) is in [slide-templates.md](slide-templates.md).
- Section changes keep the accordion as it is; the genie is for steps.

### Tuned values
From the genie test page ([`lab/genie.html`](../../lab/genie.html)). They're the page's defaults, in `settings` and `DEFAULT_GRAPHS` in [`lab/js/genie-warp.js`](../../lab/js/genie-warp.js).

| Setting | Value | Meaning |
|---|---|---|
| duration | 200 ms | one line's run |
| follow | −0.5 | each line starts 0.5 × duration after the previous one (−1 together, 0 one after another, 1 a pause of one duration) |
| curve | ease | each row's slide |
| slideStart | 0.67 | when, in a row's time, the slide begins |
| p25 / p50 / p75 | 0.8 / 0.79 / 0.77 | how far the sides have narrowed at 25 / 50 / 75% of the way down (1 = the square's width) |
| slit | 1 | slit-scan spread within a line (the maximum) |
| rowBand | 1 | emulated pixel rows per step of the sides |
| sink | 8 × 8 units | the ink square the funnel lands in; it sets the funnel's final width |
| arc / bends / severity | −48 units / 3 / 0 | the maximum spine swing (negative swings left), S-bends, rounded (0) to kinked (1) |
| arc graph | 0 → 1 by 0.75, then holds | the swing's level over a line's run |
| narrow graph | 0 until 0.16, then up to 1 at the end | how far the sides have pulled in over a line's run |
| trailBoost | 0 | extra ghost decay while it runs |

- **The whole run** is 200 × (1 + (lines − 1) × 0.5) ms. An 11-line block takes 1200 ms.
- **The 200 ms per line is genie-specific.** It isn't one of the named durations.
- **The genie is for statements only.** Text changing in place inside a text artefact uses **retype** instead: the old text is erased and the new text typed in at a steady rate with a block cursor ([text-artefacts.md](text-artefacts.md)). Its rate is still to be tuned and named.

## Built so far
- **Built:** step tweens (ease, 400/800), blink, flow, the drag spring, and the genie (tuned on its test page, and **settled**: on the layout page too, with its sink squares, toggled by l while there are no text steps yet).
- **Not built yet:**
  - a shared curves module (out, settle, drop)
  - the enter/exit and loop motions on graphics (rise, fall, grow, shrink, bob, sway, spin, pulse)
  - stagger
  - the chrome timings above (the accordion jump is still 500, and the snap and panels still use ease)
  - the genie fired by steps that remove text (the layout page has none yet, so l toggles it)
