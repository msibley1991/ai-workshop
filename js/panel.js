import { createDialKit, createDialRoot } from "../vendor/dialkit/index.js";
import { sharedDisplayConfig, loadPreset, savePreset } from "./params.js";

// Brief status message under the panel (e.g. "Saved to light").
export function toast(text, isError = false) {
  const el = document.createElement("div");
  el.className = "lab-toast" + (isError ? " is-error" : "");
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

// The shared "Display" menu (localhost only, loaded by main.js). It shows only
// the settings every palette shares (pixel size, line weight; each palette's
// effects are in the Palette panel), keeps nothing in localStorage, and loads
// presets/display.json on every page load; "Save" writes that file (needs
// serve.py) and "Revert" reloads it, so every page shares one look.
export function createPanel(onChange) {
  createDialRoot({ position: "top-right", theme: "dark", versions: "menu" });
  return displayPanel(onChange);
}

const DISPLAY_FILE = "display";

function displayPanel(onChange) {
  const cfg = {
    ...sharedDisplayConfig,
    save: { type: "action", label: "Save display settings" },
    revert: { type: "action", label: "Revert to saved" },
  };
  const strip = ({ save, revert, ...rest }) => rest;
  const kit = createDialKit("Display", cfg, {
    id: "lab-display",
    persist: false,
    onAction: async (path) => {
      try {
        if (path === "save") {
          await savePreset(DISPLAY_FILE, strip(kit.getValues()));
          toast("Saved display settings");
        }
        if (path === "revert") {
          kit.setValues(await loadPreset(DISPLAY_FILE));
          toast("Reverted to saved");
        }
      } catch (err) {
        console.error("[lab]", err);
        toast(err.message, true);
      }
    },
  });
  kit.subscribe((values) => onChange(strip(values)));
  kit.ready = loadPreset(DISPLAY_FILE).then((values) => kit.setValues(values)).catch((err) => console.error("[lab]", err));
  return kit;
}
