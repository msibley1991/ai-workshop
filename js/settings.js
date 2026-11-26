// Settings stores (docs/design-system/playground.md): each tool's saved
// defaults come from presets/<name>.json (static, committed), and the viewer's
// own changes sit on top, kept in localStorage as a sparse map of dotted paths
// ("hatch.angle": 30), so a later change to the saved file still shows for
// every setting the viewer hasn't touched. Every page applies them, so a change
// made in the playground follows the viewer onto the talk and the glossary.
//
// createStore(name, fallback, apply): fallback is the code's copy of the
// defaults, used until (or if) the preset loads; apply(values) puts the values
// into effect, and runs only when they change.
// register(entry) adds anything else that holds viewer changes (the palettes'
// effects, js/viewer.js) to differs() and resetAll().
import { loadPreset, savePreset } from "./params.js";

export const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

const entries = new Set();
const watchers = new Set();
const notify = () => watchers.forEach((fn) => fn());

const getPath = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
function setPath(o, path, v) {
  const keys = path.split("."), last = keys.pop();
  let t = o;
  for (const k of keys) t = t[k] ??= {};
  t[last] = v;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The saved values with the fallback filling any key the file lacks.
function withFallback(fallback, saved) {
  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback)) return saved ?? fallback;
  const out = structuredClone(fallback);
  for (const [k, v] of Object.entries(saved ?? {})) out[k] = k in fallback ? withFallback(fallback[k], v) : v;
  return out;
}

export function createStore(name, fallback, apply = () => {}) {
  const KEY = `site-${name}`;
  let saved = structuredClone(fallback);
  let local = {};
  try { local = JSON.parse(localStorage.getItem(KEY) || "{}") ?? {}; } catch {}
  let values = null;
  const listeners = new Set();

  function update() {
    const next = structuredClone(saved);
    for (const [path, v] of Object.entries(local)) setPath(next, path, v);
    if (values && same(values, next)) return;
    values = next;
    apply(values);
    listeners.forEach((fn) => fn(values));
    notify();
  }
  const persist = () => {
    try {
      if (Object.keys(local).length) localStorage.setItem(KEY, JSON.stringify(local));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const store = {
    name,
    get: () => values,
    saved: () => saved,
    // A viewer change. Setting a value back to the saved one drops the change.
    set(path, v) {
      if (same(getPath(saved, path), v)) delete local[path];
      else local[path] = v;
      persist();
      update();
    },
    differs: () => Object.keys(local).length > 0,
    reset() {
      local = {};
      persist();
      update();
      notify();
    },
    // Localhost only (serve.py): the current values become the saved defaults.
    async saveDefault() {
      if (!isLocal) throw new Error("Saving defaults only works on localhost");
      await savePreset(name, values);
      saved = structuredClone(values);
      local = {};
      persist();
      update();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  update();
  store.ready = loadPreset(name)
    .then((v) => { saved = withFallback(fallback, v); update(); })
    .catch((err) => console.error("[site]", err));
  register(store);
  return store;
}

export function register(entry) {
  entries.add(entry);
  notify();
}
export const differs = () => [...entries].some((e) => e.differs());
export const resetAll = () => entries.forEach((e) => e.differs() && e.reset());
// fn() runs after any store or registered entry changes.
export function watch(fn) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}
export const changed = notify; // for registered entries to call after a change

// The Controls panel's "Playground changes: reset" row
// ([data-playground-reset], on every page with the panel): shown only while
// something differs from the saved look; its button resets everything.
export function bindResetRow(root = document) {
  const row = root.querySelector("[data-playground-reset]");
  if (!row) return;
  const show = () => {
    const on = differs();
    if (row.hidden === !on) return;
    row.hidden = !on;
    window.dispatchEvent(new Event("lab:layout"));
  };
  row.querySelector("[data-reset-all]")?.addEventListener("click", () => resetAll());
  watch(show);
  show();
}
