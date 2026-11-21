// Plays the genie on a page's [data-genie] text blocks (js/genie-warp.js), with
// its settled defaults. Shared by layout.html (l toggles) and the genie test
// page (genie.html, which adds the dials and graphs on top).
import { settings, play, genieT, totalFor } from "./genie-warp.js";
import { viewer } from "./viewer.js";

const site = document.getElementById("content");
const blocks = () => [...site.querySelectorAll("[data-genie]")];

// The text block of the panel that's open (its accordion weight is over half).
export function openBlock() {
  return blocks().find((el) => parseFloat(el.closest(".site-panel")?.style.getPropertyValue("--w") || "0") > 0.5) ?? null;
}

// Moves the open block out (1, into its panel's sink square), in (0), or
// toggles it. Motion off cuts. Genied-out text is hidden from selection and
// find; it's shown again as it starts back.
const timers = new Map();
export function genie(to) {
  const el = openBlock();
  if (!el) return;
  if (to === "toggle") to = genieT(el) < 0.5 ? 1 : 0;
  const motion = viewer.get().motion;
  const dur = settings.duration;
  if (!motion) settings.duration = 0;
  play(el, to);
  settings.duration = dur;
  clearTimeout(timers.get(el));
  if (to === 0) el.style.visibility = "";
  else timers.set(el, setTimeout(() => { if (genieT(el) >= 1) el.style.visibility = "hidden"; }, motion ? totalFor(el) : 0));
}
