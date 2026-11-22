import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { config, renderConfig, loadPreset, savePreset, exportJSON, importJSON } from "./params.js";

// Strips action entries so exported/imported values only contain real settings.
function settingsOnly(values) {
  const { presets, ...rest } = values;
  return rest;
}

// Brief status message under the panel (e.g. "Saved to light").
export function toast(text, isError = false) {
  const el = document.createElement("div");
  el.className = "lab-toast" + (isError ? " is-error" : "");
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

// render: the shared "Render" menu (pages with <body data-render>). It shows
// only the render dials, keeps nothing in localStorage, and loads
// presets/render.json on every page load; "Save" writes that file (needs
// serve.py) and "Revert" reloads it, so every page shares one look.
// Otherwise the specimen's "Effects Lab" panel (all of config, remembered in
// localStorage under id).
export function createPanel(onChange, { render = false, id = "effects-lab" } = {}) {
  createDialRoot({ position: "top-right", theme: "dark", versions: "menu" });
  return render ? renderPanel(onChange) : specimenPanel(onChange, id);
}

const RENDER_FILE = "render";

function renderPanel(onChange) {
  const cfg = {
    ...renderConfig,
    save: { type: "action", label: "Save render settings" },
    revert: { type: "action", label: "Revert to saved" },
  };
  const strip = ({ save, revert, ...rest }) => rest;
  const kit = createDialKit("Render", cfg, {
    id: "lab-render",
    persist: false,
    onAction: async (path) => {
      try {
        if (path === "save") {
          await savePreset(RENDER_FILE, strip(kit.getValues()));
          toast("Saved render settings");
        }
        if (path === "revert") {
          kit.setValues(await loadPreset(RENDER_FILE));
          toast("Reverted to saved");
        }
      } catch (err) {
        console.error("[lab]", err);
        toast(err.message, true);
      }
    },
  });
  kit.subscribe((values) => onChange(strip(values)));
  kit.ready = loadPreset(RENDER_FILE).then((values) => kit.setValues(values)).catch((err) => console.error("[lab]", err));
  return kit;
}

function specimenPanel(onChange, id) {
  const kit = createDialKit("Effects Lab", config, {
    id,
    persist: true,
    onAction: async (path) => {
      try {
        if (path === "presets.load") kit.setValues(await loadPreset(RENDER_FILE));
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
  kit.ready = Promise.resolve();
  return kit;
}
