// The ship's shots in Golden Isle (world 21; lasers-view.js hands the plain ones here instead of drawing streaks): every shot is a
// GOLDEN ARROW with a flaming tip, a gold shaft and vermilion fletching, drawn pointing the way it flies, so an arrow the returning-arrow
// rule has turned (core/quiver.js) points back at its quiver point. Baked once, its flame with it; a frame draws one sprite a shot.
import { cached, rgba, lin, rad } from './sprites.js';
import { PAL } from './isle-kit.js';
import { ink, path, VERMILION, GOLD, GOLD_D, GOLD_P } from './aliens/w21-kit.js';

export const [ARROW_W, ARROW_H] = [24, 64]; // px, an arrow's sprite
export const HEAD = 8; // px from the sprite's top to where the shot is, inside its arrowhead
const DARK = 'rgba(20,8,12,0.75)'; // the shaft's dark edge, so it reads on the gold low in the sky

export const arrowSprite = () => cached('isleArrow', ARROW_W, ARROW_H, (g) => {
  const mid = ARROW_W / 2;
  g.fillStyle = rad(g, mid, 12, 0, mid, [[0, '#fff3c0'], [0.3, PAL.flame], [0.65, rgba(PAL.ember, 0.5)], [1, rgba(PAL.ember, 0)]]);
  g.fillRect(0, 0, ARROW_W, ARROW_W); // the fire round the tip
  g.beginPath(); // and its tongue licking back along the shaft
  g.moveTo(mid, 4);
  g.quadraticCurveTo(mid + 9, 16, mid, 36);
  g.quadraticCurveTo(mid - 9, 16, mid, 4);
  g.fillStyle = lin(g, 0, 4, 0, 36, [[0, rgba(PAL.flame, 0.95)], [0.5, rgba(PAL.ember, 0.6)], [1, rgba(PAL.ember, 0)]]);
  g.fill();
  g.fillStyle = DARK; // the shaft, edged dark
  g.fillRect(mid - 2.4, 15, 4.8, 45);
  g.fillStyle = lin(g, mid - 1.3, 0, mid + 1.3, 0, [[0, GOLD_D], [0.4, GOLD_P], [1, GOLD]]);
  g.fillRect(mid - 1.3, 15, 2.6, 44);
  for (const s of [-1, 1]) { // the fletching
    path(g, [[mid + s, 47], [mid + s * 7, 53], [mid + s * 7, 62], [mid + s, 56]]);
    ink(g, VERMILION, 1);
  }
  path(g, [[mid, 3], [mid + 5.2, 17], [mid, 14], [mid - 5.2, 17]]); // the arrowhead
  ink(g, lin(g, mid - 4, 0, mid + 4, 0, [[0, GOLD_P], [0.5, '#ffffff'], [1, GOLD]]), 1);
});

// Every plain shot in shots (a side shot, a trident or a mirror bolt is drawn by its own file), as an arrow turned to its flight.
export function drawArrows(ctx, shots) {
  const img = arrowSprite();
  for (const p of shots) {
    if (p.broadside || p.trident || p.mirror) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.drawImage(img, -ARROW_W / 2, -HEAD);
    ctx.restore();
  }
}
