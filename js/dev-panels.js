// playground.html, localhost only (loaded by js/playground.js): the full dial
// panels for tuning the saved look, one per tab. They edit the same stores as
// the tabs' controls (js/stores.js), so a dial and a control always agree, and
// each panel's "Save as default" writes that tool's preset (serve.py). The
// Display tab's panel is the Palette panel that main.js already loads on
// localhost. Only the open tab's panel is expanded; the rest stay collapsed.
//
//   Genie: Timing, Shape, Swing, Trail (the settings keys, motion.md), Inspect
//          (freeze + scrub, not saved) and the curvature graph editor.
//   Shading: Style, Dither, Hatch, View, Light (ISO_STYLE's keys, graphics.md).
//   Type: each role's size on the spacing scale (line-heights follow the role).
import { createDialKit, DialStore } from "../vendor/dialkit/index.js";
import { genieStore, shadingStore, typeStore, TYPE_SCALE } from "./stores.js";
import { settings, genieT, lineT, lineCount } from "./genie-warp.js";
import { genie, openBlock } from "./genie-play.js";
import { mountGraphs } from "./genie-graphs.js";
import { DITHERS, isErrorDiffusion } from "./shade.js";
import { toast } from "./panel.js";

const getPath = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
function setPath(o, path, v) {
  const keys = path.split("."), last = keys.pop();
  let t = o;
  for (const k of keys) t = t[k] ??= {};
  t[last] = v;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const css = document.createElement("link");
css.rel = "stylesheet";
css.href = new URL("../css/genie-graphs.css", import.meta.url);
document.head.append(css);

// A dial row: [dial path, store path, spec(current value), from dial value?, to dial value?].
// The spec is built from the store's current value, as dialkit takes its defaults from the config.
function storePanel({ id, name, store, dials, extra = {}, onAction = () => {} }) {
  const values = store.get();
  const config = {};
  for (const [dial, path, spec, , toDial = (x) => x] of dials) setPath(config, dial, spec(toDial(getPath(values, path))));
  Object.assign(config, extra, { save: { type: "action", label: "Save as default" } });
  let syncing = false;
  const kit = createDialKit(name, config, {
    id,
    persist: false,
    onAction: async (path) => {
      if (path !== "save") return onAction(path);
      try {
        await store.saveDefault();
        toast(`Saved ${name.toLowerCase()} defaults`);
      } catch (err) {
        console.error("[site]", err);
        toast(err.message, true);
      }
    },
  });
  const show = () => {
    const v = store.get(), out = {};
    for (const [dial, path, , , toDial = (x) => x] of dials) setPath(out, dial, toDial(getPath(v, path)));
    syncing = true;
    kit.setValues(out);
    syncing = false;
  };
  kit.subscribe((v) => {
    if (syncing) return;
    for (const [dial, path, , fromDial = (x) => x] of dials) {
      const x = fromDial(getPath(v, dial));
      if (!same(x, getPath(store.get(), path))) store.set(path, x);
    }
  }, false);
  store.subscribe(show);
  store.ready.then(show);
  return kit;
}

const slider = (min, max, step) => (v) => [v, min, max, step];
const select = (options) => (v) => ({ type: "select", options, default: v });

// ---- Genie --------------------------------------------------------------------------
const graphs = mountGraphs({
  playhead() {
    const el = openBlock();
    if (!el) return null;
    const t = genieT(el), n = lineCount(el);
    if (settings.freeze) return lineT(t, 0, n);
    for (let i = 0; i < n; i++) { const lt = lineT(t, i, n); if (lt > 0 && lt < 1) return lt; }
    return null;
  },
});
graphs.toggle(false);

const genieKit = storePanel({
  id: "site-genie",
  name: "Genie",
  store: genieStore,
  dials: [
    ["timing.lineTime", "lineTime", slider(50, 4000, 10)],
    ["timing.lineGap", "lineGap", slider(-1, 1, 0.05)],
    ["timing.easing", "easing", select(["ease", "out"])],
    ["timing.slideStart", "slideStart", slider(0, 0.9, 0.01)],
    ["shape.narrowAt25", "narrowAt25", slider(0, 1.2, 0.01)],
    ["shape.narrowAt50", "narrowAt50", slider(0, 1.2, 0.01)],
    ["shape.narrowAt75", "narrowAt75", slider(0, 1.2, 0.01)],
    ["shape.smear", "smear", slider(0, 1, 0.01)],
    ["shape.rowHeight", "rowHeight", slider(1, 8, 1)],
    ["swing.swing", "swing", slider(-240, 240, 4)],
    ["swing.bends", "bends", slider(1, 4, 1)],
    ["swing.sharpness", "sharpness", slider(0, 1, 0.01)],
    ["trail.trailBoost", "trailBoost", slider(0, 0.4, 0.01)],
  ],
  extra: {
    inspect: { freeze: false, scrub: [0, 0, 1, 0.01] }, // not saved: a still frame to look at
    actions: {
      out: { type: "action", label: "Genie out" },
      in: { type: "action", label: "Genie in" },
      graphs: { type: "action", label: "Show / hide graphs" },
      copy: { type: "action", label: "Copy values" },
    },
  },
  async onAction(path) {
    if (path === "actions.out") genie(1);
    if (path === "actions.in") genie(0);
    if (path === "actions.graphs") graphs.toggle();
    if (path === "actions.copy") {
      try { await navigator.clipboard.writeText(JSON.stringify(genieStore.get(), null, 2)); toast("Copied genie values"); }
      catch (err) { console.error("[site]", err); }
    }
  },
});
genieKit.subscribe((v) => { settings.freeze = v.inspect.freeze; settings.scrub = v.inspect.scrub; }, false);

// ---- Shading ------------------------------------------------------------------------
// Error diffusion needs a whole-image pass and crawls while graphics move
// (playground.md), so it isn't offered.
const PATTERNS = DITHERS.filter((p) => !isErrorDiffusion(p));
storePanel({
  id: "site-shading",
  name: "Shading",
  store: shadingStore,
  dials: [
    ["style.technique", "technique", select(["hatch", "dither"])],
    ["dither.pattern", "dither.pattern", select(PATTERNS)],
    ["dither.cellSize", "dither.cellSize", slider(1, 8, 1)],
    ["dither.steps", "dither.steps", slider(2, 16, 1)],
    ["dither.lightest", "dither.lightest", slider(0, 1, 0.05)],
    ["dither.darkest", "dither.darkest", slider(0, 1, 0.05)],
    ["hatch.mode", "hatch.mode", select(["density", "coverage", "cross", "weight"])],
    ["hatch.angle", "hatch.angle", slider(0, 180, 1)],
    ["hatch.spacing", "hatch.spacing", slider(2, 32, 1)],
    ["hatch.lineWidth", "hatch.lineWidth", slider(1, 8, 1)],
    ["hatch.steps", "hatch.steps", slider(2, 8, 1)],
    ["hatch.lightest", "hatch.lightest", slider(0, 1, 0.05)],
    ["hatch.darkest", "hatch.darkest", slider(0, 1, 0.05)],
    ["hatch.solidDarkest", "hatch.solidDarkest", (v) => v],
    ["view.patternAnchor", "patternAnchor", select(["object", "screen"])],
    ["view.edges", "edges", (v) => v],
    ["view.innerEdges", "innerEdges", slider(1, 8, 1)],
    ["light.inkShows", "inkShows", select(["shadow", "light"])],
    ["light.lightAngle", "lightAngle", slider(-180, 180, 1)],
    ["light.lightHeight", "lightHeight", slider(0, 90, 1)],
  ],
});

// ---- Type ---------------------------------------------------------------------------
const SIZES = TYPE_SCALE.map(String);
storePanel({
  id: "site-type",
  name: "Type",
  store: typeStore,
  dials: ["display", "statement", "body", "label"].map((role) => [`sizes.${role}`, role, select(SIZES), Number, String]),
});

// ---- Only the open tab's panel is expanded --------------------------------------------
const PANEL_FOR = { genie: "site-genie", shading: "site-shading", type: "site-type", display: "lab-palette" };
const ALL = ["lab-display", "lab-palette", "site-genie", "site-shading", "site-type"];
let lastTab = null;
function openTab() {
  const label = document.querySelector(".site-tab-label[aria-current='true']");
  const tab = label?.closest(".site-tab")?.dataset.panel ?? null;
  if (tab === lastTab) return;
  lastTab = tab;
  for (const id of ALL) DialStore.setPanelOpen(id, id === PANEL_FOR[tab]);
  if (tab !== "genie") graphs.toggle(false);
}
// main.js collapses Display and Palette on a timeout, so this runs after it.
setTimeout(() => {
  lastTab = undefined;
  openTab();
  new MutationObserver(openTab).observe(document.getElementById("content"), { subtree: true, attributeFilter: ["aria-current"] });
}, 50);
