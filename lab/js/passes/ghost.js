import { inkFns } from "./common.js";

// Phosphor persistence: the previous frame decays and drifts toward the
// persistence color; the brighter of old and new wins.
export const ghost = /* glsl */ `
  ${inkFns}
  uniform sampler2D tCurrent;
  uniform sampler2D tPrevious;
  uniform float uDecay;
  uniform float uShift;
  uniform vec3 uPersistInk;
  uniform vec3 uGroundInk;
  varying vec2 vUv;
  void main() {
    vec3 cur = texture2D(tCurrent, vUv).rgb;
    vec3 prev = max(texture2D(tPrevious, vUv).rgb - uGroundInk, 0.0) * uDecay;
    prev = mix(prev, uPersistInk * luma(prev), uShift);
    gl_FragColor = vec4(max(cur, uGroundInk + prev), 1.0);
  }
`;
