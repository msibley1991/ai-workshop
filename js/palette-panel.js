// The "Palette" dial panel (display pages, <body data-display>): edits the
// active palette live, its colours (ground, ink, accent, link and trail 1-3;
// light or dark mode follows the ground, see modeOf in viewer.js) and its
// effects (Pixels' sharpText, Glow, Trails, Lines, Noise, Warp:
// paletteDisplayConfig, kept in the palette's `display` block). The shared
// Display menu has only pixel size and line weight. "Save palette" writes just
// the active palette into presets/palettes.json (needs serve.py); the others
// stay as saved. Unsaved edits last until reload.
import { createDialKit } from "../vendor/dialkit/index.js";
import { viewer, PALETTES, palettesReady, paletteDisplay } from "./viewer.js";
import { loadPreset, savePreset, paletteDisplayConfig } from "./params.js";
import { toast } from "./panel.js";

const FIELDS = ["ground", "ink", "accent", "link", "trail1", "trail2", "trail3"];

// onEdit: called after the active palette changes, to recolour the render.
export function createPalettePanel(onEdit) {
  const active = () => viewer.get().palette;
  const config = {
    colours: Object.fromEntries(FIELDS.map((f) => [f, PALETTES.ink[f]])),
    ...paletteDisplayConfig,
    save: { type: "action", label: "Save palette" },
  };
  const GROUPS = Object.keys(paletteDisplayConfig);

  let syncing = false; // true while the panel is being set from a palette
  const kit = createDialKit("Palette", config, {
    id: "lab-palette",
    onAction: async (path) => {
      if (path !== "save") return;
      const id = active(), name = PALETTES[id]?.name ?? id;
      try {
        const saved = await loadPreset("palettes");
        saved[id] = { ...PALETTES[id] };
        await savePreset("palettes", saved);
        toast(`Saved ${name}`);
      } catch (err) {
        console.error("[lab]", err);
        toast(err.message, true);
      }
    },
  });

  function showPalette() {
    const p = PALETTES[active()] ?? PALETTES.ink;
    syncing = true;
    kit.setValues({ colours: Object.fromEntries(FIELDS.map((f) => [f, p[f]])), ...paletteDisplay(p) });
    syncing = false;
  }

  // Panel edits go into the active palette, then recolour the render.
  kit.subscribe((v) => {
    if (syncing) return;
    const p = PALETTES[active()];
    if (!p) return;
    for (const f of FIELDS) p[f] = v.colours[f];
    p.display = Object.fromEntries(GROUPS.map((g) => [g, { ...v[g] }]));
    onEdit();
  }, false);

  palettesReady.then(showPalette);
  viewer.subscribe((state, patch) => { if ("palette" in patch) showPalette(); });
  return kit;
}
