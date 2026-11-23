// Pointer and keyboard, translated to view coordinates and plain key names.
// The game logic in main.js decides what a click means; this file only reports
// where it landed and which key fell.
export function createInput(canvas, renderer, handlers) {
  canvas.addEventListener('pointermove', (event) => {
    const p = renderer.toView(event.clientX, event.clientY);
    handlers.onMove(p.x, p.y);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = renderer.toView(event.clientX, event.clientY);
    handlers.onPress(p.x, p.y);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    handlers.onKey(event.key);
  });
  return {};
}
