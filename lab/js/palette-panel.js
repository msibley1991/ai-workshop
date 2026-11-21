// The "Palette" dial panel (pages with data-viewer): edits the active palette's
// ground, ink, accent, link and ghost-trail colours live (light or dark mode follows
// the ground, see modeOf in viewer.js), and "Save palettes"
// writes every palette to presets/palettes.json (needs serve.py). Edits that
// aren't saved last until reload.
//
// The active palette is written into the effects dials (theme + phosphor
// persistence colours), after the page's pinned preset has loaded.
import { createDialKit } from "../vendor/dialkit/index.js";
import { viewer, PALETTES, palettesReady, paletteValues } from "./viewer.js";
import { savePreset } from "./params.js";
import { toast } from "./panel.js";

const FIELDS = ["ground", "ink", "accent", "link", "ghost1", "ghost2", "ghost3"];

export function createPalettePanel(effectsKit) {
  const active = () => viewer.get().palette;
  const config = {
    ...Object.fromEntries(FIELDS.map((f) => [f, PALETTES.ink[f]])),
    save: { type: "action", label: "Save palettes" },
  };

  let syncing = false; // true while the panel is being set from a palette
  const kit = createDialKit("Palette", config, {
    id: "lab-palette",
    onAction: async (path) => {
      if (path !== "save") return;
      try {
        await savePreset("palettes", PALETTES);
        toast("Saved palettes");
      } catch (err) {
        console.error("[lab]", err);
        toast(err.message, true);
      }
    },
  });

  function showPalette() {
    const p = PALETTES[active()] ?? PALETTES.ink;
    syncing = true;
    kit.setValues({ ...Object.fromEntries(FIELDS.map((f) => [f, p[f]])) });
    syncing = false;
    effectsKit.setValues(paletteValues(active()));
  }

  // Panel edits go into the active palette, then on to the effects dials.
  kit.subscribe((v) => {
    if (syncing) return;
    const p = PALETTES[active()];
    if (!p) return;
    for (const f of FIELDS) p[f] = v[f];
    effectsKit.setValues(paletteValues(active()));
  }, false);

  Promise.all([palettesReady, effectsKit.ready]).then(showPalette);
  viewer.subscribe((state, patch) => { if ("palette" in patch) showPalette(); });
  return kit;
}
