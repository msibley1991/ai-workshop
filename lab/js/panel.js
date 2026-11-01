import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { config, loadPreset, exportJSON, importJSON } from "./params.js";

// Strips action entries so exported/imported values only contain real settings.
function settingsOnly(values) {
  const { presets, ...rest } = values;
  return rest;
}

export function createPanel(onChange) {
  createDialRoot({ position: "top-right", theme: "dark", versions: "menu" });

  const kit = createDialKit("Effects Lab", config, {
    id: "effects-lab",
    persist: true,
    onAction: async (path) => {
      try {
        if (path === "presets.load") kit.setValues(await loadPreset(kit.getValues().presets.file));
        if (path === "presets.exportJSON") exportJSON(settingsOnly(kit.getValues()));
        if (path === "presets.importJSON") {
          const values = await importJSON();
          if (values) kit.setValues(values);
        }
      } catch (err) {
        console.error("[lab]", err);
      }
    },
  });

  kit.subscribe((values) => onChange(settingsOnly(values)));
  return kit;
}
