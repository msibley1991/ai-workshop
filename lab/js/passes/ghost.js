import { inkFns } from "./common.js";

// Phosphor persistence: the previous frame decays and drifts toward the
// persistence color; the brighter of old and new wins. Alpha carries each
// ghost's age in layers (0 where fresh ink was just drawn, +uLayerStep per
// frame), so with more than one layer the color steps 1 -> 2 -> 3 over time.
// uBands switches to hard color bands that hold brightness until the last layer.
export const ghost = /* glsl */ `
  ${inkFns}
  uniform sampler2D tCurrent;
  uniform sampler2D tPrevious;
  uniform float uDecay;
  uniform float uShift;
  uniform vec3 uPersistInk;
  uniform vec3 uPersistInk2;
  uniform vec3 uPersistInk3;
  uniform float uLayers;
  uniform float uLayerStep;
  uniform float uBands;
  uniform vec3 uGroundInk;
  varying vec2 vUv;
  vec3 persistInk(float age) {
    float t = clamp(age, 0.0, uLayers - 1.0);
    vec3 c = mix(uPersistInk, uPersistInk2, clamp(t, 0.0, 1.0));
    return mix(c, uPersistInk3, clamp(t - 1.0, 0.0, 1.0));
  }
  void main() {
    vec3 cur = texture2D(tCurrent, vUv).rgb;
    vec4 last = texture2D(tPrevious, vUv);
    vec3 prev = max(last.rgb - uGroundInk, 0.0);
    // Fresh ink at least as bright as the ghost restarts the clock.
    bool fresh = luma(max(cur - uGroundInk, 0.0)) >= luma(prev * uDecay);
    float age = fresh ? 0.0 : min(last.a + uLayerStep, 2.0);
    // Bands hold brightness until the last layer; blend fades from the start.
    bool hold = uBands > 0.5 && age < uLayers - 1.0;
    prev *= hold ? 1.0 : uDecay;
    float l = luma(prev);
    // Scale the target to the ghost's own brightness, so shift changes hue, not how fast it fades.
    vec3 ink = persistInk(uBands > 0.5 ? floor(age) : age); // bands step, blend glides
    vec3 target = min(ink * (l / max(luma(ink), 0.05)), 1.0);
    // Channels that hit 1 lose brightness; make it up by lifting toward white.
    vec3 room = 1.0 - target;
    target += room * clamp((l - luma(target)) / max(luma(room), 1e-4), 0.0, 1.0);
    // Bands: layers after the first switch in at full strength; shift only tints layer 1.
    float strength = (uBands > 0.5 && age >= 1.0) ? 1.0 : uShift;
    prev = mix(prev, target, strength);
    gl_FragColor = vec4(max(cur, uGroundInk + prev), age);
  }
`;
