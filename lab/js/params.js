// Every tunable value lives here. Slider tuples are [default, min, max, step?].
// The panel (js/panel.js) renders this config; the renderer only reads values.
//
// Two menus use it:
// - "Render" (pages with <body data-render>: layout, genie, type, hierarchy):
//   renderConfig only. Shared by every page, saved to presets/render.json.
//   Colours aren't dials there: they come from the active palette
//   (presets/palettes.json, js/viewer.js).
// - "Effects Lab" on the old specimen (index.html): config, which adds the
//   theme, ghost colours, type and 3D object dials it still uses.

const typeLevel = (size, lineHeight) => ({
  size: [size, 8, 160, 1],
  lineHeight: [lineHeight, 0.8, 2.2, 0.05],
});

export const renderConfig = {
  resolution: {
    pixelScale: [3, 1, 10, 1],   // CSS px per emulated pixel
    hardText: [0.4, 0, 1],       // 0 = antialiased, 1 = thresholded 1-bit edges
  },
  glow: {
    intensity: [0.7, 0, 3],
    radius: [1.5, 0, 6],
    tintToPhosphor: [0.3, 0, 1],
  },
  ghost: {
    decay: [0.55, 0, 0.98],      // persistence while still
    scrollGain: [0.35, 0, 1],    // extra persistence while scrolling fast
    blur: [0, 0, 3, 0.05],       // trail spread per frame, in emulated pixels (compounds as trails age)
  },
  grid: {
    mode: { type: "select", options: ["scanlines", "pixel grid", "off"], default: "scanlines" },
    opacity: [0.18, 0, 1],
    pitch: [1, 1, 8, 1],         // in emulated pixels
    snapScroll: true,
  },
  phosphor: {
    // Ghost colours (persistenceColor 1-3) are the palette's ghost 1-3; the
    // specimen adds them as dials (specimenColors below).
    layers: [1, 1, 3, 1],        // how many persistence colors to step through
    // blend: colors drift in by shift while the ghost fades. bands: each layer
    // switches in at full strength and holds brightness; only the last one fades.
    layerMode: { type: "select", options: ["blend", "bands"], default: "blend" },
    layerFrames: [2, 0.5, 30, 0.5], // frames a ghost spends on each layer before the next
    shift: [0.35, 0, 1],
    jitter: [0, 0, 3],           // horizontal row wobble, in emulated pixels
    flicker: [0.02, 0, 0.3],
  },
  // Rolling wave (CRT / tape tracking): a band that shears rows sideways as it
  // rolls from the top of the screen to the bottom. Scanlines stay put.
  warp: {
    strength: [0, 0, 40, 0.5],   // how far the band pushes rows, in emulated pixels (0 = off)
    size: [0.15, 0.02, 1, 0.01], // band height, as a fraction of the screen height
    frequency: [6, 0, 30, 0.5],  // waves per minute
    speed: [2.5, 0.5, 10, 0.1],  // seconds for a wave to roll top to bottom
    randomness: [0.3, 0, 1],     // 0 = identical, evenly spaced waves; more varies timing, size, strength and adds a ragged edge
  },
  outline: {
    width: [4, 1, 16, 1],        // CSS px; sets --line (layout.html bars and tab outlines)
  },
};

// Ghost colours: ghosts drift toward these as they fade (layer 1, then 2, then
// 3, the faintest tail). Dials on the specimen only.
const specimenColors = {
  persistenceColor: "#F38020",
  persistenceColor2: "#F3C020",
  persistenceColor3: "#8A1A00",
};

export const config = {
  ...renderConfig,
  phosphor: { ...specimenColors, ...renderConfig.phosphor },
  theme: {
    mode: { type: "select", options: ["light", "dark"], default: "light" },
    // link: inline link text (viewer pages set it from the palette).
    light: { ground: "#F4F4F0", phosphor: "#0050FF", accent: "#F38020", link: "#0050FF", _collapsed: true },
    dark: { ground: "#0A0C10", phosphor: "#3D7BFF", accent: "#F38020", link: "#F3C020", _collapsed: true },
  },
  type: {
    family: {
      type: "select",
      options: ["JetBrains Mono", "IBM Plex Mono", "VT323", "Inter"],
      default: "JetBrains Mono",
    },
    h1: typeLevel(48, 1.1),
    h2: typeLevel(32, 1.2),
    h3: typeLevel(24, 1.3),
    body: typeLevel(20, 1.5),
    small: typeLevel(14, 1.4),
    gap: [24, 4, 80, 1],
    _collapsed: true,
  },
  object: {
    style: { type: "select", options: ["edges", "edges + faces"], default: "edges + faces" },
    spin: [0.3, 0, 2],
    _collapsed: true,
  },
  presets: {
    // The specimen can load the shared render settings, and export or import
    // its own values as a file. It doesn't save to render.json.
    load: { type: "action", label: "Load render settings" },
    exportJSON: { type: "action", label: "Export JSON" },
    importJSON: { type: "action", label: "Import JSON" },
  },
};

// Default values of a config: slider tuples give their first entry, selects
// their default; actions and _keys are skipped.
export function defaultsOf(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (k.startsWith("_")) continue;
    if (Array.isArray(v)) out[k] = v[0];
    else if (v && typeof v === "object") {
      if (v.type === "action") continue;
      out[k] = v.type === "select" ? v.default : defaultsOf(v);
    } else out[k] = v;
  }
  return out;
}

// Named presets live as JSON in presets/ so they can be versioned and diffed.
export async function loadPreset(name) {
  const res = await fetch(`presets/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Preset ${name} not found`);
  return res.json();
}

// Overwrites presets/<name>.json with the current values. Needs serve.py (the
// plain `python3 -m http.server` can't write files).
export async function savePreset(name, values) {
  const res = await fetch(`presets/${name}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error(res.status === 501 ? "Saving needs serve.py (python3 serve.py)" : `Save failed (${res.status})`);
}

export function exportJSON(values) {
  const blob = new Blob([JSON.stringify(values, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `lab-preset-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importJSON() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? JSON.parse(await file.text()) : null);
    };
    input.click();
  });
}
