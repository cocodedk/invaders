// The ship's shots in Wanderlight (world 22; lasers-view.js hands the plain ones here instead of drawing streaks): a warm white bar with a pencil
// edge, so it reads on bare parchment, and a soft warm halo at its head, the mockup's shot. Drawn pointing the way it flies (a homing or
// spread shot is not vertical). Enemy fire is violet and keeps its own drawing. Baked once; a frame draws one sprite a shot.
import { cached, rgba } from './sprites.js';
import { PAL } from './wander-kit.js';

export const [BOLT_W, BOLT_H] = [36, 52]; // px, a shot's sprite
export const HEAD = 16; // px from the sprite's top to where the shot is: the middle of its halo, at the bar's head
export const BAR = [4, 20]; // px, the bar's width and length, as the mockup's
const HALO = '255,225,150'; // the mockup's halo colour (rgb), and how strong it starts
const HALO_A = 0.6;
const CORE = '#fffaf0'; // warm white

export const boltSprite = () => cached('wanderBolt', BOLT_W, BOLT_H, (g) => {
  const mid = BOLT_W / 2;
  const halo = g.createRadialGradient(mid, HEAD, 0, mid, HEAD, HEAD);
  halo.addColorStop(0, `rgba(${HALO},${HALO_A})`);
  halo.addColorStop(1, `rgba(${HALO},0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, BOLT_W, HEAD * 2);
  const [w, len] = BAR;
  g.fillStyle = rgba(PAL.pencil, 0.7); // the pencil edge
  g.fillRect(mid - w / 2 - 1.2, HEAD - 1.2, w + 2.4, len + 2.4);
  g.fillStyle = CORE;
  g.fillRect(mid - w / 2, HEAD, w, len);
});

// Every plain shot in shots (a side shot, a trident or a mirror bolt is drawn by its own file), as a bolt turned to its flight.
export function drawBolts(ctx, shots) {
  const sprite = boltSprite();
  for (const p of shots) {
    if (p.broadside || p.trident || p.mirror) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.drawImage(sprite, -BOLT_W / 2, -HEAD);
    ctx.restore();
  }
}
