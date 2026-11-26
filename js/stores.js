// The tools' settings stores (js/settings.js): genie, shading and type. Each
// starts from the code's defaults, loads presets/<name>.json, and puts the
// saved look plus the viewer's own changes into effect on every display page.
// The palettes' effects are the fourth tool, kept per palette in js/viewer.js.
import { createStore } from "./settings.js";
import { settings } from "./genie-warp.js";
import { ISO_STYLE, bumpStyle } from "./shade.js";

const layoutChanged = () => window.dispatchEvent(new Event("lab:layout"));

// Genie: the settings keys (motion.md), into the live `settings` object that
// genie-warp.js reads. freeze, scrub and graphsRev are the test page's.
const GENIE_KEYS = ["lineTime", "lineGap", "easing", "slideStart", "narrowAt25", "narrowAt50", "narrowAt75", "smear", "rowHeight", "swing", "bends", "sharpness", "trailBoost", "graphs"];
export const genieStore = createStore(
  "genie",
  Object.fromEntries(GENIE_KEYS.map((k) => [k, structuredClone(settings[k])])),
  (v) => {
    const graphs = JSON.stringify(settings.graphs) !== JSON.stringify(v.graphs);
    Object.assign(settings, structuredClone(v));
    if (graphs) settings.graphsRev++;
  },
);

// Shading: ISO_STYLE's keys (shade.js), written into ISO_STYLE in place, then
// bumpStyle() so graphics and hatch tiles repaint. `dither` is for the dither
// styles (technique "dither"), not drawn yet.
export const shadingStore = createStore(
  "shading",
  { ...structuredClone(ISO_STYLE), dither: { pattern: "bayer 4x4", cellSize: 1, steps: 6 } },
  (v) => {
    for (const [k, val] of Object.entries(structuredClone(v))) {
      if (val && typeof val === "object" && ISO_STYLE[k] && typeof ISO_STYLE[k] === "object") Object.assign(ISO_STYLE[k], val);
      else ISO_STYLE[k] = val;
    }
    bumpStyle();
  },
);

// Type: the size of each role the playground offers, in units on the spacing
// scale. Line-heights follow the role (typography.md): display's equals its
// size, the rest run 8 more. "Statement large" (Text slides, 64/72) stays one
// step above the statement. Set as the --type-* tokens css/site.css reads.
export const TYPE_SCALE = [16, 24, 32, 48, 64, 96, 128];
const stepUp = (size) => TYPE_SCALE[Math.min(TYPE_SCALE.length - 1, TYPE_SCALE.indexOf(size) + 1)] ?? size;
export const typeStore = createStore(
  "type",
  { display: 128, statement: 48, body: 32, label: 24 },
  (v) => {
    const root = document.documentElement.style;
    const set = (role, size, lh) => {
      root.setProperty(`--type-${role}-size`, `calc(${size} * var(--u))`);
      root.setProperty(`--type-${role}-lh`, `calc(${lh} * var(--u))`);
    };
    set("display", v.display, v.display);
    set("statement", v.statement, v.statement + 8);
    const large = stepUp(v.statement);
    set("statement-large", large, large + 8);
    set("body", v.body, v.body + 8);
    set("label", v.label, v.label + 8);
    layoutChanged();
    window.dispatchEvent(new Event("site:type")); // layout.js re-lays the slides out
  },
);
