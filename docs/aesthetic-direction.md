# Aesthetic direction

Status: **exploratory**. Nothing here is locked; values get tuned in the lab (`~/ai-workshop-lab`) before they become tokens.

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
- **Projector first** (a presenter preset that survives wash-out), web second (a calmer reader preset).
- Light and dark grounds both stay in play until tested.

## Open questions
- How the 3D is rendered: technical-illustration outlines, wireframe, solid, or something else.
- Final palette and the light vs. dark default.
- Final typefaces and type scale.
- How the shader layer carries over to the real site. The lab uses an invisible DOM text layer under a WebGL render, so text stays selectable.
