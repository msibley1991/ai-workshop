import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { config, loadPreset, savePreset, exportJSON, importJSON } from "./params.js";

// Strips action entries so exported/imported values only contain real settings.
function settingsOnly(values) {
  const { presets, ...rest } = values;
  return rest;
}

// Brief status message under the panel (e.g. "Saved to light").
function toast(text, isError = false) {
  const el = document.createElement("div");
  el.className = "lab-toast" + (isError ? " is-error" : "");
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

// id: localStorage key for saved dial values. preset: loaded on every page load.
export function createPanel(onChange, { id = "effects-lab", preset } = {}) {
  createDialRoot({ position: "top-right", theme: "dark", versions: "menu" });

  const kit = createDialKit("Effects Lab", config, {
    id,
    persist: true,
    onAction: async (path) => {
      try {
        if (path === "presets.load") kit.setValues(await loadPreset(kit.getValues().presets.file));
        if (path === "presets.save") {
          const name = kit.getValues().presets.file;
          await savePreset(name, settingsOnly(kit.getValues()));
          toast(`Saved to ${name}`);
        }
        if (path === "presets.exportJSON") exportJSON(settingsOnly(kit.getValues()));
        if (path === "presets.importJSON") {
          const values = await importJSON();
          if (values) kit.setValues(values);
        }
      } catch (err) {
        console.error("[lab]", err);
        toast(err.message, true);
      }
    },
  });

  kit.subscribe((values) => onChange(settingsOnly(values)));
  if (preset) loadPreset(preset).then((values) => kit.setValues(values)).catch((err) => console.error("[lab]", err));
  return kit;
}
