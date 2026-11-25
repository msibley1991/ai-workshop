import { inkFns } from "./common.js";

// Trails: the previous frame decays and drifts toward the
// trail colours; the brighter of old and new wins. Alpha carries each
// trail's age in layers (0 where fresh ink was just drawn, +uLayerStep per
// frame), so with more than one layer the color steps 1 -> 2 -> 3 over time.
// uBands switches to hard color bands that hold brightness until the last layer.
// Any real ink in the current frame replaces the trail at once, however dim, so
// a colour change in place cuts; trails only persist on bare ground.
export const trails = /* glsl */ `
  ${inkFns}
  uniform sampler2D tCurrent;
  uniform sampler2D tPrevious;
  uniform float uDecay;
  uniform float uShift;
  uniform vec3 uTrailInk;
  uniform vec3 uTrailInk2;
  uniform vec3 uTrailInk3;
  uniform float uLayers;
  uniform float uLayerStep;
  uniform float uBands;
  uniform float uBlur;
  uniform vec2 uTexel;
  uniform vec3 uGroundInk;
  varying vec2 vUv;
  vec3 trailInk(float age) {
    float t = clamp(age, 0.0, uLayers - 1.0);
    vec3 c = mix(uTrailInk, uTrailInk2, clamp(t, 0.0, 1.0));
    return mix(c, uTrailInk3, clamp(t - 1.0, 0.0, 1.0));
  }
  // Previous frame, softened by uBlur (strength up to 1 px, then wider taps).
  // Only trails (age > 0) spread. A neighbor that isn't a trail (still ink or
  // bare ground) stands in as bare ground for a trail, and as the pixel itself
  // otherwise, so still content is left exactly as it was and never bleeds.
  vec4 previous() {
    vec4 c = texture2D(tPrevious, vUv);
    if (uBlur <= 0.0) return c;
    bool centerTrail = c.a > 1e-4;
    vec3 fallback = centerTrail ? uGroundInk : c.rgb;
    vec3 sum = c.rgb * 0.4;
    float age = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      vec2 dir = vec2(cos(a), sin(a));
      vec4 s = texture2D(tPrevious, vUv + dir * max(uBlur, 1.0) * uTexel);
      bool trail = s.a > 1e-4;
      sum += (trail ? s.rgb : fallback) * 0.075;
      if (trail) age = max(age, s.a);
    }
    vec4 blurred = vec4(sum, centerTrail ? c.a : age);
    return mix(c, blurred, clamp(uBlur, 0.0, 1.0));
  }
  void main() {
    vec3 cur = texture2D(tCurrent, vUv).rgb;
    vec4 last = previous();
    vec3 prev = max(last.rgb - uGroundInk, 0.0);
    // Any real ink is fresh and restarts the clock, even when it's dimmer than
    // the trail (in ink space, accent on a light ground is dimmer than ink), so
    // a colour change lands on its first frame instead of fading in under the
    // old colour's trail. INK_MIN skips near-ground antialiasing.
    const float INK_MIN = 0.02;
    bool fresh = luma(max(cur - uGroundInk, 0.0)) > INK_MIN;
    // Fresh ink replaces the trail outright. A per-channel max with the tinted
    // trail would re-tint still ink every frame: harmless for neutral ink, but
    // it muddies coloured ink (e.g. blue on a light ground) toward the trail colour.
    if (fresh) { gl_FragColor = vec4(cur, 0.0); return; }
    float age = min(last.a + uLayerStep, 2.0);
    // Bands hold brightness until the last layer; blend fades from the start.
    bool hold = uBands > 0.5 && age < uLayers - 1.0;
    prev *= hold ? 1.0 : uDecay;
    float l = luma(prev);
    // Scale the target to the trail's own brightness, so shift changes hue, not how fast it fades.
    vec3 ink = trailInk(uBands > 0.5 ? floor(age) : age); // bands step, blend glides
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
