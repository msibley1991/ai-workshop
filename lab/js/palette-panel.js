// The "Palette" dial panel (render pages, <body data-render>): edits the active
// palette's ground, ink, accent, link and ghost-trail colours live (light or
// dark mode follows the ground, see modeOf in viewer.js). These are the only
// colour dials: the Render menu has none. "Save palette" writes just the
// active palette into presets/palettes.json (needs serve.py); the others stay
// as saved. Unsaved edits last until reload.
import { createDialKit } from "../vendor/dialkit/index.js";
import { viewer, PALETTES, palettesReady } from "./viewer.js";
import { loadPreset, savePreset } from "./params.js";
import { toast } from "./panel.js";

const FIELDS = ["ground", "ink", "accent", "link", "ghost1", "ghost2", "ghost3"];

// onEdit: called after the active palette changes, to recolour the render.
export function createPalettePanel(onEdit) {
  const active = () => viewer.get().palette;
  const config = {
    ...Object.fromEntries(FIELDS.map((f) => [f, PALETTES.ink[f]])),
    save: { type: "action", label: "Save palette" },
  };

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
    kit.setValues({ ...Object.fromEntries(FIELDS.map((f) => [f, p[f]])) });
    syncing = false;
  }

  // Panel edits go into the active palette, then recolour the render.
  kit.subscribe((v) => {
    if (syncing) return;
    const p = PALETTES[active()];
    if (!p) return;
    for (const f of FIELDS) p[f] = v[f];
    onEdit();
  }, false);

  palettesReady.then(showPalette);
  viewer.subscribe((state, patch) => { if ("palette" in patch) showPalette(); });
  return kit;
}
