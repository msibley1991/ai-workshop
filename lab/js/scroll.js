// Tracks page scroll. The DOM scrolls natively (so selection and find work);
// the renderer draws at a quantized offset so content steps one grid line at a time.

let lastY = window.scrollY;
let lastT = performance.now();
let velocity = 0; // smoothed, in CSS px per second

export function updateScroll(stepPx, snap) {
  const now = performance.now();
  const y = window.scrollY;
  const dt = Math.max((now - lastT) / 1000, 1e-3);
  const instant = Math.abs(y - lastY) / dt;
  velocity += (instant - velocity) * 0.25;
  lastY = y;
  lastT = now;

  const renderY = snap ? Math.round(y / stepPx) * stepPx : y;
  return { renderY, velocity };
}
