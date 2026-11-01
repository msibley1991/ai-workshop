// Shared GLSL. All effects work in "ink space": light themes are inverted so
// that ink is always bright on dark, which lets glow and ghosting stay additive.
export const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const inkFns = /* glsl */ `
  uniform float uLight;
  vec3 toInk(vec3 c) { return mix(c, 1.0 - c, uLight); }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;
