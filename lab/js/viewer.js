// Viewer controls: palette, motion, blur and lines, chosen by whoever is looking at
// the page (layout.html's controls panel). main.js applies them to the render;
// layout.js drives the panel. Pages opt in with <body data-viewer>; elsewhere
// nothing here changes the render.
//
// On display pages (<body data-display>) every colour and effect comes from
// the active palette (main.js composes it with the shared Display dials). Motion, blur and
// lines are overrides applied on top, so turning them back on restores the
// tuned look.
import { paletteDisplayConfig, defaultsOf } from "./params.js";

// Palettes live in presets/palettes.json (edited with the Palette dial panel,
// js/palette-panel.js). PALETTES is filled once palettesReady resolves; the
// built-in Ink palette covers the moment before.
export const PALETTE_IDS = ["ink", "blueprint", "plasma", "vector"];
export const PALETTES = {
  ink: { name: "Ink", ground: "#F2F6FF", ink: "#00010F", accent: "#F38020", link: "#0050FF", trail1: "#FF0088", trail2: "#00C7F7", trail3: "#8A1A00" },
};
export const palettesReady = fetch("presets/palettes.json", { cache: "no-store" })
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error("presets/palettes.json not found"))))
  .then((data) => Object.assign(PALETTES, data))
  .catch((err) => console.error("[lab]", err));

const KEY = "lab-viewer";
export const enabled = "viewer" in document.body.dataset;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let state = { palette: "ink", motion: !reduceMotion, blur: true, lines: true };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved) {
    // The Lines switch was called Scanlines until 2026-11-25.
    if ("scanlines" in saved && !("lines" in saved)) saved.lines = saved.scanlines;
    delete saved.scanlines;
    state = { ...state, ...saved };
  }
} catch {}
if (!PALETTE_IDS.includes(state.palette)) state.palette = "ink";

const listeners = new Set();

// A palette's effects, group by group over the defaults (a palette saved
// before it had a display block, or a group added later, gets the defaults).
const EFFECT_DEFAULTS = defaultsOf(paletteDisplayConfig);
export function paletteDisplay(p) {
  const d = p?.display ?? {};
  return Object.fromEntries(Object.entries(EFFECT_DEFAULTS).map(([g, v]) => [g, { ...v, ...d[g] }]));
}

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

// Display values for a palette: the theme (mode from the ground), the trail
// colours and its effects (its `display` block, defaults filling any gaps).
export function paletteValues(id) {
  const p = PALETTES[id] ?? PALETTES.ink;
  const mode = modeOf(p.ground);
  const display = paletteDisplay(p);
  return {
    theme: { mode, [mode]: { ground: p.ground, ink: p.ink, accent: p.accent, link: p.link ?? p.accent } },
    display: { ...display, trails: { ...display.trails, trail1: p.trail1, trail2: p.trail2, trail3: p.trail3 } },
  };
}

// Render params with the viewer's motion and blur choices on top of the dials.
export function applyViewer(params) {
  if (!enabled) return params;
  const out = structuredClone(params);
  if (!state.motion) {
    out.trails.length = 0;
    out.trails.scrollBoost = 0;
    out.noise.jitter = 0;
    out.noise.flicker = 0;
    out.warp.strength = 0;
  }
  if (!state.blur) {
    out.glow.strength = 0;
    out.trails.spread = 0;
    out.pixels.sharpText = 0; // standard softening: plain antialiased text
  }
  // Lines off: no scanlines or pixel grid (scroll snapping stays). Its own
  // switch, for projectors that rescale the image and turn the lines to moiré.
  if (!state.lines) out.lines.type = "off";
  return out;
}
