# Interface components

Status: **exploration**. Decided in the components grilling session (2026-11-22) and built on the lab layout page ([`lab/layout.html`](../../lab/layout.html), [`lab/css/layout.css`](../../lab/css/layout.css), [`lab/js/layout.js`](../../lab/js/layout.js)): the bars, palette indicator, hints and keys, panels, left nav and tab headers. The link rules (`↗`, new tab, inverted hover) aren't built yet, because the page has no such links.

The chrome is everything that isn't slide content: the bars, the accordion tabs, the panels, buttons, key hints and links. It follows the mainframe lineage ([aesthetic-direction.md](../aesthetic-direction.md)): a status line on top and a function-key bar at the bottom.

## Out of scope here
- **The glossary's own UI** (its page or popover). It's built later. Glossary links from labels are in [graphics.md](graphics.md).
- **The download button** for the repo zip (§8). It lives inside a slide, so it comes with the slides.
- **Focus distinct from hover, Tab order and screen-reader labels** belong to the accessibility and interaction-and-keys gaps.

## Position display
- **The slide number shows in the footer,** right of the section title (changed 2026-11-22). It counts the slides within the tab, from 1, and is worked out from the page, so it follows slides being added or moved. There's still no step value or slide total.
- **Sections aren't numbered,** in the nav or the footer ([slide-templates.md](slide-templates.md)).
- Where you are shows only as state: the open tab's flap and the current section in the nav stay inverted.

## Top bar
- **Left:** the site title, `how (did you [make] this?)`, which links to the hero.
- **Right:** the **palette indicator**: `Palette - Ink ■ ■ ■`.
  - The name is the active palette's, in bar text.
  - Three **8 × 8 boxes** follow, in **ground, ink, accent** order, with no labels.
  - Each box has a **1-unit ink outline**, except the **ink box, which has an accent outline**.
  - It's a button: clicking it opens the controls panel, like `[c]`. On hover, the bar fill inverts behind the text, and the boxes keep their own colours so they still show the palette.

## Bottom bar
- **Left:** `[←] [→] Step`, then `[g] Grid`.
- **Right:** `[f] Fullscreen`, then `[c] Controls` at the far right.
- **Each bracketed key is a button** that does what the key does. Where a hint has several keys (`[←] [→]`), each bracket is its own button, and the word after them is a plain label.
- **Pressed state:** a hint whose thing is on stays inverted: `[g] Grid` while the overlay shows, `[f] Fullscreen` in fullscreen, `[c] Controls` while the panel is open. The step buttons never stay pressed.
- **At either end of the talk,** the arrow that can't step any further dims to the "dim" ink and does nothing.
- **Grid ships** as a visible control, because the talk is about design. It's the overlay layout-grid.md describes. It gets the **g** key on the site.
- **The nav's hint** `[n] Nav` sits on the left after the step control, once the nav is built.

## Keys
- **Stepping:** → and **PageDown** step forward a beat. ← and **PageUp** step back. Presentation clickers send PageDown and PageUp (some send ← →), so a clicker steps beats and never skips a tab. Built in `lab/js/layout.js` (2026-11-22).
- **Tab jumps:** ↓ and Space open the next tab, and ↑ and Shift+Space the previous one, for someone browsing by keyboard.
- **Esc** closes the open menu. It also leaves fullscreen, as the browser does.
- **Menus take the keys** (2026-11-22). While a menu (the nav or the controls) is open:
  - **↑ ↓** move the highlight through its buttons, top to bottom, wrapping at the ends. The highlight is the hover look, and the button has focus.
  - **Tab** jumps to the next group's first button, and **Shift+Tab** to the previous: in the nav, the hero, then each tab's first section; in the controls, Palette, then Display.
  - **Enter** (or Space) selects.
  - ← →, PageUp, PageDown and Space don't step the talk. f and g still work.
  - The highlight starts on the current entry (the nav) or the chosen option (the controls).
- **Menu keys:** a menu's own key closes it. The other menu's key closes it and opens that one.
- **Blank screen:** a clicker's blank button (usually b or .) is free, since neither key does anything.

## Key hints
- **Format:** the key in brackets, then a sentence-case word: `[c] Controls`, not "Press [c] for controls".
- The bracket is the cue that a key works, matching the panels' bracketed headings (`[Palette]`).
- A panel's close hint reads `[x] [Esc] Close`, where `[x]` is the panel's own key (`[c] [Esc] Close` in the controls).

## Bar text
- **16/24, weight 500,** the Bar text role ([typography.md](typography.md)). It's chrome nobody reads from the room, so it may drop below the 24 floor.

## Buttons
- **One button** for bars, panels and nav entries. It's plain at rest. On **hover, focus and pressed**, it **inverts**: an ink fill, with its text knocked out in ground (`data-fill` and `--fill-alpha` in the lab).
- **Labels** are sentence case.
- **Option groups** (`on / off`, the palette list) keep only the chosen option pressed.

## Panels
- **One panel component** for the controls and the nav.
- It covers **2 columns at a frame edge,** between the bars (controls on columns 11–12, nav on 1–2). Its box runs from its first column out to the frame margin. The rules are in [layout-grid.md](layout-grid.md) under "Panels on the grid".
- **Contents:** a title in Label (`Controls`, `Nav`), bracketed group headings, and the close hint pinned at the bottom in bar text.
- **Motion:** it slides over 250 ms on out ([motion.md](motion.md)). The content reflows before it slides in and after it slides out. With motion off, it snaps.
- **Only one panel is open at a time.** Opening one closes the other (2026-11-22).
- The controls panel's contents are in [palettes.md](palettes.md).

## Left nav
- **What it is:** a section index, opened by **n** or `[n] Nav`. n or Esc closes it. It's the panel component, mirrored: it slides in from the left, and the text axis moves to column 3 ([slide-templates.md](slide-templates.md)).
- **It looks like a visual subtree,** like a filesystem:

  ```
  how (did you [make] this?)
  Nora's Section/
   ├─ …
   └─ …
  Max's Section/
   ├─ On creative decisions
   ├─ State of digital media
   └─ …
  ```

  - **Folders are the tabs,** named as the tabs are, ending in `/`. There are no slugs.
  - **Entries are the sections,** in sentence case, unnumbered.
  - **The hero** is a root entry above the folders, with no line. It jumps to slide zero.
- **The lines are drawn, not box-drawing glyphs.** A vertical trunk runs down from under each folder's name, with a short tick to each section, and the last turns the corner. They're at the chrome line weight (2), in ink.
  - The trunk sits one indent step (24) in, under the folder name's first letter.
  - Ticks are 16 long and meet each section's text at its centre line.
  - Each level indents 24.
- **Opening folders:** a folder opens while the pointer is on it (its name or its sections), or while the menu highlight is on it. The folder you're in stays open. Every other folder is closed and ends in `…`. There are **no ▸/▾ marks**, because the hanging subtree is the cue.
- **Jumping:** clicking a section lands on its **first slide**, and clicking a folder lands on its tab's first slide. Until now only tabs could be jumped to. The nav stays open after a jump.
- **Where you are:** the current section's entry stays pressed (inverted as a block), and its tick runs up to the block's edge. On the hero, nothing is pressed.
- **Text:** Chakra Petch in bar text. The nav is chrome, so the text-artefact face rule (mono for what a file holds) doesn't apply. The subtree lines alone carry the filesystem look.

## Accordion tab headers
- **As built:** 64 tall, with the flap label up to column 4.
- **The label is the tab's name only,** the same string as its nav folder without the `/`. The tabs read "Nora's Section" and "Max's Section" for now.
- **The open tab's flap stays inverted** (`aria-current`).
- **Clicking a closed tab** opens it at its first slide.
- There's no hint or count in headers.

## Links
- **Look:** the palette's link colour, underlined one emulated pixel thick ([palettes.md](palettes.md)).
- **Links that leave the site** (GitHub files, the repo, outside references) **open in a new tab** and end in `↗`.
- **Links within the site** (the glossary later, the title back to the hero) stay in the page, with no mark.
- **No visited style.**
- **Hover and focus invert** the link: the link colour as a fill, the text knocked out in ground, and the underline gone.
- **In statements,** a link inside genie text pours in with its line and can be clicked once the line has landed.
- **Glossary links on slides** (2026-11-26): the first time a glossary term appears in the slide statements, it links to its entry on the glossary page. Later appearances stay plain. Terms inside graphics aren't linked.
- **As built:** a statement link is `<a data-fill><span>…</span></a>`: the underline is on the span, and hover and focus turn on the fill and knock the text out (`css/layout.css`; the glossary page's links in `css/glossary.css` match).
- **Text artefacts carry no links** ([text-artefacts.md](text-artefacts.md)). Links to the real files are text links in the presentation.

## Open
- **Hover, focus and pressed look the same.** A distinct focus look waits for the accessibility session.
- **Not built yet:** links that leave the site (new tab, `↗`).
- **On the lab's genie page,** g already opens the graph editor, so the `[g] Grid` key works only as a button there. The page has no nav.
- The real tab names, after the layout recording.
- Whether the palette indicator's ink box and its accent outline read on the dark palettes (Plasma, Vector), for the projector test ([display.md](display.md)).
