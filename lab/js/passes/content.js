import { inkFns } from "./common.js";

// Composites the transparent text canvas over the ground color, optionally
// thresholding antialiased edges toward 1-bit, and converts to ink space.
export const content = /* glsl */ `
  ${inkFns}
  uniform sampler2D tContent;
  uniform vec3 uGround;
  uniform float uHard;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(tContent, vUv);
    float a = mix(c.a, step(0.5, c.a), uHard);
    gl_FragColor = vec4(toInk(mix(uGround, c.rgb, a)), 1.0);
  }
`;
