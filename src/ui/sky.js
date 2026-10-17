// The sky: the world's gradient plus its baked body (sky-bodies.js), one 1920 x 1080 canvas.
// level (optional) lets a body depend on the level: World 8's black hole steps back on the boss
// level (sky-bodies-2.js wellLight).
import { W, H, makeCanvas } from './sprites.js';
import { BODIES } from './sky-bodies.js';

export function buildSky(look, level = null) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  for (const [stop, color] of look.sky) gr.addColorStop(stop, color);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  BODIES[look.body]?.(g, look, level);
  return c;
}
