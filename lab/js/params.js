// Every tunable value lives here. Slider tuples are [default, min, max, step?].
// The panel (js/panel.js) renders this config; the renderer only reads values.
// Dialkit makes each label from its key, so a key is the setting's name
// everywhere: the menu, the presets, the code and the docs
// (docs/design-system/display.md).
//
// Each palette carries its own display effects (paletteDisplayConfig): a
// palette is one look, its colours plus how it glows, trails and scans. Only
// pixel size and line weight are shared (sharedDisplayConfig).
//
// The menus that use it:
// - On pages with <body data-display> (layout, genie, type, hierarchy,
//   glossary): "Palette" (js/palette-panel.js) edits the active palette's
//   colours and paletteDisplayConfig, saved into presets/palettes.json;
//   "Display" holds sharedDisplayConfig, saved to presets/display.json.
// - "Effects Lab" on the old specimen (index.html): config, which adds the
//   theme, trail colours, type and 3D object dials it still uses.
// The defaults are the tuned look (display.md, "The look").

const typeLevel = (size, lineHeight) => ({
  size: [size, 8, 160, 1],
  lineHeight: [lineHeight, 0.8, 2.2, 0.05],
});

// The effects each palette sets (its `display` block in palettes.json).
export const paletteDisplayConfig = {
  pixels: {
    sharpText: [1, 0, 1],         // 0 = antialiased text edges, 1 = thresholded 1-bit edges
  },
  glow: {
    strength: [1, 0, 3],          // how bright the halo around ink is
    spread: [1.5, 0, 6],          // how far it reaches, in emulated pixels
    tint: [0, 0, 1],              // 0 = the glow keeps each ink's colour, 1 = it takes the main ink colour
  },
  // Trails: what's left behind where something moved, fading over frames.
  trails: {
    length: [0.9, 0, 0.98],       // how much of a trail stays each frame (0 = none)
    scrollBoost: [0, 0, 1],       // extra length while scrolling fast
    spread: [0.5, 0, 3, 0.05],    // how far a trail spreads each frame, in emulated pixels (compounds as it ages)
    // Trail colours (trail 1-3) are the palette's; the specimen adds them as dials (specimenColors below).
    colourCount: [2, 1, 3, 1],    // how many of the trail colours a trail passes through
    // blend: the colours drift in by colourShift while the trail fades. bands:
    // each colour switches in at full strength and holds; only the last one fades.
    colourMode: { type: "select", options: ["blend", "bands"], default: "blend" },
    framesPerColour: [5, 0.5, 30, 0.5], // frames a trail spends on each colour before the next
    colourShift: [0.4, 0, 1],     // how far each frame moves toward the next colour
  },
  // Lines: the screen's texture, laid over everything.
  lines: {
    type: { type: "select", options: ["scanlines", "pixel grid", "off"], default: "scanlines" },
    strength: [0.5, 0, 1],
    spacing: [2, 1, 8, 1],        // in emulated pixels
    snapScroll: true,             // scrolling moves in whole line steps
  },
  // Noise: ambient unsteadiness of the screen.
  noise: {
    jitter: [1.1, 0, 3],          // rows wobble sideways, in emulated pixels
    flicker: [0, 0, 0.3],         // brightness flicker
  },
  // Warp: a rolling CRT / tape band that shears rows sideways as it rolls
  // from the top of the screen to the bottom. The lines stay put.
  warp: {
    strength: [4, 0, 40, 0.5],    // how far the band pushes rows, in emulated pixels (0 = off)
    bandHeight: [0.05, 0.02, 1, 0.01], // as a fraction of the screen height
    perMinute: [4, 0, 30, 0.5],   // waves per minute
    rollTime: [5.5, 0.5, 10, 0.1], // seconds for a wave to roll top to bottom
    randomness: [0.67, 0, 1],     // 0 = identical, evenly spaced waves; more varies timing, size, strength and adds a ragged edge
  },
};

// Shared by every palette: weights and type are counted in emulated pixels,
// so neither changes between palettes.
export const sharedDisplayConfig = {
  pixels: {
    size: [1, 1, 10, 1],          // the emulated pixel: units on canvas pages (locked at 1), CSS px elsewhere
  },
  // Interface: the chrome, not the display effects.
  interface: {
    lineWeight: [2, 1, 16, 1],    // emulated pixels on canvas pages (CSS px elsewhere); sets --line (bars, tab outlines)
  },
};

// Both together, Pixels holding size and sharpText (the specimen's dials).
export const displayConfig = {
  ...paletteDisplayConfig,
  pixels: { ...sharedDisplayConfig.pixels, ...paletteDisplayConfig.pixels },
  interface: sharedDisplayConfig.interface,
};

// Trail colours: trails drift toward these as they fade (trail 1, then 2,
// then 3, the faintest tail). Dials on the specimen only.
const specimenColors = {
  trail1: "#F38020",
  trail2: "#F3C020",
  trail3: "#8A1A00",
};

export const config = {
  ...displayConfig,
  trails: { ...specimenColors, ...displayConfig.trails },
  theme: {
    mode: { type: "select", options: ["light", "dark"], default: "light" },
    // link: inline link text (viewer pages set it from the palette).
    light: { ground: "#F4F4F0", ink: "#0050FF", accent: "#F38020", link: "#0050FF", _collapsed: true },
    dark: { ground: "#0A0C10", ink: "#3D7BFF", accent: "#F38020", link: "#F3C020", _collapsed: true },
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
    // The specimen can load the shared display settings, and export or import
    // its own values as a file. It doesn't save to display.json.
    load: { type: "action", label: "Load display settings" },
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
