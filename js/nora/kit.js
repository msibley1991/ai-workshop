// The workshop kit on Nora's task slides (assets/kit/): the prompts are shown
// from their own files, so the slide and the Copy button can't drift apart.
//   [data-nora-prompt="<path>.txt"]  is filled with that file's text.
//   [data-nora-copy="<path>.txt"]    a real button: copies the same text, and
//                                    says so for a moment.
//   [data-nora-sections]             on a prompt too long to show at once: it's
//                                    cut at its headings (lines in capitals)
//                                    into one folded document: every section's
//                                    name stays in the box, and one section is
//                                    open per beat of its slide (read from the
//                                    URL as the scenes do). Copy still copies
//                                    the whole prompt. A value
//                                    (data-nora-sections="Structure") names
//                                    the text before the first heading and
//                                    makes it a section of its own.
//   [data-nora-marks="a|b|c"]       on a prompt: the first time each phrase
//                                    appears, it's set in accent.
//   [data-nora-note="stage2"]       a line of text: the chosen tool's note of
//                                    that name (js/nora/tool.js), empty in Neutral.
// The tool switch: from the slide where a tool is picked (the one with the
// builder scene) to the end of its section, a button in the footer, left, names the
// chosen tool; it opens a list of all five, and picking one changes every note
// at once. It's in the display's top layer ([data-top]) so the open list
// covers what's under it.
//   [data-nora-auto="0:1200"]        on a slide: arriving on that beat going
//                                    forward, the talk steps on by itself after
//                                    that many ms. The stage slides use it so
//                                    the title pours in first and the prompt
//                                    (data-enter="1") opens after it, without
//                                    a press. Going back, each is its own press.
// A kit file may start with a line for the person ("Attach before sending:
// ..."); that line isn't part of the prompt, so it's neither shown nor copied.
import { TOOLS, tool, setTool } from "./tool.js";
import { viewer } from "../viewer.js";

const COPIED_MS = 1500;
const texts = new Map(); // path -> Promise<string>
const load = (path) => {
  if (!texts.has(path)) texts.set(path, fetch(path).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${path}: ${r.status}`)))).then((t) => t.replace(/^Attach before sending:.*\n+/, "").trim()));
  return texts.get(path);
};

const stepped = []; // prompts shown a section at a time
for (const el of document.querySelectorAll("[data-nora-prompt]")) {
  const marks = (el.dataset.noraMarks ?? "").split("|").filter(Boolean);
  if (el.dataset.noraSections != null) {
    load(el.dataset.noraPrompt).then((text) => stepped.push(sectioned(el, text, marks))).catch((err) => { el.textContent = "(the prompt didn't load)"; console.error("[nora kit]", err); });
    continue;
  }
  load(el.dataset.noraPrompt).then((text) => { el.replaceChildren(...marked(text, (el.dataset.noraMarks ?? "").split("|").filter(Boolean))); window.dispatchEvent(new Event("lab:layout")); })
    .catch((err) => { el.textContent = "(the prompt didn't load)"; console.error("[nora kit]", err); });
}
// A prompt cut at its headings and shown as one folded document: every
// section's name stays in the box, in order, and only the section showing is
// open under its name, the name in accent. Changing section closes the open
// one, then opens the next (200 each, as Max's file tree swaps folders), so
// the old text has gone before the new arrives. Text before the first heading
// stays with the first section, unless the element names it (then it's a
// section of its own).
const SWAP_MS = 200;
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function sectioned(el, text, marks) {
  const lead = el.dataset.noraSections, parts = lead ? [{ title: lead, lines: [], lead: true }] : [];
  for (const line of text.split("\n")) {
    const heading = /^[A-Z][A-Z ]+(\(.*\))?$/.test(line.trim());
    if (heading && !(parts.length === 1 && !parts[0].title && !parts[0].lead)) parts.push({ title: "", lines: [] });
    if (!parts.length) parts.push({ title: "", lines: [] });
    const part = parts[parts.length - 1];
    if (heading && !part.title) { part.title = line.trim().replace(/\s*\(.*\)$/, "").toLowerCase().replace(/^./, (c) => c.toUpperCase()); continue; } // its name is the fold's head
    part.lines.push(line);
  }
  const slide = el.closest("[data-slide]"), panel = el.closest("[data-panel]");
  const folds = parts.map((p, i) => {
    const fold = document.createElement("span"), head = document.createElement("span"), body = document.createElement("span");
    fold.className = "nora-fold"; head.className = "nora-fold-head"; body.className = "nora-fold-body";
    head.textContent = `${i + 1} / ${parts.length} · ${p.title}`;
    body.setAttribute("data-clip", "");
    body.append(...marked(p.lines.join("\n").trim(), marks));
    body.style.height = "0px";
    fold.append(head, body);
    return { head, body };
  });
  el.replaceChildren(...folds.map((f) => f.head.parentElement));
  const state = { folds, shown: -1, run: 0, offset: Number(el.closest(".artefact")?.dataset.enter) || 0, tab: panel?.dataset.panel ?? "", number: [...(panel?.querySelectorAll("[data-slide]") ?? [])].indexOf(slide) + 1 };
  show(state, 0, false);
  return state;
}
function show(state, i, animate = true) {
  i = Math.max(0, Math.min(state.folds.length - 1, i));
  if (i === state.shown) return;
  const from = state.folds[state.shown], to = state.folds[i], run = ++state.run;
  state.shown = i;
  state.folds.forEach((f, k) => { if (k === i) f.head.dataset.ink = "accent"; else delete f.head.dataset.ink; });
  const settle = () => { for (const f of state.folds) f.body.style.height = f === to ? "" : "0px"; relayout(); };
  if (!animate || !viewer.get().motion) { settle(); return; }
  // Close the open one, then open the new one, each over SWAP_MS.
  const closeFrom = from ? from.body.getBoundingClientRect().height : 0, t0 = performance.now();
  (function step(now) {
    if (run !== state.run) return; // another change took over
    const t = now - t0;
    if (from && t < SWAP_MS) from.body.style.height = `${closeFrom * (1 - easeInOut(t / SWAP_MS))}px`;
    else {
      if (from) from.body.style.height = "0px";
      const p = Math.min(1, (t - (from ? SWAP_MS : 0)) / SWAP_MS);
      if (p >= 1) { settle(); return; }
      to.body.style.height = `${to.body.scrollHeight * easeInOut(Math.max(0, p))}px`;
    }
    relayout();
    requestAnimationFrame(step);
  })(t0);
}

// The text as nodes, with the first occurrence of each phrase in an accent span.
function marked(text, phrases) {
  const cuts = phrases.map((p) => [text.toLowerCase().indexOf(p.toLowerCase()), p.length]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0]);
  const out = [];
  let at = 0;
  for (const [i, len] of cuts) {
    if (i < at) continue; // overlaps the one before
    out.push(text.slice(at, i));
    const span = document.createElement("span");
    span.dataset.ink = "accent";
    span.textContent = text.slice(i, i + len);
    out.push(span);
    at = i + len;
  }
  out.push(text.slice(at));
  return out;
}

function relayout() { window.dispatchEvent(new Event("lab:layout")); }

const switchBar = (() => {
  const pick = document.querySelector('[data-nora-scene="builder"]'), panel = pick?.closest("[data-panel]"), host = panel?.querySelector(".slides");
  if (!host) return null;
  const make = (label) => {
    const b = document.createElement("button"), s = document.createElement("span");
    b.type = "button"; b.className = "site-bar-button nora-button";
    b.setAttribute("data-fill", ""); b.setAttribute("data-box", ""); b.dataset.ink = "ink"; // not the plate's ground
    s.textContent = label; b.append(s);
    return b;
  };
  const bar = document.createElement("div"), list = document.createElement("div"), main = make("");
  bar.className = "nora-toolbar"; bar.setAttribute("data-top", ""); bar.hidden = true;
  list.className = "nora-toolbar-list"; list.setAttribute("data-fill", ""); list.dataset.ink = "ground"; list.hidden = true;
  const items = TOOLS.map((t) => { const b = make(t.name); b.addEventListener("click", () => { setTool(t.id); list.hidden = true; relayout(); }); list.append(b); return [t.id, b]; });
  main.addEventListener("click", () => { list.hidden = !list.hidden; relayout(); });
  bar.append(list, main); host.append(bar);
  return {
    bar, tab: panel.dataset.panel, from: [...panel.querySelectorAll("[data-slide]")].indexOf(pick.closest("[data-slide]")) + 1,
    // ...to the last slide of the picking slide's section (the task).
    to: [...panel.querySelectorAll("[data-slide]")].indexOf([...pick.closest("[data-section]").querySelectorAll("[data-slide]")].at(-1)) + 1,
    sync() { main.firstChild.textContent = `Tool: ${tool().name}`; for (const [id, b] of items) b.setAttribute("aria-pressed", String(id === tool().id)); },
    close() { list.hidden = true; },
  };
})();

const notes = () => {
  switchBar?.sync();
  const t = tool();
  for (const el of document.querySelectorAll("[data-nora-note]")) el.textContent = t[el.dataset.noraNote] ? `${t.name}: ${t[el.dataset.noraNote]}` : "";
  relayout();
};
notes();
window.addEventListener("nora:tool", notes);

for (const button of document.querySelectorAll("[data-nora-copy]")) {
  const label = button.querySelector("span") ?? button, idle = label.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(await load(button.dataset.noraCopy));
      label.textContent = "Copied";
    } catch (err) { label.textContent = "Couldn't copy"; console.error("[nora kit]", err); }
    relayout();
    setTimeout(() => { label.textContent = idle; relayout(); }, COPIED_MS);
  });
}

// Steps the talk on once the slide's first sentence has poured in (a sentence
// still in the sink is visibility: hidden, js/genie-play.js), plus `ms`. The
// URL changes when a slide change starts, long before its text arrives, so a
// plain timer would fire too early. Gives up if the talk has moved meanwhile.
function stepAfterTitle(slide, hash, ms) {
  const title = slide.querySelector(".slide-statement > [data-genie]");
  let seen = null;
  (function wait(now) {
    if (location.hash !== hash) return;
    const up = !slide.hidden && title && getComputedStyle(title).visibility !== "hidden";
    if (!up) seen = null; else seen ??= now;
    if (seen != null && now - seen >= ms) { document.querySelector('.site-step[data-step="1"]')?.click(); return; }
    requestAnimationFrame(wait);
  })(performance.now());
}

// The beat, from the URL (#foundations/11.3 is slide 11, third beat).
// What sits round a prompt's box (its section names, its buttons, its tool
// note) shows only once the box is open: js/slides.js opens a frame with
// inline --open and --wipe, and clears them when it's done.
const prompts = [...document.querySelectorAll(".nora-prompt")].map((art) => ({ art, field: art.querySelector(".prompt-field"), around: [...art.querySelectorAll(".nora-actions, .nora-note")] }));
function syncPrompts() {
  let changed = false;
  for (const { art, field, around } of prompts) {
    const open = !art.hidden && !field.style.getPropertyValue("--open") && !field.style.getPropertyValue("--wipe");
    for (const el of around) if (el.hidden === open) { el.hidden = !open; changed = true; }
  }
  if (changed) relayout();
}

let lastHash = null, last = null;
(function follow() {
  syncPrompts();
  if (location.hash !== lastHash) {
    lastHash = location.hash;
    const [tab, rest] = lastHash.slice(1).split("/"), [slide, beat] = (rest ?? "1").split(".").map(Number);
    const at = { tab, slide: slide || 1, beat: Math.max(0, (beat || 1) - 1) };
    for (const st of stepped) if (st.tab === at.tab && st.number === at.slide) show(st, at.beat - st.offset);
    // Auto beats: only on the way forward.
    const forward = !last || last.tab !== at.tab || at.slide > last.slide || (at.slide === last.slide && at.beat > last.beat);
    last = at;
    const el = document.querySelector(`[data-panel="${CSS.escape(at.tab)}"]`)?.querySelectorAll("[data-slide]")[at.slide - 1];
    // Only slides that ask for it: an empty attribute must not read as "beat 0".
    const auto = (el?.dataset.noraAuto ?? "").split(",").filter(Boolean).map((x) => x.split(":").map(Number)).find(([b]) => b === at.beat);
    if (forward && auto) stepAfterTitle(el, lastHash, auto[1] || 0);
    if (switchBar) { // shown from the picking slide on; it closes when the talk moves
      const on = tab === switchBar.tab && (slide || 1) >= switchBar.from && (slide || 1) <= switchBar.to;
      if (switchBar.bar.hidden === on) switchBar.bar.hidden = !on;
      switchBar.close();
      relayout();
    }
  }
  requestAnimationFrame(follow);
})();
