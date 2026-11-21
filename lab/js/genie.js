// genie.html only: the "Genie" dial panel, the curvature graphs and the keys.
// → (or l, which toggles) genies the open panel's text block into the panel's
// bottom-right corner, ← pours it back out, g shows or hides the graph editor
// (js/genie-graphs.js). The warp is js/genie-warp.js; the rules are in
// docs/design-system/motion.md. The other dial panels start collapsed.
import { createDialKit, DialStore } from "../vendor/dialkit/index.js";
import { settings, play, genieT, totalFor, lineT, lineCount } from "./genie-warp.js";
import { mountGraphs } from "./genie-graphs.js";
import { viewer } from "./viewer.js";

const S = settings;
const config = {
  timing: {
    duration: [S.duration, 100, 4000, 50],   // ms per line
    follow: [S.follow, -1, 1, 0.05],         // -1 together, 0 one after another, 1 pause of a duration
    curve: { type: "select", options: ["ease", "out"], default: S.curve },
    slideStart: [S.slideStart, 0, 0.9, 0.01],   // when, in a row's time, the slide begins
  },
  funnel: {
    p25: [S.p25, 0, 1.2, 0.01],              // edge profile: sides narrowed at 25 / 50 / 75% of the way down
    p50: [S.p50, 0, 1.2, 0.01],
    p75: [S.p75, 0, 1.2, 0.01],
    slit: [S.slit, 0, 1, 0.01],
    rowBand: [S.rowBand, 1, 8, 1],
    sinkWidth: [S.sinkWidth, 8, 256, 8],      // units, at the panel's corner
  },
  spine: {
    arc: [S.arc, -240, 240, 4],              // maximum swing, units (scaled by the arc graph)
    bends: [S.bends, 1, 4, 1],
    severity: [S.severity, 0, 1, 0.01],      // 0 rounded .. 1 kinked
  },
  trail: {
    trailBoost: [S.trailBoost, 0, 0.4, 0.01],
  },
  inspect: {
    hold: false,
    scrub: [0, 0, 1, 0.01],                  // fraction of the whole run
  },
  actions: {
    out: { type: "action", label: "Genie out (→ or l)" },
    in: { type: "action", label: "Genie in (← or l)" },
    copy: { type: "action", label: "Copy values (with graphs)" },
    graphs: { type: "action", label: "Show / hide graphs (g)" },
  },
};

const site = document.getElementById("content");
const blocks = [...site.querySelectorAll("[data-genie]")];

// The text block of the panel that's open (its accordion weight is over half).
function openBlock() {
  return blocks.find((el) => parseFloat(el.closest(".site-panel")?.style.getPropertyValue("--w") || "0") > 0.5) ?? null;
}

// Moves the open block out (1), in (0), or toggles it. Motion off cuts.
// Genied-out text is hidden from selection and find; it's shown again as it
// starts back.
const timers = new Map();
function genie(to) {
  const el = openBlock();
  if (!el) return;
  if (to === "toggle") to = genieT(el) < 0.5 ? 1 : 0;
  const motion = viewer.get().motion;
  const dur = S.duration;
  if (!motion) S.duration = 0;
  play(el, to);
  S.duration = dur;
  clearTimeout(timers.get(el));
  if (to === 0) el.style.visibility = "";
  else timers.set(el, setTimeout(() => { if (genieT(el) >= 1) el.style.visibility = "hidden"; }, motion ? totalFor(el) : 0));
}

const KEYS = ["duration", "follow", "curve", "slideStart", "p25", "p50", "p75", "slit", "rowBand", "sinkWidth", "arc", "bends", "severity", "trailBoost"];
const flat = (v) => ({ ...v.timing, ...v.funnel, ...v.spine, ...v.trail, ...v.inspect });
const valuesText = (v) => { const f = flat(v); return JSON.stringify({ ...Object.fromEntries(KEYS.map((k) => [k, f[k]])), graphs: S.graphs }); };

// The graph editor's playhead: the time of the first line that's moving (or
// held), so you can see where along the graphs a frame is.
const graphs = mountGraphs({
  playhead() {
    const el = openBlock();
    if (!el) return null;
    const t = genieT(el), n = lineCount(el);
    if (S.hold) return lineT(t, 0, n);
    for (let i = 0; i < n; i++) { const lt = lineT(t, i, n); if (lt > 0 && lt < 1) return lt; }
    return null;
  },
});

const kit = createDialKit("Genie", config, {
  id: "lab-genie",
  persist: true,
  onAction: async (path) => {
    if (path === "actions.out") genie(1);
    if (path === "actions.in") genie(0);
    if (path === "actions.graphs") graphs.toggle();
    if (path === "actions.copy") {
      try { await navigator.clipboard.writeText(valuesText(kit.getValues())); } catch (err) { console.error("[lab]", err); }
    }
  },
});

kit.subscribe((v) => {
  const f = flat(v);
  for (const k of [...KEYS, "hold", "scrub"]) S[k] = f[k];
});

// ← → and l step the genie, g toggles the graphs. Capture phase, so layout.js
// doesn't also step the graphics.
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const to = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? 0 : k === "l" ? "toggle" : k === "g" ? "graphs" : null;
  if (to === null || e.altKey || e.ctrlKey || e.metaKey) return;
  if (!site.contains(e.target) && e.target !== document.body) return; // leave the dial panels alone
  e.preventDefault();
  e.stopPropagation();
  if (to === "graphs") graphs.toggle();
  else genie(to);
}, { capture: true });

// Only the Genie panel starts open: collapse the Effects Lab and Palette panels
// (created by main.js, which runs first).
setTimeout(() => {
  for (const id of [document.body.dataset.panelId, "lab-palette"]) DialStore.setPanelOpen(id, false);
});

// Opens on the first section, where the body text is longest.
if (!location.hash) location.hash = "#foundations";
