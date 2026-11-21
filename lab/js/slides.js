// Slides on layout.html (docs/design-system/slide-templates.md).
//
// A tab body can hold `.slides` with `[data-slide]` slides, grouped in
// `[data-section]` elements whose name shows in the footer strip. A panel
// without slides (the hero, tab 1) counts as one slide: the panel itself.
// Every slide, in order, is a stop; ← and → move through each stop's beats and
// then on to the next stop, across sections and tabs.
//
// A beat reveals the statement's next sentence (each `.slide-statement > p` is
// a genie block, poured out of the panel's sink) and moves each graphic to its
// state for that beat (`data-states="0,1,2"`, default every scene state in
// order). The slide has as many beats as its longest list.
//
// Changing slides runs in order, each step starting only when the last is
// done: text out (the statement funnels into the sink, bottom line first), the
// old visuals fall out, carried scenes move to their new boxes, the new
// visuals rise in, then text in. Between tabs, the old visuals fall out, the
// accordion moves, then the new ones rise in. Rapid presses skip to the end
// state; motion off cuts.
import { play, genieT, lineCount, totalFor, settings as genieSettings } from "./genie-warp.js";
import { setGraphicState, copyGraphicState, graphicStates, graphicSpan, setGraphicAlign, graphicAlign } from "./graphic.js";
import { viewer } from "./viewer.js";

const COLUMNS = 12, TEXT_MIN = 4, FIELD = 112, FIELD_GAP = 16, ROWS = 6;
const VISUAL_MS = 400;   // visuals phase: move, rise, fall (default duration, ease)
const PANEL_MS = 400;    // accordion jump between tabs (motion.md chrome)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const motionOn = () => viewer.get().motion;
const unit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;

// Genie a sentence block to 1 (in the sink) or 0 (in place); cut if asked or motion is off.
function setGenie(el, to, animate) {
  const d = genieSettings.duration;
  if (!animate || !motionOn()) genieSettings.duration = 0;
  play(el, to);
  genieSettings.duration = d;
}

export function createSlides({ site, panels, goPanel, relayout }) {
  const enabled = !!site.querySelector("[data-slide]");
  const stops = [];
  panels.forEach((panel, pi) => {
    const slides = [...panel.querySelectorAll("[data-slide]")];
    if (!slides.length) stops.push(makeStop(panel, pi, panel, true));
    else slides.forEach((s) => stops.push(makeStop(s, pi, panel, false)));
  });

  function makeStop(root, pi, panel, implicit) {
    const visuals = [...root.querySelectorAll("[data-graphic]")];
    const states = new Map(visuals.map((g) => [g, g.dataset.states
      ? g.dataset.states.split(",").map(Number)
      : Array.from({ length: graphicStates(g) }, (_, i) => i)]));
    return {
      root, pi, panel, implicit, visuals, states,
      sentences: implicit ? [...root.querySelectorAll("[data-genie]")] : [...root.querySelectorAll(".slide-statement > [data-genie]")],
      section: root.closest("[data-section]")?.dataset.section ?? "",
      footer: panel.querySelector(".slide-footer"),
    };
  }

  const beatsOf = (stop) => Math.max(1, stop.implicit ? 1 : stop.sentences.length, ...[...stop.states.values()].map((s) => s.length));
  const stateFor = (stop, g, beat) => { const s = stop.states.get(g); return s[Math.min(beat, s.length - 1)]; };
  const shownAt = (stop, i, beat) => stop.implicit || i <= beat;

  let cur = { i: 0, beat: 0 };
  let epoch = 0;          // bumped by every cut; running phases check it
  let busyTarget = null;  // the stop + beat a running slide change is heading to
  let cover = { left: 0, right: 0 };

  // ---- Template layout ------------------------------------------------------
  // Columns from the text axis (the first open column) to the last open one.
  // The statement keeps its columns; Split's visual takes the rest down to its
  // scene's minimum span, then the text gives way down to 4. Wide and Row put
  // the statement on the base line, in the bottom row fields its full text
  // needs, and the visuals in the rows above it, so text funnels straight down
  // into the sink (bottom left) without crossing them.
  function layoutSlide(slide) {
    if (!slide || slide.hidden) return;
    const t = slide.dataset.template;
    const a0 = 1 + cover.left, aEnd = COLUMNS + 1 - cover.right, avail = aEnd - a0;
    const st = slide.querySelector(".slide-statement");
    const vis = [...slide.querySelectorAll(".slide-visual")];
    const wanted = t === "text" ? 8 : t === "split" ? (Number(slide.dataset.split) || 6) : 6;
    let text = Math.min(wanted, avail);
    if (t === "split" && vis[0]) {
      const [min] = graphicSpan(vis[0].querySelector("[data-graphic]")) ?? [4, 4];
      text = Math.max(Math.min(TEXT_MIN, avail), Math.min(text, avail - min));
      vis[0].style.gridColumn = `${a0 + text} / ${aEnd}`;
      vis[0].style.gridRow = `1 / ${ROWS + 1}`;
    }
    if (st) {
      st.style.gridColumn = `${a0} / span ${text}`;
      st.style.gridRow = "";
      st.style.alignSelf = "";
    }
    if (t === "wide" || t === "row" || t === "visual") {
      let end = ROWS + 1; // first row the visuals don't reach
      if (st && t !== "visual") {
        const rows = statementRows(st);
        end = ROWS + 1 - rows;
        st.style.gridRow = `${end} / ${ROWS + 1}`;
        st.style.alignSelf = "end";
      }
      const n = Math.max(1, vis.length), span = Math.floor(avail / n);
      vis.forEach((v, k) => {
        v.style.gridColumn = n === 1 ? `${a0} / ${aEnd}` : `${a0 + k * span} / span ${span}`;
        v.style.gridRow = `1 / ${Math.max(2, end)}`;
      });
    }
  }

  // Row fields the statement needs, measured at its full length (every
  // sentence), so the visuals never move as it builds.
  function statementRows(st) {
    const h = st.getBoundingClientRect().height / unit();
    for (let n = 1; n < ROWS; n++) if (n * FIELD + (n - 1) * FIELD_GAP >= h) return n;
    return ROWS - 1;
  }

  function reflow(left, right) {
    cover = { left, right };
    for (const s of stops) if (!s.implicit) layoutSlide(s.root);
  }

  // ---- Cuts -----------------------------------------------------------------
  function cleanVisual(g) {
    setGraphicAlign(g, null);
    g.style.transform = g.style.left = g.style.top = g.style.width = g.style.height = "";
    if (g.style.position === "absolute") g.style.position = "relative";
    g.style.display = "";
  }

  function show(stop) {
    if (stop.implicit) return;
    for (const s of stops) if (s.panel === stop.panel && !s.implicit) s.root.hidden = s !== stop;
    layoutSlide(stop.root);
  }

  function setTitle(stop) {
    if (!stop.footer) return;
    const spans = [...stop.footer.querySelectorAll(".slide-section-title")];
    spans.slice(1).forEach((s) => s.remove());
    const span = spans[0];
    if (span) { span.textContent = stop.section; span.style.transform = ""; }
  }

  // Jumps straight to a stop and beat: the end state of any change.
  function cut(i, beat) {
    epoch++;
    busyTarget = null;
    const stop = stops[i];
    goPanel(stop.pi, 0);
    for (const s of stops) s.visuals.forEach(cleanVisual);
    show(stop);
    stop.sentences.forEach((el, k) => setGenie(el, shownAt(stop, k, beat) ? 0 : 1, false));
    stop.visuals.forEach((g) => setGraphicState(g, stateFor(stop, g, beat), false));
    setTitle(stop);
    cur = { i, beat };
    relayout();
  }

  // ---- Phases ---------------------------------------------------------------
  // Text out: the shown sentences funnel into the sink, bottom block first; each
  // block above starts once the block below has started all its lines, so the
  // statement goes line by line. Returns the whole run in ms.
  function textOut(stop, my) {
    const shown = stop.sentences.filter((el) => genieT(el) < 1).reverse();
    return schedule(shown, 1, my);
  }
  // Text in: the sentences up to `beat` pour out of the sink, top block first.
  function textIn(stop, beat, my) {
    const shown = stop.sentences.filter((el, k) => shownAt(stop, k, beat));
    return schedule(shown, 0, my);
  }
  function schedule(els, to, my) {
    if (!els.length) return 0;
    const d = genieSettings.duration, step = (1 + genieSettings.follow) * d;
    let start = 0, end = 0;
    for (const el of els) {
      const at = start;
      if (at === 0) setGenie(el, to, true);
      else setTimeout(() => { if (my === epoch) setGenie(el, to, true); }, at);
      end = Math.max(end, at + totalFor(el));
      start += lineCount(el) * step;
    }
    return end;
  }

  // Tweens visuals for VISUAL_MS: items are { el, from, to, apply(el, k) }.
  function tween(items, my) {
    if (!items.length) return Promise.resolve();
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (my !== epoch) return resolve();
        const k = ease(Math.min(1, (now - t0) / VISUAL_MS));
        items.forEach((it) => it.apply(k));
        relayout();
        if (k < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  // Distance (px) from an element's top to its panel's bottom edge, at the
  // panel's open height: rise starts there and fall ends there.
  const belowPanel = (stop, el) => {
    const box = stop.implicit ? stop.root : stop.root.closest(".slides");
    return box.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
  };
  const rise = (el, dy) => ({ apply: (k) => (el.style.transform = `translateY(${(1 - k) * dy}px)`) });
  const fall = (el, dy) => ({ apply: (k) => (el.style.transform = `translateY(${k * dy}px)`) });

  // The visuals phase within one tab, in three steps that never overlap:
  // exits (old visuals that aren't carried fall out, and the old section title
  // with them), then moves (carried scenes go to their new boxes and states),
  // then entrances (new visuals rise in, and the new title). Each step is one
  // VISUAL_MS tween; an empty step is skipped.
  function visualSteps(from, to, beat) {
    const exits = [], moves = [], enters = [], outs = [...from.visuals];
    for (const g of to.visuals) {
      const k = outs.findIndex((o) => o.dataset.graphic === g.dataset.graphic);
      const target = stateFor(to, g, beat);
      if (k >= 0) {
        const og = outs.splice(k, 1)[0];
        const r0 = og.getBoundingClientRect(), wrap = g.parentElement.getBoundingClientRect();
        // The new element takes over drawing exactly what the old one drew: same
        // box, same state, same place in the box; then box and align move together.
        const al0 = graphicAlign(og), al1 = graphicAlign(g);
        setGraphicAlign(g, al0);
        copyGraphicState(og, g);
        og.style.display = "none";
        const box0 = { x: r0.left - wrap.left, y: r0.top - wrap.top, w: r0.width, h: r0.height };
        const box1 = { x: 0, y: 0, w: wrap.width, h: wrap.height };
        g.style.position = "absolute";
        const at = (k) => {
          g.style.left = `${box0.x + (box1.x - box0.x) * k}px`;
          g.style.top = `${box0.y + (box1.y - box0.y) * k}px`;
          g.style.width = `${box0.w + (box1.w - box0.w) * k}px`;
          g.style.height = `${box0.h + (box1.h - box0.h) * k}px`;
          setGraphicAlign(g, al0 + (al1 - al0) * k);
        };
        at(0);
        moves.push({ start: () => setGraphicState(g, target, true), apply: at });
      } else {
        setGraphicState(g, target, false);
        const dy = belowPanel(to, g);
        g.style.transform = `translateY(${dy}px)`; // waits below the panel, out of sight
        enters.push(rise(g, dy));
      }
    }
    for (const og of outs) exits.push(fall(og, belowPanel(from, og)));
    if (from.section !== to.section && to.footer && from.panel === to.panel) {
      const old = to.footer.querySelector(".slide-section-title");
      const next = old.cloneNode(false);
      next.textContent = to.section;
      to.footer.append(next);
      const dy = to.footer.getBoundingClientRect().height;
      next.style.transform = `translateY(${dy}px)`;
      exits.push(fall(old, dy));
      enters.push(rise(next, dy));
    }
    return [exits, moves, enters];
  }

  async function runSteps(steps, my) {
    for (const items of steps) {
      if (!items.length) continue;
      items.forEach((it) => it.start?.());
      await tween(items, my);
      if (my !== epoch) return false;
    }
    return true;
  }

  async function change(toI, beat) {
    const from = stops[cur.i], to = stops[toI];
    if (!motionOn()) return cut(toI, beat);
    const my = ++epoch;
    busyTarget = { i: toI, beat };

    // 1. Text out.
    const outMs = textOut(from, my);
    if (outMs) await wait(outMs);
    if (my !== epoch) return;

    // The new slide comes on with its text in the sink.
    to.sentences.forEach((el) => setGenie(el, 1, false));
    if (from.panel === to.panel) {
      // Shown and set up in one go, so no frame ever draws the new slide's
      // visuals in place before their entrance.
      if (!to.implicit) to.root.hidden = false;
      layoutSlide(to.root);
      const steps = visualSteps(from, to, beat);
      relayout();
      // 2. Visuals: exits, then moves, then entrances.
      if (!(await runSteps(steps, my))) return;
      if (!from.implicit) from.root.hidden = true;
      from.visuals.forEach(cleanVisual);
      setTitle(to);
    } else {
      // 2a. The old tab's visuals fall out before the accordion moves.
      if (!(await runSteps([from.visuals.map((og) => fall(og, belowPanel(from, og)))], my))) return;
      show(to);
      to.visuals.forEach(cleanVisual);
      setTitle(to);
      // Its visuals wait below the panel while the accordion moves (set up
      // before any frame draws them).
      const enters = to.visuals.map((g) => {
        setGraphicState(g, stateFor(to, g, beat), false);
        const dy = belowPanel(to, g);
        g.style.transform = `translateY(${dy}px)`;
        return rise(g, dy);
      });
      relayout();
      await goPanel(to.pi, PANEL_MS);
      if (my !== epoch) return;
      from.visuals.forEach(cleanVisual);
      // 2b. The new tab's visuals rise in.
      if (!(await runSteps([enters], my))) return;
    }
    to.visuals.forEach(cleanVisual);
    relayout();

    // 3. Text in (line counts need a measure of the shown slide first).
    await frames(2);
    if (my !== epoch) return;
    cur = { i: toI, beat };
    const inMs = textIn(to, beat, my);
    await wait(inMs);
    if (my === epoch) busyTarget = null;
  }

  // ---- Input ------------------------------------------------------------------
  // dir +1 / -1. Returns false at either end of the talk.
  function step(dir) {
    if (!enabled) return false;
    if (busyTarget) cut(busyTarget.i, busyTarget.beat); // rapid press: skip to the end state
    const stop = stops[cur.i], nb = cur.beat + dir;
    if (nb >= 0 && nb < beatsOf(stop)) {
      cur.beat = nb;
      stop.sentences.forEach((el, k) => {
        const to = shownAt(stop, k, nb) ? 0 : 1;
        if ((genieT(el) >= 0.5 ? 1 : 0) !== to) setGenie(el, to, true);
      });
      stop.visuals.forEach((g) => setGraphicState(g, stateFor(stop, g, nb), true));
      return true;
    }
    const ni = cur.i + dir;
    if (ni < 0 || ni >= stops.length) return false;
    change(ni, dir > 0 ? 0 : beatsOf(stops[ni]) - 1);
    return true;
  }

  // The accordion landed on a panel by other means (a click, the hash, scroll):
  // show that panel's first slide, unless we're already in it.
  function land(pi) {
    if (!enabled) return;
    if (stops[cur.i].pi === pi && !busyTarget) return;
    cut(stops.findIndex((s) => s.pi === pi), 0);
  }

  if (enabled) {
    for (const s of stops) if (!s.implicit) s.root.hidden = s !== stops.find((x) => x.panel === s.panel);
    document.fonts?.ready.then(() => reflow(cover.left, cover.right));
  }

  return { enabled, step, land, reflow, stops, current: () => ({ ...cur }) };
}
