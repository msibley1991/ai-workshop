// Separable 9-tap gaussian; run once horizontally and once vertically.
export const blur = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 uDirection; // texel step * radius
  varying vec2 vUv;
  void main() {
    vec3 sum = texture2D(tInput, vUv).rgb * 0.227027;
    sum += texture2D(tInput, vUv + uDirection * 1.384615).rgb * 0.316216;
    sum += texture2D(tInput, vUv - uDirection * 1.384615).rgb * 0.316216;
    sum += texture2D(tInput, vUv + uDirection * 3.230769).rgb * 0.070270;
    sum += texture2D(tInput, vUv - uDirection * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;
