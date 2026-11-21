# Aesthetic direction

Status: **early exploration**. These are starting inspirations and working assumptions from the first session, not decisions. Most of the visual language is still undesigned. Effects and theming are being tested in [`lab/`](../lab/).

## Source
Elena Burger, ["Toward a working definition of paperclip-punk"](https://www.virtualelena.co/p/toward-a-working-definition-of-paperclip). We borrow it faithfully as a base:
- Light, blueprint-like grounds. Blue `#0050FF`, orange `#F38020`.
- Sans and mono type, no serifs.
- Skimmable, diagrammatic, interactive (playgrounds, exploded views, tooltips).
- No humanlike characters or mascots.

## Our additions
- **Shader layer.** The interface should feel like an advanced *pre-window* UI with experimental display features: contemporary design and interaction, not literal ASCII boxes.
  1. Lower-resolution emulation with nearest-neighbor upscaling.
  2. Subtle glow, plus ghosting on scroll.
  3. Scanline or pixel-grid pattern; scrolling jumps one grid line at a time.
- **Low-poly 3D as explanatory objects:** exploded-view diagrams that show how something works, never decoration.
- **Mood:** uncanny and speculative. It comes from the display layer, not from imagery.

## Lineages
- **PLATO plasma terminals:** warm orange glow, touch panels.
- **Vector displays** (oscilloscope, radar, Vectrex, Sketchpad): glowing lines, phosphor persistence.
- **Mainframe terminals** (VT100, 3270): status lines, function-key bars, forms.

## Context of use
- A long, multi-section scroll page that doubles as the presentation, with scroll-animated elements.
- Key commands for the two presenters only.
- **Projector first,** web second. One look serves both, tested on a projector; viewers calm it with the controls ([design-system/display.md](design-system/display.md)).
- Light and dark grounds both stay in play until tested.

## Open questions
- How the 3D is rendered: technical-illustration outlines, wireframe, solid, or something else.
- Palette, and the light vs. dark default: viewers choose from four palettes (two light, two dark), first pass in [design-system/palettes.md](design-system/palettes.md).
- ~~Typefaces and type scale~~: settled in [design-system/typography.md](design-system/typography.md) (Chakra Petch, JetBrains Mono for code).
- Layout and grid: first pass in [design-system/layout-grid.md](design-system/layout-grid.md).
- Flow and pacing of the scroll presentation.
- Contained graphics: diagrams, illustrations, 3D.
- ~~Whether the display effects stay, and how strong they are~~: they stay, as one tuned look, in [design-system/display.md](design-system/display.md).
- ~~How the shader layer carries over to the real site~~: the renderer moves into the site with one frozen look and no dial panel, and the DOM shows as plain text without WebGL ([design-system/display.md](design-system/display.md)).
