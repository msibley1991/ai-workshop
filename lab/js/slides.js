// Slides on layout.html (docs/design-system/slide-templates.md).
//
// A tab body can hold `.slides` with `[data-slide]` slides, grouped in
// `[data-section]` elements whose name shows in the footer strip. A panel
// without slides counts as one slide: the panel itself (none on layout.html now).
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
import { setGraphicState, copyGraphicState, graphicIndex, graphicStates, graphicSpan, setGraphicAlign, graphicAlign, graphicFramed, graphicBoxed, setGraphicOpen } from "./graphic.js";
import { viewer } from "./viewer.js";
import { setTyped, typeTo, typeBlocks } from "./artefact.js";

const COLUMNS = 12, TEXT_MIN = 4, FIELD = 112, FIELD_GAP = 16, ROWS = 6;
const VISUAL_MS = 400;   // visuals phase: move, rise, fall (default duration, ease)
const FRAME_MS = 400;    // a framed visual: its frame grows, then its content wipes in (each; first tuned at 200)
const TYPE_MS = 800;     // a text artefact typing in (or erasing) in all (first tuned at 400)
const PANEL_MS = 400;    // accordion jump between tabs (motion.md chrome)
const SLIDE_PAUSE_MS = 400; // (first tried at 200) between slides: after the old visuals leave, before anything new moves in (not between beats)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const motionOn = () => viewer.get().motion;
// Text artefacts ([data-artefact], js/artefact.js) are visuals without a scene:
// they rise and fall like graphics but have no states and aren't carried.
const isArtefact = (g) => g.hasAttribute("data-artefact");
// data-type-at="2" on a [data-type] block: it types in on that beat (slide 11's
// Markdown symbols), not with its artefact's entrance.
const typeAt = (b) => Number(b.dataset.typeAt) || 0;
const blocksAt = (g, beat = 0) => typeBlocks(g).filter((b) => typeAt(b) <= beat);
// The beat a visual enters on (data-enter, default 0); before it, it's hidden.
const enterOf = (g) => Number(g.dataset.enter) || 0;
// The beat a visual or sentence leaves on (data-exit); it's shown before it.
// data-stack="1" (slide 6): from that beat the visual slides onto the slide's
// [data-stack-target] and closes there (stackRun), so that's its exit beat too.
const stackOf = (g) => (g.dataset.stack != null ? Number(g.dataset.stack) : null);
const exitOf = (g) => (g.dataset.exit != null ? Number(g.dataset.exit) : stackOf(g) ?? Infinity);
const fromBeat = (g, key) => (g.dataset[key] != null ? Number(g.dataset[key]) : null);
// data-crop="3": from that beat the artefact erases all but its
// [data-crop-area] lines; data-split="4": from that beat it splits into one
// box per area (default: the crop beat, right after the erase).
// data-mark="5": from that beat those lines are marked (ink bars, text in
// ground) and linked to the statement's [data-link-target] phrase.
const cropAt = (g, beat) => fromBeat(g, "crop") != null && beat >= fromBeat(g, "crop");
const splitAt = (g, beat) => cropAt(g, beat) && beat >= (fromBeat(g, "split") ?? fromBeat(g, "crop"));
const markAt = (g, beat) => fromBeat(g, "mark") != null && beat >= fromBeat(g, "mark");
// data-phased on a graphic: its state changes run as a phase of the beat (after
// visuals leave, before the statement and entering visuals) instead of at the
// beat's start, so it can make room for what comes in next (slide 2's picture
// box closing before the prompt field rises) and take it back after it's gone.
const phased = (g) => g.hasAttribute("data-phased");
const MARK_PAD = 8;      // units at each end of a mark bar
const LINK_GAP = 32;     // units between a connector's arrow tip and its phrase
const ARROW_H = 32;      // units, the height of a connector's open chevron (legs at 45°)
const LINK_RADIUS = 8;   // units, the radius of a connector's bends
const WIRE_GAP = 16;     // units between a wire's ends and what it joins
// data-solo="0": the beats an artefact is shown alone, centred on both axes over
// the slide's visual area at SOLO_SCALE (its type 32/40 instead of 24/32).
const soloAt = (g, beat) => (g.dataset.solo ?? "").split(",").filter((b) => b.trim() !== "").map(Number).includes(beat);
const SOLO_SCALE = 4 / 3;
const unit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;

// Genie a sentence block to 1 (in the sink) or 0 (in place); cut if asked or motion is off.
function setGenie(el, to, animate) {
  const d = genieSettings.lineTime;
  if (!animate || !motionOn()) genieSettings.lineTime = 0;
  play(el, to);
  genieSettings.lineTime = d;
}

export function createSlides({ site, panels, goPanel, relayout, onMove = () => {} }) {
  const enabled = !!site.querySelector("[data-slide]");
  const stops = [];
  panels.forEach((panel, pi) => {
    const slides = [...panel.querySelectorAll("[data-slide]")];
    if (!slides.length) stops.push(makeStop(panel, pi, panel, true));
    else slides.forEach((s) => stops.push(makeStop(s, pi, panel, false)));
  });

  function makeStop(root, pi, panel, implicit) {
    const visuals = [...root.querySelectorAll("[data-graphic], [data-artefact]")];
    const states = new Map(visuals.filter((g) => !isArtefact(g)).map((g) => [g, g.dataset.states
      ? g.dataset.states.split(",").map(Number)
      : Array.from({ length: graphicStates(g) }, (_, i) => i)]));
    return {
      root, pi, panel, implicit, visuals, states,
      sentences: implicit ? [...root.querySelectorAll("[data-genie]")] : [...root.querySelectorAll(".slide-statement > [data-genie]")],
      section: root.closest("[data-section]")?.dataset.section ?? "",
      // data-templates="text,row,row": the slide's template at each beat.
      templates: root.dataset.templates ? root.dataset.templates.split(",").map((t) => t.trim()) : null,
      footer: panel.querySelector(".slide-footer"),
    };
  }
  // Each slide's number within its tab, counted from the page, so it follows
  // slides being added or moved.
  stops.forEach((s) => { s.number = stops.filter((t) => t.panel === s.panel).indexOf(s) + 1; });
  stops.filter((s) => s.number === 1).forEach(setNumber); // every tab's footer starts numbered

  // A sentence shows from its data-enter beat, or its own index (one per beat).
  const beatsOf = (stop) => Math.max(1, stop.implicit ? 1 : 0,
    ...stop.sentences.map((el, i) => (el.dataset.enter != null ? Number(el.dataset.enter) : i) + 1),
    ...[...stop.states.values()].map((s) => s.length), ...stop.visuals.map((g) => enterOf(g) + 1),
    ...stop.sentences.map((el) => (el.dataset.enter != null ? Number(el.dataset.enter) + 1 : 0)),
    ...[...stop.visuals, ...stop.sentences].flatMap((g) => [exitOf(g), fromBeat(g, "crop"), fromBeat(g, "split"), fromBeat(g, "mark"), fromBeat(g, "enter")])
      .filter((b) => b != null && Number.isFinite(b)).map((b) => b + 1),
    stop.templates?.length ?? 1);
  const stateFor = (stop, g, beat) => { const s = stop.states.get(g); return s[Math.min(beat, s.length - 1)]; };
  const shownVisual = (g, beat) => beat >= enterOf(g) && beat < exitOf(g);
  const templateAt = (stop, beat) => stop.templates?.[Math.min(beat, stop.templates.length - 1)] ?? stop.root.dataset.template;
  // Sets the slide's template for a beat (no motion); layoutSlide places it.
  function setTemplate(stop, beat) {
    const t = templateAt(stop, beat);
    if (t && stop.root.dataset.template !== t) stop.root.dataset.template = t;
  }
  const statementOf = (stop) => stop.root.querySelector(".slide-statement");
  const clearMorph = (stop) => {
    const st = statementOf(stop);
    if (st) st.style.fontSize = st.style.lineHeight = st.style.width = st.style.transform = "";
  };
  // A template change within a slide: the statement moves and resizes from its
  // old place and size to its new ones (VISUAL_MS, ease). Its width scales with
  // its type, so it keeps its line breaks on the way.
  function morph(stop, beat, my) {
    const st = statementOf(stop);
    if (!st || templateAt(stop, beat) === stop.root.dataset.template) return Promise.resolve();
    const r0 = st.getBoundingClientRect(), c0 = getComputedStyle(st);
    const f0 = parseFloat(c0.fontSize), l0 = parseFloat(c0.lineHeight);
    setTemplate(stop, beat);
    layoutSlide(stop.root);
    const r1 = st.getBoundingClientRect(), c1 = getComputedStyle(st);
    const f1 = parseFloat(c1.fontSize), l1 = parseFloat(c1.lineHeight);
    const item = {
      apply: (k) => {
        const f = f0 + (f1 - f0) * k;
        st.style.fontSize = `${f}px`;
        st.style.lineHeight = `${l0 + (l1 - l0) * k}px`;
        st.style.width = `${(r0.width * f) / f0}px`;
        st.style.transform = "";
        const r = st.getBoundingClientRect();
        const x = r0.left + (r1.left - r0.left) * k, y = r0.top + (r1.top - r0.top) * k;
        st.style.transform = `translate(${x - r.left}px, ${y - r.top}px)`;
      },
    };
    item.apply(0);
    return tween([item], my).then(() => { if (my === epoch) { clearMorph(stop); relayout(); } });
  }
  // Sets a visual's state for a beat: graphics move to their scene state,
  // artefacts have none.
  const setState = (stop, g, beat, animate) => { if (!isArtefact(g)) setGraphicState(g, stateFor(stop, g, beat), animate); };
  // Cuts every visual of a stop to how it stands at a beat: shown or hidden,
  // artefacts fully typed or empty.
  function placeVisuals(stop, beat) {
    for (const g of stop.visuals) {
      const on = shownVisual(g, beat);
      g.hidden = !on;
      if (isArtefact(g)) typeBlocks(g).forEach((b) => setTyped(b, on && typeAt(b) <= beat ? 1 : 0));
    }
    for (const g of stop.visuals) placeSolo(stop, g, beat);
    for (const g of stop.visuals) clearFrame(g); // undo a cut-off open or close
    for (const g of stop.visuals) setContentWipe(g, 1); // and a cut-off stack
    for (const g of stop.visuals) {
      if (fromBeat(g, "crop") == null) continue;
      setAreaText(g, 0);
      const on = !g.hidden && cropAt(g, beat);
      setCropZoom(stop, g, on ? 1 : 0, on && splitAt(g, beat) ? 1 : 0);
    }
    placeStack(stop);
    for (const g of stop.visuals) if (fromBeat(g, "mark") != null) setMarks(stop, g, !g.hidden && markAt(g, beat) ? 1 : 0);
    setLinks(stop, stop.visuals.some((g) => !g.hidden && markAt(g, beat)) ? 1 : 0);
    setGrows(stop, beat);
    wiresAt(stop, beat);
    setSpans(stop, beat);
    placeCaptions(stop);
    for (const g of stop.visuals) if (g.dataset.gridAt != null) pgrid.set(g, gridState(beat >= Number(g.dataset.gridAt) ? 1 : 0));
    placePosters(stop);
  }

  // data-delay on a visual: its entrance starts that many ms into the step
  // (slide 12's figures, top first).
  const delayed = (g, it) => ((it.delay = Number(g.dataset.delay) || 0), it);

  // ---- Poster grid (slide 12) ---------------------------------------------------
  // A [data-grid-at] artefact holds one .poster. Before that beat it stands
  // alone at the visual's full height, centred, at full detail; from it, it's
  // the top-left cell of a 5 x 4 grid whose columns start on the left edges of
  // the visual's columns 2-6 (slide 12: the page's 6-10), with the figures
  // ending on its column 1's right edge. The move is three steps of GRID_MS: the poster cuts to its
  // wireframe and shrinks into its cell (k1), four copies fan out across from
  // it (k2), then three copies of that row fan out down (k3).
  const GRID_MS = 400, GRID_COLS = 5, GRID_ROWS = 4, A_RATIO = Math.SQRT2;
  const pgrid = new Map(); // artefact -> { k1, k2, k3 }
  const gridState = (k) => ({ k1: k, k2: k, k3: k });
  function gridGeometry(g) {
    const u = unit(), gap = 16 * u, area = g.parentElement.getBoundingClientRect();
    const W = area.width, H = area.height, grid = getComputedStyle(g.closest(".slide"));
    const col = parseFloat(grid.gridTemplateColumns) || W / 8, pitch = col + (parseFloat(grid.columnGap) || gap);
    // As tall as 4 rows allow, but never wider than a column.
    let ch = (H - (GRID_ROWS - 1) * gap) / GRID_ROWS, cw = ch / A_RATIO;
    if (cw > col) { cw = col; ch = cw * A_RATIO; }
    const cell = (r, c) => ({ x: (c + 1) * pitch, y: r * (ch + gap), w: cw, h: ch });
    const strip = col; // the figures end on the visual's first column's right edge
    let bh = H, bw = H / A_RATIO;
    if (bw > W) { bw = W; bh = W * A_RATIO; }
    return { cell, big: { x: (W - bw) / 2, y: 0, w: bw, h: bh }, strip, ch };
  }
  const lerpBox = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });
  const setBox = (el, b) => { el.style.left = `${b.x}px`; el.style.top = `${b.y}px`; el.style.width = `${b.w}px`; el.style.height = `${b.h}px`; };
  function placePosters(stop) {
    for (const g of stop.visuals) {
      if (g.dataset.gridAt == null || !g.parentElement) continue;
      const p0 = g.querySelector(".poster:not(.poster-copy)");
      // The 19 copies, made once from the clean poster, at wireframe detail.
      if (!g.querySelector(".poster-copy")) {
        for (let i = 1; i < GRID_COLS * GRID_ROWS; i++) {
          const c = p0.cloneNode(true);
          c.classList.add("poster-copy");
          c.setAttribute("data-wire", "");
          c.style.removeProperty("--open"); c.style.removeProperty("--wipe");
          c.hidden = true;
          g.append(c);
        }
      }
      const copies = [...g.querySelectorAll(".poster-copy")], geo = gridGeometry(g), k = pgrid.get(g) ?? gridState(0);
      p0.toggleAttribute("data-wire", k.k1 > 0);
      setBox(p0, lerpBox(geo.big, geo.cell(0, 0), k.k1));
      copies.forEach((c, i) => {
        const n = i + 1, r = Math.floor(n / GRID_COLS), col = n % GRID_COLS;
        const on = r === 0 ? k.k2 > 0 : k.k3 > 0;
        c.hidden = !on;
        if (!on) return;
        setBox(c, r === 0 ? lerpBox(geo.cell(0, 0), geo.cell(0, col), k.k2) : lerpBox(geo.cell(0, col), geo.cell(r, col), k.k3));
      });
      // The figures: one per row, on its height, touching column 1's right edge.
      const u = unit();
      for (const f of stop.root.querySelectorAll(".poster-figure[data-fig-row]")) {
        const cell = geo.cell(Number(f.dataset.figRow), 0);
        f.style.left = `${geo.strip - 64 * u}px`;
        f.style.top = `${cell.y + cell.h / 2 - 64 * u}px`;
      }
    }
  }
  async function gridRun(stop, gs, to, my) {
    for (const key of to ? ["k1", "k2", "k3"] : ["k3", "k2", "k1"]) {
      await tween(gs.map((g) => ({ apply: (e) => { pgrid.get(g)[key] = to ? e : 1 - e; placePosters(stop); } })), my, GRID_MS);
      if (my !== epoch) return;
    }
    gs.forEach((g) => pgrid.set(g, gridState(to)));
    placePosters(stop);
    relayout();
  }

  // Span states (slide 11): data-span-states="focus,focus,mark" sets a span's
  // data-span per beat (the last holds); CSS draws the bar.
  // Grows (slide 15): data-grow-at="1" tweens the element's --grow from 0 to 1
  // on that beat (CSS interpolates a size with it); data-step orders it among
  // the beat's entrances, typing and wires.
  const growsOf = (stop) => [...(stop.root.querySelectorAll?.("[data-grow-at]") ?? [])];
  const setGrows = (stop, beat) => growsOf(stop).forEach((el) => el.style.setProperty("--grow", beat >= Number(el.dataset.growAt) ? 1 : 0));
  const growRun = (els, to, my) => tween([{ apply: (k) => els.forEach((el) => el.style.setProperty("--grow", to ? k : 1 - k)) }], my)
    .then(() => { if (my === epoch) els.forEach((el) => el.style.setProperty("--grow", to)); });
  function setSpans(stop, beat) {
    for (const el of stop.root.querySelectorAll?.("[data-span-states]") ?? []) {
      const list = el.dataset.spanStates.split(",").map((x) => x.trim());
      el.dataset.span = list[Math.min(beat, list.length - 1)];
    }
  }
  // Doc captions (slide 11): each .doc-cap sits level with its heading
  // ([data-cap-id]), its dot 16 past the heading's text and its leader on to
  // CAPTION_GAP short of the caption. Re-placed on every layout change, so
  // they follow the headings as symbols type in.
  const CAPTION_GAP = 8;
  function placeCaptions(stop) {
    const u = unit();
    for (const cap of stop.root.querySelectorAll?.(".doc-cap[data-cap-to]") ?? []) {
      const a = stop.root.querySelector(`[data-cap-id="${cap.dataset.capTo}"]`), box = cap.offsetParent;
      if (!a || !box) continue;
      const ra = a.getBoundingClientRect(), rb = box.getBoundingClientRect();
      const dot = cap.querySelector(".cap-dot"), lead = cap.querySelector(".cap-leader"), text = cap.querySelector(".site-caption");
      cap.style.top = `${ra.top + ra.height / 2 - rb.top - 16 * u}px`;
      const x0 = ra.right - rb.left + 16 * u, x1 = text.offsetLeft - CAPTION_GAP * u;
      dot.style.left = `${x0}px`;
      lead.style.left = `${x0}px`;
      lead.style.width = `${Math.max(0, x1 - x0)}px`;
    }
  }
  window.addEventListener("lab:layout", () => { const st = stops[cur.i]; if (st && !st.implicit && !st.root.hidden) placeCaptions(st); });

  // ---- Crop and zoom, marks, links, stacked statements --------------------------
  const cz = new Map();        // artefact -> { c, p }: erase, split, 0..1 each
  const lineText = new Map();  // a non-focus line -> its full text
  const cropAreas = (g) => [...g.querySelectorAll("[data-crop-area]")];
  const textOf = (a) => a.firstElementChild ?? a; // the area's text (marks ink it)
  const FRAME_H = ROWS * FIELD + (ROWS - 1) * FIELD_GAP; // all 6 row fields, units
  const SPLIT_PAD = 16;                                  // units inside each split box
  // Where links meet: LINK_GAP past the end of the target phrase's text, on the
  // frame's vertical middle (the stacked statement is placed to match).
  function linkPoint(stop) {
    const target = stop.root.querySelector("[data-link-target]"), a = visualArea(stop);
    if (!target || !a) return null;
    const range = document.createRange();
    range.selectNodeContents(target);
    return { x: range.getBoundingClientRect().right + LINK_GAP * unit(), y: a.top + (FRAME_H * unit()) / 2 };
  }
  // c erases the turn's other lines (all together, back to front), so the box
  // closes around its [data-crop-area] lines; the speaker label goes. p cuts
  // the turn into one box per area: the middle one centred on the link point's
  // height, the others above and below by half the run to the link point, so
  // every link can bend at 45 degrees halfway along.
  function setCropZoom(stop, g, c, p) {
    cz.set(g, { c, p });
    const turn = g.querySelector(".chat-turn"), label = g.querySelector(".chat-speaker");
    if (!turn) return;
    const u = unit(), areas = cropAreas(g);
    if (label) label.style.visibility = c > 0 ? "hidden" : "";
    for (const line of g.querySelectorAll(".chat-line:not([data-crop-area])")) {
      // Erasing shortens the line, so the box closes up as the text goes.
      if (!lineText.has(line)) lineText.set(line, line.textContent);
      const full = lineText.get(line);
      line.textContent = full.slice(0, Math.round(full.length * (1 - c)));
      line.hidden = c >= 1;
    }
    if (p <= 0) {
      turn.setAttribute("data-box", "");
      turn.style.padding = "";
      areas.forEach((a) => { a.removeAttribute("data-box"); a.style.padding = a.style.marginTop = ""; });
      return;
    }
    const P = SPLIT_PAD * u, side = (24 - (24 - SPLIT_PAD) * p) * u, n = areas.length;
    turn.removeAttribute("data-box");
    turn.style.padding = "0px";
    // Final heights first (the text wraps at the boxes' side padding).
    areas.forEach((a) => { a.setAttribute("data-box", ""); a.style.padding = `${P}px ${side}px`; a.style.marginTop = "0px"; });
    const hs = areas.map((a) => a.getBoundingClientRect().height);
    const pt = linkPoint(stop), top0 = areas[0]?.getBoundingClientRect().top ?? 0;
    const run = pt ? areas[0].getBoundingClientRect().left - pt.x : 0;
    const mid = (n - 1) / 2, step = run / 2;
    let y = top0;
    areas.forEach((a, i) => {
      const want = pt ? pt.y + (i - mid) * step - hs[i] / 2 : y; // this box's top, fully split
      a.style.padding = `${i === 0 ? P : P * p}px ${side}px ${i === n - 1 ? P : P * p}px`;
      a.style.marginTop = `${(want - y) * p}px`;
      y += (want - y) * p + hs[i];
    });
  }
  // Tweens erase ("c") or split ("p") of some artefacts to `to`.
  function cropRun(stop, gs, key, to, my) {
    const items = gs.map((g) => {
      const v0 = (cz.get(g) ?? { c: 0, p: 0 })[key];
      return { apply: (k) => { const st = { ...(cz.get(g) ?? { c: 0, p: 0 }) }; st[key] = v0 + (to - v0) * k; setCropZoom(stop, g, st.c, st.p); } };
    });
    items.forEach((it) => it.apply(0));
    return tween(items, my);
  }

  // Marks: an ink bar behind each line of each crop area, MARK_PAD past the
  // text at both ends, the line height tall; k wipes them in from the left.
  // Fully in, the text turns ground (knocked out of the bar).
  function setMarks(stop, g, k) {
    g.querySelectorAll(".chat-mark").forEach((m) => m.remove());
    const areas = cropAreas(g), sheet = g.querySelector(".chat-sheet");
    areas.forEach((a) => { const t = textOf(a); if (k >= 1) t.dataset.ink = "ground"; else delete t.dataset.ink; });
    if (k <= 0 || !sheet) return;
    const sr = sheet.getBoundingClientRect(), pad = MARK_PAD * unit(), range = document.createRange();
    for (const a of areas) {
      const lh = parseFloat(getComputedStyle(a).lineHeight);
      range.selectNodeContents(textOf(a));
      for (const r of range.getClientRects()) {
        const bar = document.createElement("span");
        bar.className = "chat-mark";
        bar.setAttribute("data-fill", "");
        bar.style.left = `${r.left - sr.left - pad}px`;
        bar.style.top = `${r.top + r.height / 2 - lh / 2 - sr.top}px`;
        bar.style.width = `${(r.width + 2 * pad) * k}px`;
        bar.style.height = `${lh}px`;
        bar.dataset.area = String(areas.indexOf(a));
        sheet.prepend(bar);
      }
    }
  }
  const markRun = (stop, gs, to, my) => {
    const items = gs.map((g) => ({ apply: (k) => setMarks(stop, g, to ? k : 1 - k) }));
    items.forEach((it) => it.apply(0));
    return tween(items, my).then(() => { if (my === epoch) gs.forEach((g) => setMarks(stop, g, to)); });
  };

  // Links: from the middle of each box's left edge, left, a diagonal centred
  // between the ends, then left onto the link point. k draws them by length.
  // `from` (0..1) erases them from their start, the way they were drawn, so
  // only the stretch from there to the tip stays (leaving the slide).
  function setLinks(stop, k, from = 0) {
    const svg = stop.root.querySelector(".slide-links"), pt = linkPoint(stop);
    if (!svg) return;
    svg.replaceChildren();
    if (k <= 0 || from >= 1 || !pt) return;
    // The chevron's mitred point sticks out past its vertex by half the stroke
    // times root 2, so the vertex sits back by that and the drawn tip lands on pt.
    const u = unit(), miter = ((parseFloat(svg.dataset.weight) || 0) / 2) * Math.SQRT2 * u;
    const sv = svg.getBoundingClientRect(), tx = pt.x - sv.left - miter, ty = pt.y - sv.top;
    const areas = stop.visuals.filter((g) => !g.hidden && g.querySelector(".chat-mark")).flatMap(cropAreas);
    for (const a of areas) {
      const r = a.getBoundingClientRect();
      const x0 = r.left - sv.left, y0 = r.top + r.height / 2 - sv.top, dy = Math.abs(y0 - ty);
      // A 45-degree diagonal centred between the ends (steeper only if the drop
      // is more than the run).
      const xm = (x0 + tx) / 2, w = Math.min(dy, Math.max(0, x0 - tx));
      const pts = rounded([[x0, y0], [xm + w / 2, y0], [xm - w / 2, ty], [tx, ty]], LINK_RADIUS * u);
      const drawn = from > 0 ? partial(pts.slice().reverse(), 1 - from).reverse() : partial(pts, k);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", drawn.map((p) => p.join(",")).join(" "));
      line.setAttribute("fill", "none");
      svg.append(line);
      // An open chevron riding the tip, pointing along the last drawn stretch.
      const [px, py] = drawn[drawn.length - 2], [hx, hy] = drawn[drawn.length - 1], len = Math.hypot(hx - px, hy - py);
      if (len > 0) {
        const L = (ARROW_H / 2) * Math.SQRT2 * unit(), ux = (hx - px) / len, uy = (hy - py) / len, c = Math.SQRT1_2;
        const arm = (sx) => [hx - L * c * (ux - sx * uy), hy - L * c * (uy + sx * ux)];
        const head = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        head.setAttribute("points", [arm(1), [hx, hy], arm(-1)].map((p) => p.join(",")).join(" "));
        head.setAttribute("fill", "none");
        svg.append(head);
      }
    }
  }
  // A polyline with each bend rounded to radius `rad` (the raster draws only
  // straight segments, so each arc is a few short ones).
  function rounded(pts, rad) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (!l1 || !l2) { out.push(b); continue; }
      const d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
      const turn = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
      const t = Math.min(rad * Math.tan(turn / 2), l1 / 2, l2 / 2);
      if (t < 0.01) { out.push(b); continue; }
      const p0 = [b[0] - d1[0] * t, b[1] - d1[1] * t], p2 = [b[0] + d2[0] * t, b[1] + d2[1] * t];
      for (let j = 0; j <= 8; j++) { // quadratic through the corner, close to the arc at these turns
        const f = j / 8, g = 1 - f;
        out.push([g * g * p0[0] + 2 * g * f * b[0] + f * f * p2[0], g * g * p0[1] + 2 * g * f * b[1] + f * f * p2[1]]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // The first fraction k of a polyline, by length.
  function partial(pts, k) {
    const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let left = segs.reduce((a, b) => a + b, 0) * k;
    const out = [pts[0]];
    for (let i = 0; i < segs.length && left > 0; i++) {
      const f = Math.min(1, left / (segs[i] || 1));
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
      left -= segs[i];
    }
    return out.length > 1 ? out : [pts[0], pts[0]];
  }
  const linkRun = (stop, to, my) => {
    const item = { apply: (k) => setLinks(stop, to ? k : 1 - k) };
    item.apply(0);
    return tween([item], my).then(() => { if (my === epoch) setLinks(stop, to); });
  };

  // Wires (slide 10): from each [data-wire-to] element's right edge to the
  // left edge of the [data-wire-id] it names (or their frames' edges, with
  // data-wire-edge), WIRE_GAP clear of both, with a
  // 45-degree diagonal centred between them and an open chevron at the tip.
  // A wire draws once both ends are in: on the later end's entrance beat,
  // right after its data-step's entrances (wirePhase in beatPhases).
  const visualOf = (el) => el.closest("[data-artefact], [data-graphic]");
  const stepOf = (g) => Number(g?.dataset.step) || 0;
  function wiresOf(stop) {
    if (!stop.wires) {
      stop.wires = [];
      for (const a of stop.root.querySelectorAll?.("[data-wire-to]") ?? []) {
        const b = stop.root.querySelector(`[data-wire-id="${a.dataset.wireTo}"]`);
        if (!b) continue;
        const [ga, gb] = [visualOf(a), visualOf(b)];
        const later = enterOf(gb) > enterOf(ga) || (enterOf(gb) === enterOf(ga) && stepOf(gb) >= stepOf(ga)) ? gb : ga;
        // data-wire-beat / data-wire-step on the start: the wire draws on that
        // beat's step instead (slide 15's return lane, after both ends are in).
        const beat = a.dataset.wireBeat != null ? Number(a.dataset.wireBeat) : enterOf(later);
        const step = a.dataset.wireStep != null ? Number(a.dataset.wireStep) : stepOf(later);
        stop.wires.push({ a, b, beat, step });
      }
    }
    return stop.wires;
  }
  // k(wire) -> 0..1, how much of each wire is drawn.
  function setWires(stop, k) {
    const svg = stop.root.querySelector?.(".slide-wires");
    if (!svg) return;
    svg.replaceChildren();
    const u = unit(), sv = svg.getBoundingClientRect(), gap = WIRE_GAP * u;
    const miter = ((parseFloat(svg.dataset.weight) || 0) / 2) * Math.SQRT2 * u;
    for (const w of wiresOf(stop)) {
      const f = k(w);
      if (f <= 0) continue;
      const ra = w.a.getBoundingClientRect(), rb = w.b.getBoundingClientRect();
      // data-wire-edge: start from the right edge of the element's frame, and
      // end at the left edge of it, level with the element (slide 10's files).
      const frameOf = (el) => (el.hasAttribute("data-wire-edge") ? el.closest("[data-frame]") ?? el : el).getBoundingClientRect();
      // An end right of its start runs right to left (slide 15's return lane):
      // from the start's left edge to the end's right edge.
      const fa = frameOf(w.a), fb = frameOf(w.b), rev = fb.right <= fa.left, dir = rev ? -1 : 1;
      const x0 = (rev ? fa.left : fa.right) - sv.left + dir * gap, y0 = ra.top + ra.height / 2 - sv.top;
      // data-wire-level on the end: it arrives level with the start (slide 13).
      const x1 = (rev ? fb.right : fb.left) - sv.left - dir * (gap + miter), y1 = w.b.hasAttribute("data-wire-level") ? y0 : rb.top + rb.height / 2 - sv.top;
      const xm = (x0 + x1) / 2, d = Math.min(Math.abs(y1 - y0), Math.max(0, dir * (x1 - x0)));
      const drawn = partial(rounded([[x0, y0], [xm - dir * d / 2, y0], [xm + dir * d / 2, y1], [x1, y1]], LINK_RADIUS * u), f);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", drawn.map((p) => p.join(",")).join(" "));
      line.setAttribute("fill", "none");
      svg.append(line);
      const [px, py] = drawn[drawn.length - 2], [hx, hy] = drawn[drawn.length - 1], len = Math.hypot(hx - px, hy - py);
      if (len > 0) {
        const L = (ARROW_H / 2) * Math.SQRT2 * u, ux = (hx - px) / len, uy = (hy - py) / len, c = Math.SQRT1_2;
        const arm = (sx) => [hx - L * c * (ux - sx * uy), hy - L * c * (uy + sx * ux)];
        const head = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        head.setAttribute("points", [arm(1), [hx, hy], arm(-1)].map((p) => p.join(",")).join(" "));
        head.setAttribute("fill", "none");
        svg.append(head);
      }
    }
  }
  const wiresAt = (stop, beat) => setWires(stop, (w) => (beat >= w.beat ? 1 : 0));
  // Draws (to 1) or erases (to 0) the wires of one beat's step, the others held.
  const wireRun = (stop, beat, step, to, my) => {
    const k = (f) => (w) => (w.beat < beat || (w.beat === beat && w.step < step) ? 1 : w.beat === beat && w.step === step ? f : 0);
    return tween([{ apply: (e) => setWires(stop, k(to ? e : 1 - e)) }], my).then(() => { if (my === epoch) setWires(stop, k(to)); });
  };

  // A stacked statement ([data-place="stack"]) is moved down so its
  // [data-link-target] line's centre sits on the link point's height.
  function placeStack(stop) {
    for (const st of stop.root.querySelectorAll('.slide-statement[data-place="stack"]')) {
      st.style.transform = "";
      const target = st.querySelector("[data-link-target]");
      const pt = linkPoint(stop);
      if (!target || !pt) continue;
      const t = target.getBoundingClientRect();
      st.style.transform = `translateY(${pt.y - (t.top + t.height / 2)}px)`;
    }
  }
  // Statement changes within a slide: the leaving sentences funnel into the
  // sink, then the entering ones pour out.
  // `withOut` / `withIn` run alongside the leaving / entering sentences (a
  // split that goes with the statement change).
  async function textRun(stop, from, to, my, { withOut, withIn } = {}) {
    const at = (beat) => (el) => shownAt(stop, stop.sentences.indexOf(el), beat);
    const outs = stop.sentences.filter((el) => at(from)(el) && !at(to)(el));
    const ins = stop.sentences.filter((el) => !at(from)(el) && at(to)(el));
    if (outs.length || withOut) {
      outs.forEach((el) => setGenie(el, 1, true));
      await Promise.all([wait(Math.max(0, ...outs.map((el) => totalFor(el)))), withOut?.(my)]);
      if (my !== epoch) return;
    }
    if (ins.length) {
      placeStack(stop);
      relayout();
      await frames(2);
      if (my !== epoch) return;
      ins.forEach((el) => setGenie(el, 0, true));
      await Promise.all([wait(Math.max(0, ...ins.map((el) => totalFor(el)))), withIn?.(my)]);
    } else if (withIn) await withIn(my);
  }

  // ---- Solo placement ---------------------------------------------------------
  // A visual's offset (px) from its place in the layout. It's composed with the
  // rise and fall translations, so a centred artefact rises into its centred spot.
  const offsets = new Map();
  const tr = (g, dy = 0) => {
    const o = offsets.get(g) ?? { x: 0, y: 0 };
    return o.x || o.y || dy ? `translate(${o.x}px, ${o.y + dy}px)` : "";
  };
  const unionRect = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width || r.height);
    if (!rs.length) return null;
    const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
    const right = Math.max(...rs.map((r) => r.right)), bottom = Math.max(...rs.map((r) => r.bottom));
    return { left, top, width: right - left, height: bottom - top };
  };
  const contentRect = (g) => unionRect([...g.children]);
  const visualArea = (stop) => unionRect([...stop.root.querySelectorAll(".slide-visual")]);
  // The offset that centres g's content in the visual area, at the solo scale
  // (measured fully typed, so it's centred at its final height).
  function soloOffset(stop, g) {
    g.style.setProperty("--s", SOLO_SCALE);
    g.style.transform = "";
    const r = contentRect(g), a = visualArea(stop);
    if (!r || !a) return { x: 0, y: 0 };
    return { x: a.left + a.width / 2 - (r.left + r.width / 2), y: a.top + a.height / 2 - (r.top + r.height / 2) };
  }
  function placeSolo(stop, g, beat) {
    if (!isArtefact(g)) return;
    if (!g.hidden && soloAt(g, beat)) offsets.set(g, soloOffset(stop, g));
    else { g.style.setProperty("--s", 1); offsets.delete(g); }
    g.style.transform = tr(g);
  }
  // Tween item for an artefact going into or out of solo: its scale and its
  // content's top-left move together from where it is to where it ends up.
  function soloMove(stop, g, toSolo) {
    const r0 = contentRect(g), s0 = toSolo ? 1 : SOLO_SCALE, s1 = toSolo ? SOLO_SCALE : 1;
    const o1 = toSolo ? soloOffset(stop, g) : { x: 0, y: 0 };
    g.style.setProperty("--s", s1);
    g.style.transform = `translate(${o1.x}px, ${o1.y}px)`;
    const r1 = contentRect(g);
    const item = {
      apply: (k) => {
        g.style.setProperty("--s", s0 + (s1 - s0) * k);
        g.style.transform = "";
        const r = contentRect(g);
        offsets.set(g, { x: r0.left + (r1.left - r0.left) * k - r.left, y: r0.top + (r1.top - r0.top) * k - r.top });
        g.style.transform = tr(g);
      },
      end: () => {
        if (toSolo) offsets.set(g, o1); else offsets.delete(g);
        g.style.setProperty("--s", s1);
        g.style.transform = tr(g);
      },
    };
    item.apply(0);
    return item;
  }
  // Types a stop's shown artefacts in, all together (after they've risen).
  // A cropped one (slide 1's split chat) has its areas' text typed back instead.
  const typeIn = (stop, beat, my) => Promise.all(stop.visuals
    .filter((g) => isArtefact(g) && shownVisual(g, beat))
    .flatMap((g) => (cropAt(g, beat) ? [areaRun(stop, g, 0, my, TYPE_MS, markAt(g, beat))] : blocksAt(g, beat).map((b) => typeTo(b, 1, TYPE_MS, () => my !== epoch)))));
  // A sentence shows from its index's beat, or from its data-enter beat.
  const shownAt = (stop, i, beat) => {
    if (stop.implicit) return true;
    const el = stop.sentences[i];
    return beat >= (el?.dataset.enter != null ? Number(el.dataset.enter) : i) && (!el || beat < exitOf(el));
  };

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
    const st = slide.querySelector(".slide-statement:not([data-place])");
    const vis = [...slide.querySelectorAll(".slide-visual")];
    // A stacked statement hangs from row 1 on the text axis, 6 columns wide.
    for (const s2 of slide.querySelectorAll('.slide-statement[data-place="stack"]')) {
      s2.style.gridColumn = `${a0} / span ${Math.min(6, avail)}`;
      s2.style.gridRow = `1 / ${ROWS + 1}`;
      s2.style.alignSelf = "start";
    }
    // A grid statement ([data-place="grid"], slide 7) covers the open columns
    // and every row field as a subgrid; its sentences each take their own cell
    // (CSS), and the visuals stop two row fields short (captions, base line).
    const grid = slide.querySelector('.slide-statement[data-place="grid"]');
    if (grid) {
      grid.style.gridColumn = `${a0} / ${aEnd}`;
      grid.style.gridRow = `1 / ${ROWS + 1}`;
    }
    const wanted = t === "text" ? 8 : t === "split" ? (Number(slide.dataset.split) || 6)
      : slide.dataset.statement === "large" ? COLUMNS : 6;
    let text = Math.min(wanted, avail);
    // Split, and a Text slide with a visual (slide 3): the visual takes the
    // columns after the statement, down to its scene's minimum span.
    if ((t === "split" || t === "text") && vis[0]) {
      const [min] = graphicSpan(vis[0].querySelector("[data-graphic]")) ?? [4, 4];
      text = Math.max(Math.min(TEXT_MIN, avail), Math.min(text, avail - min));
      vis[0].style.gridColumn = `${a0 + text} / ${aEnd}`;
      vis[0].style.gridRow = `1 / ${ROWS + 1}`;
    }
    if (st) {
      st.style.gridColumn = `${a0} / span ${text}`;
      // A pure Text slide (no visual, slide 9 on) hangs its statement from
      // row 2, one row field down; data-row on the statement picks the row.
      const row = Number(st.dataset.row) || (t === "text" && !vis.length ? 2 : 0);
      st.style.gridRow = row ? `${row} / ${ROWS + 1}` : "";
      st.style.alignSelf = "";
      // data-at on a sentence (slide 14's warning): out of the statement's
      // flow, on its base line from that open column to the last, so the
      // statement's rows count only the sentences in flow.
      for (const p of st.querySelectorAll(":scope > [data-at]")) {
        const at = Number(p.dataset.at) - 1;
        p.style.setProperty("--at", at);
        p.style.setProperty("--at-span", Math.max(1, avail - at));
      }
      placeRows(st);
    }
    if (t === "wide" || t === "row" || t === "visual") {
      let end = grid ? ROWS - 1 : ROWS + 1; // first row the visuals don't reach
      if (st && t !== "visual") {
        const rows = statementRows(st);
        end = ROWS + 1 - rows;
        st.style.gridRow = `${end} / ${ROWS + 1}`;
        st.style.alignSelf = "end";
      }
      // data-cols on a visual fixes its span, and data-at its first column
      // (from the text axis; slide 7: the knot 1-5, the site 8-12); the others
      // share what's left equally.
      const n = Math.max(1, vis.length), fixed = vis.filter((v) => v.dataset.cols);
      const taken = fixed.reduce((sum, v) => sum + Number(v.dataset.cols), 0);
      const span = Math.floor((avail - taken) / Math.max(1, n - fixed.length));
      let col = a0;
      vis.forEach((v) => {
        const w = v.dataset.cols ? Number(v.dataset.cols) : span;
        if (v.dataset.at) col = a0 + Number(v.dataset.at) - 1;
        v.style.gridColumn = n === 1 ? `${a0} / ${aEnd}` : `${col} / span ${w}`;
        // data-rows: a visual reaching further down than the others (slide 8's
        // sculpture, past the base-line statement's columns).
        v.style.gridRow = `1 / ${v.dataset.rows ? Number(v.dataset.rows) + 1 : Math.max(2, end)}`;
        col += w;
      });
    }
  }

  // data-middle on a sentence: its centre sits on the vertical middle of the
  // row fields (slide 2's second sentence), unless the sentences above reach
  // past that, where it keeps its usual gap.
  function placeRows(st) {
    for (const p of st.querySelectorAll(":scope > [data-middle]")) {
      p.style.marginTop = "";
      const m0 = parseFloat(getComputedStyle(p).marginTop) || 0;
      const r = p.getBoundingClientRect();
      const want = (FRAME_H / 2) * unit() - r.height / 2;
      const now = r.top - st.getBoundingClientRect().top;
      p.style.marginTop = `${Math.max(m0, m0 + want - now)}px`;
    }
    // data-bottom on a sentence: its bottom edge sits on the bottom edge of
    // the last row field (slide 9's spoiler), unless the text above reaches
    // past that.
    const slide = st.closest(".slide");
    for (const p of st.querySelectorAll(":scope > [data-bottom]")) {
      p.style.marginTop = "";
      const m0 = parseFloat(getComputedStyle(p).marginTop) || 0;
      const r = p.getBoundingClientRect(), u = unit();
      const bottom = slide.getBoundingClientRect().top + parseFloat(getComputedStyle(slide).paddingTop)
        + (ROWS * FIELD + (ROWS - 1) * FIELD_GAP) * u;
      p.style.marginTop = `${Math.max(m0, m0 + bottom - r.bottom)}px`;
    }
    // data-row="5" on a sentence: its top edge sits on the top of that row
    // field (slide 17's answer), unless the text above reaches past it.
    for (const p of st.querySelectorAll(":scope > [data-row]")) {
      p.style.marginTop = "";
      const m0 = parseFloat(getComputedStyle(p).marginTop) || 0;
      const r = p.getBoundingClientRect(), u = unit();
      const top = slide.getBoundingClientRect().top + parseFloat(getComputedStyle(slide).paddingTop)
        + (Number(p.dataset.row) - 1) * (FIELD + FIELD_GAP) * u;
      p.style.marginTop = `${Math.max(m0, m0 + top - r.top)}px`;
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
    const stop = stops[cur.i];
    if (stop && !stop.implicit && !busyTarget && !stop.root.hidden) placeVisuals(stop, cur.beat);
  }

  // ---- Cuts -----------------------------------------------------------------
  function cleanVisual(g) {
    clearFrame(g);
    g.querySelectorAll?.(".tree-pane ul").forEach((ul) => (ul.style.height = "")); // a cut-off folder swap
    g.style.removeProperty("--fill-alpha"); // a faded-out visual
    if (g.dataset.graphic) setGraphicAlign(g, null);
    g.style.transform = g.style.left = g.style.top = g.style.width = g.style.height = "";
    g.style.transform = tr(g); // a solo artefact keeps its centring offset
    if (g.style.position === "absolute") g.style.position = "relative";
    g.style.display = "";
  }

  function show(stop) {
    if (stop.implicit) return;
    for (const s of stops) if (s.panel === stop.panel && !s.implicit) s.root.hidden = s !== stop;
    layoutSlide(stop.root);
  }

  // The slide number sits right of the section title and changes on every
  // slide, as soon as the new slide comes on (it doesn't rise or fall).
  function setNumber(stop) {
    if (!stop.footer || stop.implicit) return;
    let num = stop.footer.querySelector(".slide-number");
    if (!num) {
      num = document.createElement("p");
      num.className = "slide-number";
      stop.footer.append(num);
    }
    num.textContent = String(stop.number);
  }

  function setTitle(stop) {
    setNumber(stop);
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
    clearMorph(stop);
    setTemplate(stop, beat);
    show(stop);
    stop.sentences.forEach((el, k) => setGenie(el, shownAt(stop, k, beat) ? 0 : 1, false));
    placeVisuals(stop, beat);
    stop.visuals.forEach((g) => setState(stop, g, beat, false));
    setTitle(stop);
    cur = { i, beat };
    relayout();
    onMove(position());
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
    const d = genieSettings.lineTime, step = (1 + genieSettings.lineGap) * d;
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
  // An item with its own `ms` runs over that instead (the step lasts as long as
  // its longest item); apply gets the eased and the raw fraction.
  function tween(items, my, ms = VISUAL_MS) {
    if (!items.length) return Promise.resolve();
    const total = Math.max(...items.map((it) => (it.delay ?? 0) + (it.ms ?? ms)));
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (my !== epoch) return resolve();
        const el = now - t0;
        items.forEach((it) => { const t = Math.min(1, Math.max(0, el - (it.delay ?? 0)) / (it.ms ?? ms)); it.apply(ease(t), t); });
        relayout();
        if (el < total) requestAnimationFrame(frame);
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
  const rise = (el, dy) => ({ apply: (k) => (el.style.transform = tr(el, (1 - k) * dy)) });
  const fall = (el, dy) => ({ apply: (k) => (el.style.transform = tr(el, k * dy)) });

  // Folder swap on a carried file tree (slide 13 -> 14): the new tree starts
  // with the old one's folders open and its spans, so the hand-over draws the
  // same thing; then, in two halves of VISUAL_MS, the folders that close
  // shrink to nothing, and the ones that open grow in with the new spans.
  // Folders and spans are matched by their names; it runs the same way back.
  function treeSwap(og, g) {
    if (!g.querySelector(".tree-pane")) return [];
    const folders = (t) => new Map([...t.querySelectorAll(".tree-pane li > ul")]
      .map((ul) => [ul.parentElement.querySelector(":scope > .tree-name")?.textContent.trim(), ul]));
    const was = folders(og), closing = [], opening = [];
    for (const [name, ul] of folders(g)) {
      const before = was.has(name) && !was.get(name).hasAttribute("data-closed"), after = !ul.hasAttribute("data-closed");
      if (before && !after) closing.push(ul);
      if (!before && after) opening.push(ul);
    }
    if (!closing.length && !opening.length) return [];
    const spans = new Map([...og.querySelectorAll(".hl")].map((h) => [h.textContent.trim(), h.dataset.span]));
    const target = [...g.querySelectorAll(".hl")].map((h) => [h, h.dataset.span]);
    for (const [h] of target) h.dataset.span = spans.get(h.textContent.trim()) ?? "none";
    const full = new Map([...closing, ...opening].map((ul) => [ul, ul.scrollHeight]));
    closing.forEach((ul) => (ul.style.height = `${full.get(ul)}px`));
    opening.forEach((ul) => (ul.style.height = "0px"));
    const half = VISUAL_MS / 2, items = [];
    let spun = false;
    if (closing.length) items.push({ ms: half, apply: (k, t) => closing.forEach((ul) => (ul.style.height = t >= 1 ? "" : `${full.get(ul) * (1 - k)}px`)) });
    items.push({ delay: closing.length ? half : 0, ms: half, apply: (k, t) => {
      if (t > 0 && !spun) { spun = true; for (const [h, v] of target) h.dataset.span = v; }
      opening.forEach((ul) => (ul.style.height = t >= 1 ? "" : `${full.get(ul) * k}px`));
    } });
    return items;
  }

  // The visuals phase within one tab, in steps that never overlap:
  // exits (old visuals that aren't carried fall out, and the old section title
  // with them), then moves (carried scenes go to their new boxes and states),
  // then folder swaps on carried trees (treeSwap), then entrances (new visuals
  // rise in, and the new title). Each step is one
  // VISUAL_MS tween; an empty step is skipped.
  function visualSteps(from, to, beat) {
    const exits = [], moves = [], swaps = [], enters = [], outs = from.visuals.filter((g) => !g.hidden);
    const later = []; // data-step > 0: they enter after these steps (laterIn)
    placeVisuals(to, beat);
    for (const g of to.visuals) {
      if (g.hidden) continue;
      // data-carry="<key>" (slide 6 -> 7, the artist site): an artefact with the
      // same key on the old slide moves to its new box instead of closing and
      // opening. The new one draws exactly where the old one was, then its box
      // moves with the carried scenes.
      const ck = isArtefact(g) && g.dataset.carry;
      const oc = ck ? outs.findIndex((o) => o.dataset.carry === ck) : -1;
      if (oc >= 0) {
        const og = outs.splice(oc, 1)[0];
        const r0 = og.getBoundingClientRect(), wrap = g.parentElement.getBoundingClientRect();
        og.style.display = "none";
        const box0 = { x: r0.left - wrap.left, y: r0.top - wrap.top, w: r0.width, h: r0.height };
        const box1 = { x: 0, y: 0, w: wrap.width, h: wrap.height };
        g.style.position = "absolute";
        const at = (k) => {
          g.style.left = `${box0.x + (box1.x - box0.x) * k}px`;
          g.style.top = `${box0.y + (box1.y - box0.y) * k}px`;
          g.style.width = `${box0.w + (box1.w - box0.w) * k}px`;
          g.style.height = `${box0.h + (box1.h - box0.h) * k}px`;
        };
        at(0);
        // A carry to the same box (slide 13 -> 14's folder) has nothing to move.
        const still = ["x", "y", "w", "h"].every((q) => Math.abs(box0[q] - box1[q]) < 0.5);
        if (!still) moves.push({ apply: at });
        swaps.push(...treeSwap(og, g));
        continue;
      }
      if (stepOf(g) > 0) { g.hidden = true; later.push(g); continue; }
      if (isArtefact(g)) {
        emptyArtefact(to, g, beat); // it types in once its frame is open
        enters.push(frameItem(g, 1));
        continue;
      }
      const k = outs.findIndex((o) => !isArtefact(o) && o.dataset.graphic === g.dataset.graphic);
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
        // A carry back to an earlier state (slide 8's merge back to slide 7's
        // tied knot) cuts to it, rather than playing the sequence backwards in
        // the new, smaller box.
        const forward = graphicIndex(og) <= target;
        moves.push({ start: () => setGraphicState(g, target, forward), apply: at });
      } else {
        setGraphicState(g, target, false);
        enters.push(delayed(g, enterItem(to, g))); // drawn closed or wiped out until it runs
      }
    }
    for (const og of outs) exits.push(leaveItem(from, og));
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
    return Object.assign([exits, moves, swaps, enters], { later });
  }
  // A slide change's wires and stepped visuals (slide 15): once the first
  // visuals are in and typed, the wires between them draw; then each later
  // data-step's visuals enter (and type), each followed by the wires they
  // complete.
  async function laterIn(to, beat, later, my) {
    const vs = (w) => Math.max(stepOf(visualOf(w.a)), stepOf(visualOf(w.b)));
    const draw = async (sn) => {
      if (!wiresOf(to).some((w) => beat >= w.beat && vs(w) === sn)) return;
      await tween([{ apply: (e) => setWires(to, (w) => (beat < w.beat ? 0 : vs(w) < sn ? 1 : vs(w) === sn ? e : 0)) }], my);
    };
    await draw(0);
    for (const sn of [...new Set(later.map(stepOf))].sort((x, y) => x - y)) {
      if (my !== epoch) return false;
      await bringIn(to, later.filter((g) => stepOf(g) === sn), beat, my);
      if (my !== epoch) return false;
      await draw(sn);
    }
    return my === epoch;
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
    onMove(position());

    // 1. Text out. Links (slide 1's) erase along with it, start first, over the
    // same run, then the boxes they came from fall with the other visuals.
    // Text artefacts erase alongside, so their frames can close with the exits.
    let later = [];
    const outMs = textOut(from, my);
    const links = from.root.querySelector?.(".slide-links")?.childElementCount ? from : null;
    await Promise.all([
      wait(outMs),
      links && tween([{ apply: (k) => setLinks(links, 1, k) }], my, Math.max(outMs, 1)),
      eraseArtefacts(from, my, outMs),
      wipeBoxed(from, my),
      from.root.querySelector?.(".slide-wires")?.childElementCount
        && tween([{ apply: (k) => setWires(from, () => 1 - k) }], my, Math.max(outMs, 1)),
    ]);
    if (my !== epoch) return;

    // The new slide comes on with its text in the sink.
    to.sentences.forEach((el) => setGenie(el, 1, false));
    if (from.panel === to.panel) setNumber(to);
    if (from.panel === to.panel) {
      // Shown and set up in one go, so no frame ever draws the new slide's
      // visuals in place before their entrance.
      if (!to.implicit) to.root.hidden = false;
      setTemplate(to, beat);
      layoutSlide(to.root);
      const steps = visualSteps(from, to, beat);
      later = steps.later;
      holdLinks(to);
      relayout();
      // 2. Visuals: exits, a pause, then moves, then entrances.
      if (!(await runSteps(steps.slice(0, 1), my))) return;
      await wait(SLIDE_PAUSE_MS);
      if (my !== epoch) return;
      if (!(await runSteps(steps.slice(1), my))) return;
      if (!from.implicit) from.root.hidden = true;
      from.visuals.forEach(cleanVisual);
      setTitle(to);
    } else {
      // 2a. The old tab's visuals fall out before the accordion moves.
      if (!(await runSteps([from.visuals.filter((og) => !og.hidden).map((og) => leaveItem(from, og))], my))) return;
      await wait(SLIDE_PAUSE_MS); // then a pause
      if (my !== epoch) return;
      setTemplate(to, beat);
      show(to);
      to.visuals.forEach(cleanVisual);
      setTitle(to);
      placeVisuals(to, beat);
      holdLinks(to);
      // Its visuals wait below the panel while the accordion moves (set up
      // before any frame draws them); artefacts type in once they've risen.
      later = to.visuals.filter((g) => !g.hidden && stepOf(g) > 0);
      later.forEach((g) => (g.hidden = true));
      const enters = to.visuals.filter((g) => !g.hidden).map((g) => {
        if (isArtefact(g)) emptyArtefact(to, g, beat);
        setState(to, g, beat, false);
        return enterItem(to, g);
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
    await typeIn(to, beat, my);
    if (my !== epoch) return;
    if (!(await laterIn(to, beat, later, my))) return;

    // 3. Text in (line counts need a measure of the shown slide first).
    await frames(2);
    if (my !== epoch) return;
    cur = { i: toI, beat };
    // Links held back on the way in draw with the text, over the same run.
    const inMs = textIn(to, beat, my);
    if (heldLinks === to) await Promise.all([wait(inMs), tween([{ apply: (k) => setLinks(to, k) }], my, Math.max(inMs, 1))]);
    else await wait(inMs);
    if (my !== epoch) return;
    if (heldLinks === to) { setLinks(to, 1); heldLinks = null; }
    busyTarget = null;
  }
  // A slide entered on a beat with links (back into slide 1's last beat): they
  // aren't drawn while the old slide's visuals leave and the new ones rise, but
  // with the text in, the reverse of how they leave.
  let heldLinks = null;
  function holdLinks(stop) {
    heldLinks = stop.root.querySelector?.(".slide-links")?.childElementCount ? stop : null;
    if (heldLinks) setLinks(stop, 0);
    setWires(stop, () => 0); // wires draw once the visuals are in (change)
  }

  // ---- Input ------------------------------------------------------------------
  // dir +1 / -1. Returns false at either end of the talk.
  function step(dir) {
    if (!enabled) return false;
    if (busyTarget) cut(busyTarget.i, busyTarget.beat); // rapid press: skip to the end state
    const stop = stops[cur.i], nb = cur.beat + dir;
    if (nb >= 0 && nb < beatsOf(stop)) {
      cur.beat = nb;
      // Motion on, statement changes run as the beat's text phase, in order.
      if (!motionOn()) stop.sentences.forEach((el, k) => setGenie(el, shownAt(stop, k, nb) ? 0 : 1, false));
      stop.visuals.forEach((g) => { if (!phased(g) || !motionOn()) setState(stop, g, nb, true); });
      setSpans(stop, nb);
      if (beatPhases(stop, Math.min(nb, nb - dir)).length) {
        if (!motionOn()) { clearMorph(stop); setTemplate(stop, nb); layoutSlide(stop.root); placeVisuals(stop, nb); relayout(); }
        else runBeat(stop, nb - dir, nb);
      }
      onMove(position());
      return true;
    }
    const ni = cur.i + dir;
    if (ni < 0 || ni >= stops.length) return false;
    change(ni, dir > 0 ? 0 : beatsOf(stops[ni]) - 1);
    return true;
  }

  // ---- Beats within a slide ------------------------------------------------------
  // One beat forward (a -> a + 1) as phases in order: visuals leaving (erase,
  // close or fall, alongside a crop and zoom), the template morph, solo moves,
  // the statement (out, then in), marks,
  // links, then visuals entering (rise, type). A step back runs the same list
  // backwards, each phase reversed, so back undoes forward exactly.
  function beatPhases(stop, a) {
    const b = a + 1, both = (g) => shownVisual(g, a) && shownVisual(g, b);
    const stack = stop.visuals.filter((g) => stackOf(g) === b);
    const leave = stop.visuals.filter((g) => shownVisual(g, a) && !shownVisual(g, b) && !stack.includes(g));
    const enter = stop.visuals.filter((g) => !shownVisual(g, a) && shownVisual(g, b));
    const solo = stop.visuals.filter((g) => isArtefact(g) && both(g) && soloAt(g, a) !== soloAt(g, b));
    const crop = stop.visuals.filter((g) => both(g) && cropAt(g, a) !== cropAt(g, b));
    const split = stop.visuals.filter((g) => both(g) && splitAt(g, a) !== splitAt(g, b));
    const mark = stop.visuals.filter((g) => shownVisual(g, b) && markAt(g, a) !== markAt(g, b));
    const text = stop.sentences.some((el, i) => shownAt(stop, i, a) !== shownAt(stop, i, b));
    const staged = stop.visuals.filter((g) => !isArtefact(g) && phased(g) && both(g) && stateFor(stop, g, a) !== stateFor(stop, g, b));
    const cropIn = (my) => cropRun(stop, crop, "c", 1, my), cropOut = (my) => cropRun(stop, crop, "c", 0, my);
    const ph = [];
    // Visuals leaving and an erase on the same beat run together.
    if (leave.length && crop.length) {
      ph.push({ fwd: (my) => Promise.all([takeOut(stop, leave, my), cropIn(my)]), back: (my) => Promise.all([bringIn(stop, leave, a, my), cropOut(my)]) });
    } else {
      if (leave.length) ph.push({ fwd: (my) => takeOut(stop, leave, my), back: (my) => bringIn(stop, leave, a, my) });
      if (crop.length) ph.push({ fwd: cropIn, back: cropOut });
    }
    const splitIn = (my) => cropRun(stop, split, "p", 1, my), splitOut = (my) => cropRun(stop, split, "p", 0, my);
    // A split on a beat with a statement change goes with the old statement's
    // genie out (and back, with its pour in).
    const splitWithText = split.length > 0 && text;
    if (split.length && !splitWithText) ph.push({ fwd: splitIn, back: splitOut });
    if (templateAt(stop, a) !== templateAt(stop, b)) ph.push({ fwd: (my) => morph(stop, b, my), back: (my) => morph(stop, a, my) });
    if (solo.length) ph.push({ fwd: (my) => soloRun(stop, solo, b, my), back: (my) => soloRun(stop, solo, a, my) });
    if (staged.length) {
      const to = (beat) => () => { staged.forEach((g) => setGraphicState(g, stateFor(stop, g, beat), true)); return wait(VISUAL_MS); };
      ph.push({ fwd: to(b), back: to(a) });
    }
    if (text) ph.push({
      fwd: (my) => textRun(stop, a, b, my, splitWithText ? { withOut: splitIn } : {}),
      back: (my) => textRun(stop, b, a, my, splitWithText ? { withIn: splitOut } : {}),
    });
    if (stack.length) ph.push({ fwd: (my) => stackRun(stop, stack, 1, my), back: (my) => stackRun(stop, stack, 0, my) });
    const grids = stop.visuals.filter((g) => g.dataset.gridAt != null && Number(g.dataset.gridAt) === b && both(g));
    if (grids.length) ph.push({ fwd: (my) => gridRun(stop, grids, 1, my), back: (my) => gridRun(stop, grids, 0, my) });
    // Marks (and their links, if the slide has any); on an artefact that enters
    // on this beat they wait until it has typed in.
    const marks = [];
    if (mark.length) {
      marks.push({ fwd: (my) => markRun(stop, mark, 1, my), back: (my) => markRun(stop, mark, 0, my) });
      if (stop.root.querySelector(".slide-links")) marks.push({ fwd: (my) => linkRun(stop, 1, my), back: (my) => linkRun(stop, 0, my) });
    }
    const marksLast = mark.some((g) => enter.includes(g));
    if (!marksLast) ph.push(...marks);
    // Entrances by data-step, then that step's grows and stepped typing
    // (data-type-at with data-step), then its wires.
    const wires = wiresOf(stop).filter((w) => w.beat === b);
    const grows = growsOf(stop).filter((el) => Number(el.dataset.growAt) === b);
    const typed = stop.visuals.filter((g) => isArtefact(g) && both(g)).flatMap((g) => typeBlocks(g).filter((bl) => typeAt(bl) === b));
    const stepped = typed.filter((bl) => bl.dataset.step != null);
    const steps = [...new Set([...enter, ...grows, ...stepped].map(stepOf).concat(wires.map((w) => w.step)))].sort((x, y) => x - y);
    const typeRun = (bls, to) => (my) => Promise.all(bls.map((bl) => typeTo(bl, to, TYPE_MS, () => my !== epoch)));
    for (const sn of steps) {
      const gs = enter.filter((g) => stepOf(g) === sn);
      if (gs.length) ph.push({ fwd: (my) => bringIn(stop, gs, b, my), back: (my) => takeOut(stop, gs, my) });
      const gr = grows.filter((el) => stepOf(el) === sn);
      if (gr.length) ph.push({ fwd: (my) => growRun(gr, 1, my), back: (my) => growRun(gr, 0, my) });
      const ty = stepped.filter((bl) => stepOf(bl) === sn);
      if (ty.length) ph.push({ fwd: typeRun(ty, 1), back: typeRun(ty, 0) });
      if (wires.some((w) => w.step === sn)) ph.push({ fwd: (my) => wireRun(stop, b, sn, 1, my), back: (my) => wireRun(stop, b, sn, 0, my) });
    }
    if (marksLast) ph.push(...marks);
    // Blocks typed on this beat (data-type-at) in already-shown artefacts, last.
    const due = typed.filter((bl) => bl.dataset.step == null);
    if (due.length) ph.push({
      fwd: (my) => Promise.all(due.map((bl) => typeTo(bl, 1, TYPE_MS, () => my !== epoch))),
      back: (my) => Promise.all(due.map((bl) => typeTo(bl, 0, TYPE_MS, () => my !== epoch))),
    });
    return ph;
  }

  async function runBeat(stop, from, to) {
    const my = ++epoch;
    busyTarget = { i: cur.i, beat: to };
    const fwd = to > from, phases = beatPhases(stop, Math.min(from, to));
    for (const p of fwd ? phases : [...phases].reverse()) {
      await (fwd ? p.fwd : p.back)(my);
      if (my !== epoch) return;
    }
    relayout();
    busyTarget = null;
  }

  const arts = (gs, beat = Infinity) => gs.filter(isArtefact).flatMap((g) => blocksAt(g, beat));

  // ---- Framed visuals ---------------------------------------------------------
  // A framed visual (an artefact's [data-frame] box, or a flat scene with a
  // container shape) enters by its frame growing from its top-left corner
  // (FRAME_MS), then its content wiping in downward (FRAME_MS), then its
  // caption cutting in; it leaves the reverse way. A text artefact's content
  // step is its typing instead, so its frame item is the grow alone and the
  // text types once it's done (or erases before it closes). Slide 1's split
  // chat frames each split box. The raster draws it (--open, --wipe:
  // js/text-raster.js); the layout never moves.
  const cropped = (g) => (cz.get(g)?.c ?? 0) > 0;
  const frameEls = (g) => ((cz.get(g)?.p ?? 0) > 0 ? cropAreas(g) : [...g.querySelectorAll("[data-frame]")]);
  const framed = (g) => !!g.querySelector("[data-frame]") || graphicFramed(g);
  const captionsOf = (g) => [...g.querySelectorAll(".site-caption, .chat-speaker")];
  // A crop hides the speaker label itself (setCropZoom), so it stays hidden.
  const showCaptions = (g, on) => {
    captionsOf(g).forEach((c) => (c.style.visibility = on && !cropped(g) ? "" : "hidden"));
    const caps = g.querySelectorAll?.(".doc-cap") ?? [];
    caps.forEach((c) => (c.hidden = !(on && !cropped(g)))); // leaders and dots too
    if (caps.length) placeCaptions({ root: g });
  };
  // A scene in its picture box (graphicBoxed) closes like a framed one; its
  // drawing wipes up first, with the text out (wipeBoxed).
  const closes = (g) => framed(g) || graphicBoxed(g);
  function setFrame(g, o, w) {
    if (g.dataset.graphic) return setGraphicOpen(g, o, w);
    for (const f of frameEls(g)) { f.style.setProperty("--open", o); f.style.setProperty("--wipe", w); }
  }
  function clearFrame(g) {
    if (g.dataset.graphic) setGraphicOpen(g, 1, 1);
    for (const f of [...g.querySelectorAll("[data-frame]"), ...cropAreas(g)]) { f.style.removeProperty("--open"); f.style.removeProperty("--wipe"); }
    showCaptions(g, true);
  }
  function frameItem(g, to) {
    // A boxed scene leaving has wiped up already (wipeBoxed), like an erase.
    const text = (isArtefact(g) && blocksAt(g).length > 0) || (graphicBoxed(g) && !to);
    // p: 0 closed .. 1 open, on the entrance's own clock; each half eased.
    const at = (p) => {
      // (Leaving, a text artefact's or boxed scene's content is already gone.)
      setFrame(g, ease(Math.min(1, text ? p : p * 2)), text ? (p >= 1 && to ? 1 : 0) : ease(Math.max(0, p * 2 - 1)));
      showCaptions(g, p >= 1);
    };
    at(to ? 0 : 1);
    return { ms: text ? FRAME_MS : 2 * FRAME_MS, apply: (k, t) => at(to ? t : 1 - t), clear: () => clearFrame(g) };
  }
  // How a visual leaves on a slide change: framed ones close, the rest fall.
  // Every other 3D scene wipes its drawing in downward and out upward
  // (2 × FRAME_MS, like a framed visual's whole entrance), labels cut in after.
  function wipeItem(g, to) {
    const at = (p) => setGraphicOpen(g, 1, ease(p));
    at(to ? 0 : 1);
    return { ms: 2 * FRAME_MS, apply: (k, t) => at(to ? t : 1 - t), clear: () => setGraphicOpen(g, 1, 1) };
  }
  // How a visual enters and leaves: framed ones open and close, scenes wipe,
  // anything else rises and falls.
  // data-exit-fade (slide 12's figures): it fades out instead (its fills'
  // --fill-alpha to 0), within a slide and on a slide change.
  const fadeItem = (g) => ({ apply: (k) => g.style.setProperty("--fill-alpha", String(1 - k)), clear: () => g.style.removeProperty("--fill-alpha") });
  const leaveItem = (stop, g) => (g.hasAttribute("data-exit-fade") ? fadeItem(g) : closes(g) ? frameItem(g, 0) : g.dataset.graphic ? wipeItem(g, 0) : fall(g, belowPanel(stop, g)));
  function enterItem(stop, g) {
    if (closes(g)) return frameItem(g, 1);
    if (g.dataset.graphic) return wipeItem(g, 1);
    const dy = belowPanel(stop, g);
    g.style.transform = tr(g, dy);
    return rise(g, dy);
  }
  // ---- Stacking (slide 6) -------------------------------------------------------
  // Visuals with data-stack slide onto the slide's [data-stack-target] while
  // their content (each region's .tpl-content clip) wipes out upward, so only
  // their boxes land, exactly on the target's, and they're cut away there (no
  // close: it would read as the target's own outline glitching). Back: they cut
  // in on the target with their content cut, then slide home while it wipes
  // back in.
  function setContentWipe(g, w) { // hoisted: placeVisuals uses it from the start
    g.querySelectorAll(".tpl-content").forEach((c) => (w >= 1 ? c.style.removeProperty("--wipe") : c.style.setProperty("--wipe", w)));
  }
  async function stackRun(stop, gs, to, my) {
    const target = stop.visuals.find((g) => g.hasAttribute("data-stack-target"))?.querySelector("[data-frame]");
    if (!target) return;
    if (!to) gs.forEach((g) => { g.hidden = false; });
    // Each one's offset onto the target, measured from its own place.
    const moves = gs.map((g) => {
      offsets.delete(g);
      g.style.transform = "";
      const a = g.querySelector("[data-frame]").getBoundingClientRect(), b = target.getBoundingClientRect();
      return { g, dx: b.left - a.left, dy: b.top - a.top };
    });
    const place = (k) => moves.forEach(({ g, dx, dy }) => { offsets.set(g, { x: dx * k, y: dy * k }); g.style.transform = tr(g); });
    const slide = (k0, k1, wipe) => moves.map(({ g }, i) => ({
      ms: 2 * FRAME_MS,
      apply: (k, t) => { if (i === 0) place(k0 + (k1 - k0) * k); setContentWipe(g, wipe(t)); },
    }));
    if (to) {
      // Content out over the first half of the slide.
      await tween(slide(0, 1, (t) => 1 - ease(Math.min(1, t * 2))), my);
      if (my !== epoch) return;
      gs.forEach((g) => { g.hidden = true; offsets.delete(g); g.style.transform = ""; setContentWipe(g, 1); });
    } else {
      place(1);
      gs.forEach((g) => setContentWipe(g, 0));
      // Content back in over the second half.
      await tween(slide(1, 0, (t) => ease(Math.max(0, t * 2 - 1))), my);
      if (my !== epoch) return;
      gs.forEach((g) => { offsets.delete(g); g.style.transform = ""; setContentWipe(g, 1); });
    }
    relayout();
  }

  // A boxed scene's drawing wipes up (TYPE_MS, so it ends with the artefacts' erase).
  const wipeBoxed = (stop, my) => {
    const gs = stop.visuals.filter((g) => !g.hidden && graphicBoxed(g));
    return tween(gs.map((g) => ({ ms: TYPE_MS, apply: (k, t) => setGraphicOpen(g, 1, 1 - ease(t)) })), my);
  };

  // A split chat's areas: their text erased by c (0..1, back to front), each
  // box held at its full height meanwhile so nothing moves; marks follow the text.
  function setAreaText(g, c) {
    for (const a of cropAreas(g)) {
      const t = textOf(a);
      if (!lineText.has(t)) lineText.set(t, t.textContent);
      if (c > 0 && !a.style.height) a.style.height = `${a.getBoundingClientRect().height}px`;
      const full = lineText.get(t);
      t.textContent = full.slice(0, Math.round(full.length * (1 - c)));
      if (c <= 0) a.style.height = "";
    }
  }
  // Erases (to 1) or types back (to 0) a split chat's areas at a steady rate.
  function areaRun(stop, g, to, my, ms, marked) {
    const item = { apply: (k, t) => { setAreaText(g, to ? t : 1 - t); if (marked) setMarks(stop, g, 1); } };
    return tween([item], my, Math.max(ms, 1));
  }
  // An artefact about to enter on a slide change starts empty: typing blocks
  // cut to nothing, a split chat's areas erased.
  function emptyArtefact(stop, g, beat) {
    if (!cropAt(g, beat)) return typeBlocks(g).forEach((b) => setTyped(b, 0));
    setAreaText(g, 1);
    if (markAt(g, beat)) setMarks(stop, g, 1);
  }
  // A slide's shown text artefacts erase (split chats over the text-out run).
  const eraseArtefacts = (stop, my, ms) => Promise.all(stop.visuals.filter((g) => !g.hidden && isArtefact(g)).map((g) =>
    cropped(g) ? areaRun(stop, g, 1, my, ms || TYPE_MS, !!g.querySelector(".chat-mark")) : Promise.all(typeBlocks(g).map((b) => typeTo(b, 0, TYPE_MS, () => my !== epoch)))));

  // Visuals leaving within a slide: artefacts erase, then framed ones close
  // and the rest fall out.
  async function takeOut(stop, gs, my) {
    await Promise.all(arts(gs).map((b) => typeTo(b, 0, TYPE_MS, () => my !== epoch)));
    if (my !== epoch) return;
    const items = gs.map((g) => leaveItem(stop, g));
    if (!(await runSteps([items], my))) return;
    items.forEach((it) => it.clear?.());
    gs.forEach((g) => { g.hidden = true; offsets.delete(g); g.style.transform = ""; });
    relayout();
  }
  // Visuals entering within a slide: placed for the beat (centred if solo, at
  // full height), then framed ones open and the rest rise in, then artefacts type in.
  async function bringIn(stop, gs, beat, my) {
    const items = gs.map((g) => {
      g.hidden = false;
      arts([g], beat).forEach((b) => setTyped(b, 1));
      placeSolo(stop, g, beat);
      arts([g], beat).forEach((b) => setTyped(b, 0));
      return delayed(g, enterItem(stop, g));
    });
    relayout();
    if (!(await runSteps([items], my))) return;
    items.forEach((it) => it.clear?.());
    gs.forEach((g) => (g.style.transform = tr(g)));
    relayout();
    await Promise.all(arts(gs, beat).map((b) => typeTo(b, 1, TYPE_MS, () => my !== epoch)));
  }
  async function soloRun(stop, gs, beat, my) {
    const moves = gs.map((g) => soloMove(stop, g, soloAt(g, beat)));
    if (!(await runSteps([moves], my))) return;
    moves.forEach((m) => m.end());
    relayout();
  }

  // Jumps to a stop's first beat (the left nav), with the usual slide change.
  function goto(i) {
    if (!enabled || i < 0 || i >= stops.length) return;
    if (busyTarget) cut(busyTarget.i, busyTarget.beat);
    if (i === cur.i && cur.beat === 0) return;
    change(i, 0);
  }

  // Where the talk is, or is heading during a change: the stop, its beat, and
  // whether either end has been reached (the bottom bar dims that arrow).
  function position() {
    const at = busyTarget ?? cur;
    return {
      ...at,
      stop: stops[at.i],
      first: at.i === 0 && at.beat === 0,
      last: at.i === stops.length - 1 && at.beat === beatsOf(stops[at.i]) - 1,
    };
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

  // Straight to a stop and beat with no motion (a reload on a #tab/slide.beat link).
  function jump(i, beat) {
    if (!enabled || i < 0 || i >= stops.length) return;
    cut(i, Math.min(beat, beatsOf(stops[i]) - 1));
  }

  return { enabled, step, goto, jump, land, reflow, stops, position, current: () => ({ ...cur }) };
}
