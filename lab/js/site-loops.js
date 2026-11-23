// Loops inside slide 4's site artefacts ([data-artefact="site"], css/layout.css):
//   - stepped, like GIFs (8 frames a second, hard cuts), on the GeoCities page:
//     [data-marquee] scrolls its text across its band and wraps,
//     [data-blink] cuts on and off (500 ms each, by its hidden attribute),
//     [data-march] slides its hatch stripes along (--hatch-shift),
//     [data-counter="417"] counts up, its last digit ticking every 1.5 s;
//   - smooth on the feed: [data-scroll] slides up endlessly (its list holds the
//     posts twice, so it wraps at half its height).
// A site's clock starts when it's on screen and fully open (its frame has no
// inline size from js/slides.js), and starts again from rest each time it
// comes back. Motion off: everything sits at rest. The raster re-measures only
// on `lab:layout`, so a frame that changes anything fires it.
import { viewer } from "./viewer.js";

const STEP_MS = 125;         // GIF frame: 8 fps
const MARQUEE_STEP = 8;      // units per GIF frame
const BLINK_MS = 500;
const MARCH_STEP = 2;        // emulated px per GIF frame
const COUNTER_MS = 1500;
const SCROLL_SPEED = 24;     // units per second

const unit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--u")) || 1;
const clocks = new WeakMap(); // site -> start time

export function startSiteLoops(root) {
  const sites = [...root.querySelectorAll('[data-artefact="site"]')];
  if (!sites.length) return;
  for (const el of root.querySelectorAll("[data-counter]")) setCounter(el, Number(el.dataset.counter));
  const frame = (now) => {
    const motion = viewer.get().motion;
    let changed = false;
    for (const site of sites) {
      const frameEl = site.querySelector(".site-frame");
      const live = motion && !site.closest("[hidden]") && !frameEl.style.width;
      if (!live) { if (clocks.has(site)) { clocks.delete(site); rest(site); changed = true; } continue; }
      if (!clocks.has(site)) clocks.set(site, now);
      if (run(site, now - clocks.get(site))) changed = true;
    }
    if (changed) window.dispatchEvent(new Event("lab:layout"));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Returns true if anything moved this frame.
function run(site, t) {
  const step = Math.floor(t / STEP_MS), u = unit();
  const before = snapshot(site);
  for (const el of site.querySelectorAll("[data-marquee]")) {
    const band = el.parentElement.getBoundingClientRect().width / u, w = el.getBoundingClientRect().width / u;
    const x = band - ((step * MARQUEE_STEP) % (band + w));
    el.style.transform = `translateX(calc(${x} * var(--u)))`;
  }
  // hidden, not visibility: the raster skips [hidden] fills and shapes, not invisible ones.
  for (const el of site.querySelectorAll("[data-blink]")) el.hidden = Math.floor(t / BLINK_MS) % 2 === 1;
  for (const el of site.querySelectorAll("[data-march]")) el.style.setProperty("--hatch-shift", String((step * MARCH_STEP) % 24));
  for (const el of site.querySelectorAll("[data-counter]")) setCounter(el, Number(el.dataset.counter) + Math.floor(t / COUNTER_MS));
  for (const el of site.querySelectorAll("[data-scroll]")) {
    const half = el.getBoundingClientRect().height / u / 2;
    el.style.transform = `translateY(calc(${-((t / 1000) * SCROLL_SPEED) % half} * var(--u)))`;
  }
  return snapshot(site) !== before;
}
// Everything the loops change, as one string, to tell whether a frame moved anything.
const snapshot = (site) => [...site.querySelectorAll("[data-marquee], [data-blink], [data-march], [data-counter], [data-scroll]")]
  .map((el) => `${el.style.transform}|${el.hidden}|${el.style.getPropertyValue("--hatch-shift")}|${el.dataset.shown ?? ""}`).join(";");

function rest(site) {
  for (const el of site.querySelectorAll("[data-marquee]")) el.style.transform = `translateX(calc(${MARQUEE_STEP} * var(--u)))`;
  for (const el of site.querySelectorAll("[data-blink]")) el.hidden = false;
  for (const el of site.querySelectorAll("[data-march]")) el.style.removeProperty("--hatch-shift");
  for (const el of site.querySelectorAll("[data-counter]")) setCounter(el, Number(el.dataset.counter));
  for (const el of site.querySelectorAll("[data-scroll]")) el.style.transform = "";
}

// Six boxed digits.
function setCounter(el, n) {
  const digits = String(n % 1e6).padStart(6, "0");
  if (el.dataset.shown === digits) return;
  el.dataset.shown = digits;
  el.replaceChildren(...[...digits].map((d) => { const s = document.createElement("span"); s.setAttribute("data-box", ""); s.textContent = d; return s; }));
}
