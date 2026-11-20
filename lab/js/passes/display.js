import { inkFns } from "./common.js";

// Final pass at full resolution: nearest-neighbor upscale, glow, rolling wave, row jitter,
// flicker, back to display colors, then the scanline / pixel grid overlay.
export const display = /* glsl */ `
  ${inkFns}
  uniform sampler2D tImage;     // nearest
  uniform sampler2D tGlow;      // linear
  uniform vec2 uBufferSize;     // emulated pixels
  uniform vec2 uScreenSize;     // CSS px
  uniform float uPixelScale;
  uniform float uDpr;
  uniform float uGlow;
  uniform float uTint;
  uniform vec3 uPhosphorInk;
  uniform vec3 uGroundInk;
  uniform float uJitter;
  uniform float uFlicker;
  uniform float uTime;
  uniform float uWarpStrength;  // emulated pixels
  uniform float uWarpSize;      // fraction of screen height
  uniform float uWarpPeriod;    // seconds between waves (0 = off)
  uniform float uWarpSpeed;     // seconds to roll top to bottom
  uniform float uWarpRandom;
  uniform int uGridMode;        // 0 scanlines, 1 pixel grid, 2 off
  uniform float uGridOpacity;
  uniform float uGridPitch;     // emulated pixels
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  // Rolling wave: horizontal shift for the row at y (0 top, 1 bottom). Waves
  // start once per period (later by up to randomness * period) and roll past
  // the screen in uWarpSpeed seconds; earlier slots are checked so they overlap.
  float warpOffset(float y, float row) {
    if (uWarpStrength <= 0.0 || uWarpPeriod <= 0.0) return 0.0;
    float k0 = floor(uTime / uWarpPeriod);
    float total = 0.0;
    for (int i = 0; i < 4; i++) {
      float k = k0 - float(i);
      float start = (k + hash(k * 7.13 + 1.0) * uWarpRandom) * uWarpPeriod;
      float prog = (uTime - start) / uWarpSpeed;
      if (prog < 0.0 || prog > 1.0) continue;
      float size = uWarpSize * (1.0 + uWarpRandom * (hash(k * 3.71 + 2.0) - 0.5));
      float d = (y - mix(-size, 1.0 + size, prog)) / size;
      float amp = uWarpStrength * (1.0 + uWarpRandom * (hash(k * 1.93 + 3.0) - 0.5));
      float ragged = 1.0 + uWarpRandom * (hash(row + k * 13.0 + floor(uTime * 30.0)) - 0.5) * 2.0;
      total += amp * exp(-d * d * 4.0) * sin(d * 3.14159) * ragged; // shears one way, then back
    }
    return total;
  }

  void main() {
    // CSS px from the top-left, mapped into the buffer (which may overhang the screen).
    vec2 css = vec2(gl_FragCoord.x, uScreenSize.y * uDpr - gl_FragCoord.y) / uDpr;
    vec2 px = css / uPixelScale;
    float row = floor(px.y);
    px.x += warpOffset(px.y / uBufferSize.y, row);
    px.x += (hash(row + floor(uTime * 24.0)) - 0.5) * uJitter;
    vec2 uv = vec2(px.x / uBufferSize.x, 1.0 - px.y / uBufferSize.y);

    vec3 ink = texture2D(tImage, uv).rgb;
    vec3 glow = max(texture2D(tGlow, uv).rgb - uGroundInk, 0.0);
    glow = mix(glow, uPhosphorInk * luma(glow), uTint);
    ink += glow * uGlow;
    ink *= 1.0 - uFlicker * hash(floor(uTime * 60.0));

    vec3 color = mix(ink, 1.0 - ink, uLight);

    float cell = uGridPitch * uPixelScale * uDpr; // device px per grid cell
    vec2 dev = vec2(gl_FragCoord.x, uScreenSize.y * uDpr - gl_FragCoord.y);
    float thickness = max(1.0, cell * 0.3);
    float line = 0.0;
    if (uGridMode == 0) line = step(cell - thickness, mod(dev.y, cell));
    if (uGridMode == 1) line = max(step(cell - thickness, mod(dev.y, cell)), step(cell - thickness, mod(dev.x, cell)));
    color *= 1.0 - uGridOpacity * line;

    gl_FragColor = vec4(color, 1.0);
  }
`;
