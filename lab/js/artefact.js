// Typing for text artefacts (docs/design-system/text-artefacts.md, "Retype").
//
// A `[data-type]` block types its text in character by character with a block
// cursor in ink, and its box grows a line at a time as the text reaches it.
// The block holds the typed text, the cursor, and the rest of the word being
// typed in a `visibility: hidden` span (the raster skips hidden text): the
// whole word takes its room from its first letter, so it never jumps to the
// next line halfway through. Text after that word isn't in the DOM yet. The
// cursor is an empty inline span holding an absolute `data-fill` block, so it
// takes no width and never moves a line break. Every change fires `lab:layout`
// so the raster re-measures.

const blocks = new WeakMap(); // el -> { text, typed, cursor, rest, k, run }

function prep(el) {
  let b = blocks.get(el);
  if (b) return b;
  // A block of line elements (one `.chat-line` per design area) types as plain
  // text with a line break per element, and gets the elements back once fully
  // typed, so they can be cropped and marked. A plain block keeps its source
  // line breaks (CSS pre-line); indentation and runs of spaces collapse.
  // data-type="inline": the block is running text whose inline elements (spans
  // to mark) type as plain text and come back once fully typed.
  const inline = el.dataset.type === "inline";
  const nodes = inline ? [...el.childNodes] : el.children.length ? [...el.children] : null;
  const lines = inline ? [el.textContent] : nodes ? nodes.map((n) => n.textContent) : el.textContent.split("\n");
  const text = lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  const typed = document.createTextNode(text);
  const cursor = document.createElement("span");
  cursor.className = "type-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.hidden = true;
  const mark = document.createElement("span");
  mark.setAttribute("data-fill", "");
  cursor.append(mark);
  const rest = document.createElement("span");
  rest.className = "type-rest";
  el.replaceChildren(typed, cursor, rest);
  b = { el, text, typed, cursor, rest, nodes, restored: false, k: 1, run: 0 };
  blocks.set(el, b);
  return b;
}

// Shows the first k (0..1) of the text; the cursor sits at the split while
// `cursor` is true.
function render(b, k, cursor) {
  b.k = k;
  const n = Math.round(k * b.text.length);
  if (b.nodes && n >= b.text.length && !cursor) {
    if (!b.restored) { b.el.replaceChildren(...b.nodes); b.restored = true; }
    window.dispatchEvent(new Event("lab:layout"));
    return;
  }
  if (b.restored) { b.el.replaceChildren(b.typed, b.cursor, b.rest); b.restored = false; }
  const wordEnd = b.text.slice(n).search(/\s|$/) + n;
  b.typed.data = b.text.slice(0, n);
  b.rest.textContent = b.text.slice(n, wordEnd);
  b.cursor.hidden = !cursor;
  window.dispatchEvent(new Event("lab:layout"));
}

// Cuts straight to typed (1) or empty (0), cancelling any run in progress.
export function setTyped(el, k) {
  const b = prep(el);
  b.run++;
  render(b, k, false);
}

// Types in (to 1) or erases (to 0) over `ms` in all, at one steady rate.
// Resolves when done, or early if setTyped / another run takes over, or when
// `cancelled()` turns true.
export function typeTo(el, to, ms, cancelled = () => false) {
  const b = prep(el);
  const my = ++b.run, from = b.k;
  if (from === to || ms <= 0) { render(b, to, false); return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (now) => {
      if (my !== b.run || cancelled()) return resolve();
      const p = Math.min(1, (now - t0) / ms);
      render(b, from + (to - from) * p, p < 1);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    render(b, from, true);
    requestAnimationFrame(frame);
  });
}

// Every typing block in an artefact.
export const typeBlocks = (root) => [...root.querySelectorAll("[data-type]")];
