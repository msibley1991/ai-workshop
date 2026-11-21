# Motion

Status: **exploration**, from the motion grilling session (2026-11-21). These are the standard motion rules for graphics, text and chrome. Each motion is a named rule with fixed values, so a slide's motion can be described in a few words and built one way. Step behaviour (states, the tween, rapid presses) is in [graphics.md](graphics.md) under "Presentation steps".

## Character
- **Smooth and pixel-snapped:** motion is eased at the full frame rate, and positions land on whole emulated pixels.
- **No fades.** Every pixel is ground, ink or accent, so things appear and leave by moving, growing or cutting.
- **Motion off** (viewer controls): every transition cuts, and no loops run.

## Kinds of motion
| Kind | When it runs | Motions |
|---|---|---|
| Enter / exit | once, when an element appears or leaves | rise, fall, grow, shrink, cut, genie (text only) |
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
| Duration | quick 250 (interface only), default 400, slow 800 |
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
- **rise / fall:** the element travels in from beyond its container's edge, clipped to the container. Rise comes up from below, and fall comes down from above (use drop to land on something). A part's container is its graphic span; a text block's or graphic's container is its panel.
- **grow / shrink:** scale from 0, about the element's base centre.
- **cut:** instant.
- **Exits reverse their entrance.**

## Timing within a step
- Everything in a step starts together.
- A step can opt into a **stagger**: elements start 100 ms apart in reading order (top to bottom, then left to right). The whole step stays at or under 800.
- Rapid presses skip everything to the end state.

## Genie (text)
- **Exit only for text:** text that a step removes funnels into the **bottom-right corner of its panel's box**, just inside the line. Stepping back reverses it: the text pours out of the corner into place.
- **Line by line:** the bottom line goes out first, so on the way back the top line comes in first. Each line starts halfway through the previous line's run.
- **Funnel with full slit-scan:**
  - Within a line, every row runs at its own moment in time, with lower rows well ahead, so the text smears and stretches as it goes.
  - The sides pull in quickly near the top and hold most of the way down, landing 8 units wide in the corner.
  - The spine swings 48 units to the left at most, in three S-bends down the funnel.
- **Curvature over time:** two bezier graphs, each played over a line's own run, set how much the funnel curves at each moment. They're edited on the genie page (g).
  - **arc:** eases up to the full swing by three quarters of the run, then holds.
  - **narrowing:** stays wide until about a sixth of the run, then pulls in gradually, reaching full only at the end.
- **Slide:** a row holds in place while it bends, then slides down into the corner from two thirds of its time, on ease.
- **Trail:** no extra phosphor trail beyond the display layer's own ghosting.
- Section changes keep the accordion as it is; the genie is for steps.

### Tuned values
From the genie test page ([`lab/genie.html`](../../lab/genie.html)). They're the page's defaults, in `settings` and `DEFAULT_GRAPHS` in [`lab/js/genie-warp.js`](../../lab/js/genie-warp.js).

| Setting | Value | Meaning |
|---|---|---|
| duration | 300 ms | one line's run |
| follow | −0.5 | each line starts 0.5 × duration after the previous one (−1 together, 0 one after another, 1 a pause of one duration) |
| curve | ease | each row's slide |
| slideStart | 0.67 | when, in a row's time, the slide begins |
| p25 / p50 / p75 | 0.8 / 0.79 / 0.77 | how far the sides have narrowed at 25 / 50 / 75% of the way down (1 = the sink's width) |
| slit | 1 | slit-scan spread within a line (the maximum) |
| rowBand | 1 | emulated pixel rows per step of the sides |
| sinkWidth | 8 units | the funnel's width at the corner |
| arc / bends / severity | −48 units / 3 / 0 | the maximum spine swing (negative swings left), S-bends, rounded (0) to kinked (1) |
| arc graph | 0 → 1 by 0.75, then holds | the swing's level over a line's run |
| narrow graph | 0 until 0.16, then up to 1 at the end | how far the sides have pulled in over a line's run |
| trailBoost | 0 | extra ghost decay while it runs |

- **The whole run** is 300 × (1 + (lines − 1) × 0.5) ms. An 11-line block takes 1800 ms.
- **The 300 ms per line is genie-specific.** It isn't one of the named durations.

## Built so far
- **Built:** step tweens (ease, 400/800), blink, flow, the drag spring, and the genie on its test page (tuned).
- **Not built yet:**
  - a shared curves module (out, settle, drop)
  - the enter/exit and loop motions on graphics (rise, fall, grow, shrink, bob, sway, spin, pulse)
  - stagger
  - the chrome timings above (the accordion jump is still 500, and the snap and panels still use ease)
  - the genie in the real layout
