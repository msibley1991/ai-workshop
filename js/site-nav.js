// The left nav's tree, the same on every page (docs/design-system/components.md):
// the talk's hero as a root entry, each of its tabs as a folder ("Max's
// Section/") whose sections hang from its trunk, then the other pages
// (Glossary, Playground) as root entries. A folder opens while the pointer (or
// the menu highlight) is on it, and the one you're in stays open; the rest are
// closed and end in "…". Every entry is a link to its place in the talk
// (#<tab>/<slide>) or its page; on the talk, `goto` takes the click instead.
// The current section, or the current page, stays pressed.
//
// The talk's outline is read from index.html itself: the live page on the
// talk, fetched elsewhere, so the tree has one source.

export const PAGES = [
  { name: "Glossary", href: "glossary.html" },
  { name: "Playground", href: "playground.html" },
];

// { title, folders: [{ pi, id, name, sections: [{ name, number }] }] }, where
// number is the section's first slide within its tab (as js/slides.js counts).
export function talkOutline(doc) {
  const site = doc.getElementById("content");
  const panels = [...site.querySelectorAll(".site-panel")];
  return {
    title: site.querySelector(".site-title")?.textContent.trim() || "Home",
    folders: panels.slice(1).map((panel, k) => {
      const slides = [...panel.querySelectorAll("[data-slide]")];
      const sections = [];
      slides.forEach((s, n) => {
        const name = s.closest("[data-section]")?.dataset.section;
        if (name && !sections.some((x) => x.name === name)) sections.push({ name, number: n + 1 });
      });
      return {
        pi: k + 1,
        id: panel.dataset.panel,
        name: panel.querySelector(".site-tab-label")?.textContent.trim() ?? "",
        sections,
      };
    }),
  };
}

export async function fetchTalkOutline() {
  const res = await fetch(new URL("index.html", location.href));
  if (!res.ok) throw new Error(`index.html: ${res.status}`);
  return talkOutline(new DOMParser().parseFromString(await res.text(), "text/html"));
}

const talkHref = (id, number = 1) => `./${id ? `#${id}` : ""}${number > 1 ? `/${number}` : ""}`;

// page: the current page's href ("" on the talk). goto(pi, number): the talk's
// own jump (null elsewhere: the links navigate). relayout: re-measure.
export function buildNavTree(tree, outline, { page = "", goto = null, relayout }) {
  const link = (text, href, cls = "") => {
    const a = document.createElement("a");
    a.className = `site-bar-button ${cls}`.trim();
    a.href = href;
    a.dataset.fill = "";
    const span = document.createElement("span");
    span.textContent = text;
    a.append(span);
    return a;
  };
  const line = (cls) => { const l = document.createElement("span"); l.className = cls; l.dataset.fill = ""; return l; };
  const onClick = (a, pi, number) => {
    if (goto) a.addEventListener("click", (e) => { e.preventDefault(); goto(pi, number); });
  };

  const entries = [];   // { a, pi, section }
  const folders = [];   // { el, nameEl, name, pi, first }
  let currentPi = -1, hovered = null, highlighted = null;

  const hero = link(outline.title, talkHref(""));
  onClick(hero, 0, 1);
  tree.append(hero);
  entries.push({ a: hero, pi: 0, section: null });

  // A folder is open if you're in it, the pointer is on it, or the menu
  // highlight is on it or one of its sections.
  function showFolders() {
    for (const f of folders) {
      const open = f.pi === currentPi || f === hovered || f === highlighted;
      f.el.toggleAttribute("data-collapsed", !open);
      f.nameEl.firstElementChild.textContent = open ? `${f.name}/` : `${f.name}/…`;
    }
    relayout();
  }

  for (const { pi, id, name, sections } of outline.folders) {
    const folder = document.createElement("div");
    folder.className = "site-nav-folder";
    const nameEl = link(`${name}/`, talkHref(id), "site-nav-folder-name");
    onClick(nameEl, pi, 1);
    const list = document.createElement("ul");
    folder.append(nameEl, list);
    const f = { el: folder, nameEl, name, pi, first: null };
    folders.push(f);
    folder.addEventListener("pointerenter", () => { hovered = f; showFolders(); });
    folder.addEventListener("pointerleave", () => { if (hovered === f) hovered = null; showFolders(); });
    for (const s of sections) {
      const li = document.createElement("li");
      li.className = "site-nav-entry";
      const a = link(s.name, talkHref(id, s.number));
      onClick(a, pi, s.number);
      li.append(line("site-nav-trunk"), line("site-nav-tick"), a);
      list.append(li);
      entries.push({ a, pi, section: s.name });
      f.first ??= a;
    }
    tree.append(folder);
  }

  const pages = PAGES.map(({ name, href }) => {
    const a = link(name, href);
    if (href.replace(/\.html$/, "") === page.replace(/\.html$/, "")) { a.setAttribute("aria-current", "page"); a.setAttribute("aria-pressed", "true"); }
    tree.append(a);
    return a;
  });

  for (const a of tree.querySelectorAll("a")) {
    for (const type of ["pointerenter", "pointerleave", "focus", "blur"]) a.addEventListener(type, relayout);
  }
  showFolders();

  return {
    // Every entry you can see, top to bottom (a closed folder's sections are hidden).
    items: () => [...tree.querySelectorAll("a")].filter((a) => a.offsetParent !== null),
    // Tab: the hero, each folder's first section, then the pages.
    jumps: () => [hero, ...folders.map((f) => f.first ?? f.nameEl), pages[0]],
    highlight(el) {
      highlighted = el ? folders.find((f) => f.el.contains(el)) ?? null : null;
      showFolders();
    },
    // The talk only: press the current section (or nothing, on the hero).
    show(pos) {
      const { pi, section } = pos.stop;
      currentPi = pi;
      for (const e of entries) {
        const on = e.pi === pi && (e.section === null ? pi === 0 : e.section === section);
        e.a.setAttribute("aria-current", String(on));
        e.a.setAttribute("aria-pressed", String(on));
      }
      showFolders();
    },
  };
}
