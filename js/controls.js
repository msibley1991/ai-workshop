// Playground controls (docs/design-system/playground.md, "The two controls"):
// a steps row and a slider, each bound to one setting in a store. Write the
// element and its data; bindControls() builds the inside and keeps it in step.
//
//   <div data-control="slider" data-store="genie" data-key="lineTime"
//        data-label="Speed" data-min="100" data-max="1000" data-step="50" data-unit="ms"></div>
//   <div data-control="steps" data-store="genie" data-key="bends"
//        data-label="Bends" data-options="1|2|3|4"></div>
//
// data-options is "value" or "value:Label", split by "|"; values that read as
// numbers or true/false are those. data-options="type-steps" offers the saved
// type size and one step either side on the spacing scale, labelled − 0 +.
// Stores: genie, shading, type (js/stores.js) and palette (the active
// palette's effects, js/viewer.js). Everything visible is boxes, fills and
// text, so the raster draws it; the slider's real <input type="range"> lies
// invisibly over its track, for pointer, keys and screen readers.
import { genieStore, shadingStore, typeStore, TYPE_SCALE } from "./stores.js";
import { viewer, palettesReady, PALETTES } from "./viewer.js";
import { watch, isLocal } from "./settings.js";
import { loadPreset, savePreset } from "./params.js";
import { genie } from "./genie-play.js";

const getPath = (o, path) => path.split(".").reduce((v, k) => v?.[k], o);
const fromStore = (store) => ({
  get: (key) => getPath(store.get(), key),
  saved: (key) => getPath(store.saved(), key),
  set: (key, v) => store.set(key, v),
});
// Shading's "style" is one choice over two keys: hatch, or a dither pattern
// (technique "dither" with dither.pattern).
const shading = fromStore(shadingStore);
const shadingWithStyle = {
  ...shading,
  get: (key) => key === "style"
    ? (shading.get("technique") === "dither" ? shading.get("dither.pattern") : "hatch")
    : shading.get(key),
  set(key, v) {
    if (key !== "style") return shading.set(key, v);
    if (v === "hatch") return shading.set("technique", "hatch");
    shading.set("dither.pattern", v);
    shading.set("technique", "dither");
  },
};
const STORES = {
  genie: fromStore(genieStore),
  shading: shadingWithStyle,
  type: fromStore(typeStore),
  palette: {
    get: (key) => viewer.effect(key),
    set: (key, v) => viewer.setEffect(key, v),
  },
};

const relayout = () => window.dispatchEvent(new Event("lab:layout"));
const parse = (s) => (s === "true" ? true : s === "false" ? false : s !== "" && !isNaN(s) ? Number(s) : s);
const decimals = (step) => (String(step).split(".")[1] ?? "").length;
const el = (tag, cls, attrs = {}) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, attrs);

function options(node, store) {
  if (node.dataset.options === "type-steps") {
    const saved = store.saved(node.dataset.key), i = TYPE_SCALE.indexOf(saved);
    return [[TYPE_SCALE[i - 1], "−"], [saved, "0"], [TYPE_SCALE[i + 1], "+"]].filter(([v]) => v != null);
  }
  return node.dataset.options.split("|").map((o) => {
    const [v, label] = o.split(":");
    return [parse(v), label ?? v];
  });
}

function steps(node, store) {
  const key = node.dataset.key, label = node.dataset.label ?? key;
  node.classList.add("site-steps");
  node.setAttribute("role", "group");
  node.setAttribute("aria-label", label);
  node.replaceChildren(el("span", "site-control-label", { textContent: label }));
  let buttons = [], built = "";
  const build = () => {
    const opts = options(node, store);
    if (JSON.stringify(opts) === built) return;
    built = JSON.stringify(opts);
    buttons.forEach((b) => { b.previousSibling?.classList?.contains("site-steps-sep") && b.previousSibling.remove(); b.remove(); });
    buttons = opts.map(([value, text], i) => {
      if (i) node.append(el("span", "site-steps-sep", { textContent: "/" }));
      const b = el("button", "site-bar-button", { type: "button" });
      b.setAttribute("data-fill", "");
      b.append(el("span", "", { textContent: text }));
      b.value = JSON.stringify(value);
      b.addEventListener("click", () => store.set(key, value));
      node.append(b);
      return b;
    });
  };
  build();
  return () => {
    if (node.dataset.options === "type-steps") build(); // the saved size may have loaded since
    const now = JSON.stringify(store.get(key));
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.value === now));
  };
}

function slider(node, store) {
  const key = node.dataset.key, label = node.dataset.label ?? key;
  const min = Number(node.dataset.min ?? 0), max = Number(node.dataset.max ?? 1), step = Number(node.dataset.step ?? 0.01);
  const unit = node.dataset.unit ?? "";
  node.classList.add("site-slider");
  const track = el("span", "site-slider-track");
  track.setAttribute("data-box", "");
  const bar = el("span", "site-slider-bar");
  bar.setAttribute("data-fill", "");
  const input = el("input", "", { type: "range", min, max, step });
  input.setAttribute("aria-label", label);
  track.append(bar, input);
  const value = el("span", "site-slider-value");
  node.replaceChildren(el("span", "site-control-label", { textContent: label }), track, value);
  input.addEventListener("input", () => store.set(key, Number(input.value)));
  return () => {
    const v = Number(store.get(key));
    if (Number(input.value) !== v) input.value = v;
    node.style.setProperty("--v", Math.min(1, Math.max(0, (v - min) / (max - min || 1))));
    value.textContent = `${v.toFixed(decimals(step))}${!unit ? "" : unit === "°" ? unit : ` ${unit}`}`;
    input.setAttribute("aria-valuetext", value.textContent);
  };
}

// data-when="<store>:<key>=<value>" shows an element only while that setting
// has that value (the hatch-only and dither-only settings).
function whenRule(node) {
  const [storeName, rule] = node.dataset.when.split(":"), [key, value] = rule.split("=");
  const store = STORES[storeName];
  return () => {
    const on = String(store.get(key)) === value;
    if (node.hidden === !on) return;
    node.hidden = !on;
  };
}

// data-action buttons: "reset:<store>" undoes the viewer's changes to that tool
// (palette: the active palette's effects), "save:<store>" makes the current values
// the saved defaults (localhost only, serve.py; palette: the active palette),
// "genie:out" / "genie:in" run the open tab's genie. [data-local-only] shows
// only on localhost.
const RESET = { genie: () => genieStore.reset(), shading: () => shadingStore.reset(), type: () => typeStore.reset(), palette: () => viewer.resetEffects(viewer.get().palette) };
async function savePalette() {
  const id = viewer.get().palette, own = PALETTES[id];
  const effects = Object.fromEntries(Object.keys(own.display ?? {}).map((g) => [g, { ...own.display[g] }]));
  for (const path of Object.keys(viewer.effectChanges(id))) {
    const [g, k] = path.split(".");
    (effects[g] ??= {})[k] = viewer.effect(path, id);
  }
  own.display = effects;
  const saved = await loadPreset("palettes");
  saved[id] = { ...own };
  await savePreset("palettes", saved);
  viewer.resetEffects(id);
}
const SAVE = { genie: () => genieStore.saveDefault(), shading: () => shadingStore.saveDefault(), type: () => typeStore.saveDefault(), palette: savePalette };

function bindAction(button) {
  const [kind, name] = button.dataset.action.split(":");
  button.addEventListener("click", async () => {
    try {
      if (kind === "reset") RESET[name]?.();
      else if (kind === "save") { await SAVE[name]?.(); flash(button, "saved"); }
      else if (kind === "genie") genie(name === "out" ? 1 : 0);
    } catch (err) {
      console.error("[site]", err);
      flash(button, "failed");
    }
  });
}
// Briefly swaps a button's text for a status word.
function flash(button, word) {
  const span = button.querySelector("span"), text = span.textContent;
  span.textContent = word;
  relayout();
  setTimeout(() => { span.textContent = text; relayout(); }, 1500);
}

// Builds every [data-control] under root and keeps each showing its setting.
export function bindControls(root = document) {
  const shows = [];
  for (const node of root.querySelectorAll("[data-control]")) {
    const store = STORES[node.dataset.store];
    if (!store) { console.error("[site] unknown store", node.dataset.store); continue; }
    shows.push(node.dataset.control === "steps" ? steps(node, store) : slider(node, store));
  }
  for (const node of root.querySelectorAll("[data-when]")) shows.push(whenRule(node));
  for (const node of root.querySelectorAll("[data-action]")) bindAction(node);
  for (const node of root.querySelectorAll("[data-local-only]")) node.hidden = !isLocal;
  // Hover and focus change how buttons and sliders draw, so the raster
  // measures again on each (as layout.js does for the bars and panels).
  for (const node of root.querySelectorAll("[data-control], [data-action], [data-control] button, [data-control] input")) {
    for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) node.addEventListener(type, relayout);
  }
  const show = () => { shows.forEach((fn) => fn()); relayout(); };
  watch(show);
  viewer.subscribe(show); // palette switches show that palette's effects
  palettesReady.then(show);
  show();
  return show;
}
