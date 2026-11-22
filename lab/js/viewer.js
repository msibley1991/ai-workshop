// Viewer controls: palette, motion, blur and scanlines, chosen by whoever is looking at
// the page (layout.html's controls panel). main.js applies them to the render;
// layout.js drives the panel. Pages opt in with <body data-viewer>; elsewhere
// nothing here changes the render.
//
// On render pages (<body data-render>) every colour comes from the active
// palette (main.js composes it with the Render dials). Motion, blur and
// scanlines are overrides applied on top, so turning them back on restores the
// tuned look.

// Palettes live in presets/palettes.json (edited with the Palette dial panel,
// js/palette-panel.js). PALETTES is filled once palettesReady resolves; the
// built-in Ink palette covers the moment before.
export const PALETTE_IDS = ["ink", "blueprint", "plasma", "vector"];
export const PALETTES = {
  ink: { name: "Ink", ground: "#F2F6FF", ink: "#00010F", accent: "#F38020", link: "#0050FF", ghost1: "#FF0088", ghost2: "#00C7F7", ghost3: "#8A1A00" },
};
export const palettesReady = fetch("presets/palettes.json", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error("presets/palettes.json not found"))))
  .then((data) => Object.assign(PALETTES, data))
  .catch((err) => console.error("[lab]", err));

const KEY = "lab-viewer";
export const enabled = "viewer" in document.body.dataset;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let state = { palette: "ink", motion: !reduceMotion, blur: true, scanlines: true };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved) state = { ...state, ...saved };
} catch {}
if (!PALETTE_IDS.includes(state.palette)) state.palette = "ink";

const listeners = new Set();

export const viewer = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    listeners.forEach((fn) => fn(state, patch));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Light or dark follows the ground: a ground brighter than mid-grey is light.
const probe = document.createElement("canvas").getContext("2d");
export function modeOf(ground) {
  probe.fillStyle = "#000";
  probe.fillStyle = ground; // normalises any CSS colour to #rrggbb
  const n = parseInt(String(probe.fillStyle).slice(1), 16) || 0;
  const luma = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luma > 0.5 ? "light" : "dark";
}

// Render values for a palette: the theme (mode from the ground) and the ghost
// colours. The palette's ink is the theme's "phosphor".
export function paletteValues(id) {
  const p = PALETTES[id] ?? PALETTES.ink;
  const mode = modeOf(p.ground);
  return {
    theme: { mode, [mode]: { ground: p.ground, phosphor: p.ink, accent: p.accent, link: p.link ?? p.accent } },
    phosphor: { persistenceColor: p.ghost1, persistenceColor2: p.ghost2, persistenceColor3: p.ghost3 },
  };
}

// Render params with the viewer's motion and blur choices on top of the dials.
export function applyViewer(params) {
  if (!enabled) return params;
  const out = structuredClone(params);
  if (!state.motion) {
    out.ghost.decay = 0;
    out.ghost.scrollGain = 0;
    out.phosphor.jitter = 0;
    out.phosphor.flicker = 0;
    out.warp.strength = 0;
  }
  if (!state.blur) {
    out.glow.intensity = 0;
    out.ghost.blur = 0;
    out.resolution.hardText = 0; // standard softening: plain antialiased text
  }
  // Scanlines off: no scanlines or pixel grid (scroll snapping stays). Its own
  // switch, for projectors that rescale the image and turn the lines to moiré.
  if (!state.scanlines) out.grid.mode = "off";
  return out;
}
