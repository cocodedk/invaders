// The ship's shots in Golden Isle (world 21; lasers-view.js hands the plain ones here instead of drawing streaks): every shot is a
// golden arrow whose tip burns in a cool colour (ARROW_HUES: emerald, turquoise, azure, violet) round a white-hot core, with
// fletching of the same colour, drawn pointing the way it flies, so an arrow the returning-arrow rule has turned (core/quiver.js)
// points back at its quiver point. Nothing on it is red or orange: the host's fire is, and the owner took the first, flame-tipped
// arrows for incoming shots (2026-11-19). Each shot takes the next colour the first time it is drawn, so a volley flies in
// several. Baked once a colour; a frame draws one sprite a shot.
import { cached, rgba, lin, rad } from './sprites.js';
import { ink, path, GOLD, GOLD_D, GOLD_P } from './aliens/w21-kit.js';

export const [ARROW_W, ARROW_H] = [24, 64]; // px, an arrow's sprite
export const HEAD = 8; // px from the sprite's top to where the shot is, inside its arrowhead
export const ARROW_HUES = ['#3ee07a', '#38dcd8', '#4a9cff', '#a878ff']; // emerald, turquoise, azure, violet, in the order shots take them
const CORE = '#ffffff'; // the white heat at the tip
const DARK = 'rgba(20,8,12,0.75)'; // the shaft's dark edge, so it reads on the gold low in the sky

// An arrow tipped in hue, painted into g (ARROW_W x ARROW_H, pointing up).
export function paintArrow(g, hue) {
  const mid = ARROW_W / 2;
  g.fillStyle = rad(g, mid, 12, 0, mid, [[0, CORE], [0.3, hue], [0.65, rgba(hue, 0.5)], [1, rgba(hue, 0)]]);
  g.fillRect(0, 0, ARROW_W, ARROW_W); // the glow round the tip
  g.beginPath(); // and its tongue trailing back along the shaft
  g.moveTo(mid, 4);
  g.quadraticCurveTo(mid + 9, 16, mid, 36);
  g.quadraticCurveTo(mid - 9, 16, mid, 4);
  g.fillStyle = lin(g, 0, 4, 0, 36, [[0, rgba(hue, 0.95)], [0.5, rgba(hue, 0.6)], [1, rgba(hue, 0)]]);
  g.fill();
  g.fillStyle = DARK; // the shaft, edged dark
  g.fillRect(mid - 2.4, 15, 4.8, 45);
  g.fillStyle = lin(g, mid - 1.3, 0, mid + 1.3, 0, [[0, GOLD_D], [0.4, GOLD_P], [1, GOLD]]);
  g.fillRect(mid - 1.3, 15, 2.6, 44);
  for (const s of [-1, 1]) { // the fletching
    path(g, [[mid + s, 47], [mid + s * 7, 53], [mid + s * 7, 62], [mid + s, 56]]);
    ink(g, hue, 1);
  }
  path(g, [[mid, 3], [mid + 5.2, 17], [mid, 14], [mid - 5.2, 17]]); // the arrowhead
  ink(g, lin(g, mid - 4, 0, mid + 4, 0, [[0, GOLD_P], [0.5, CORE], [1, GOLD]]), 1);
}

export const arrowSprite = (hue = ARROW_HUES[0]) => cached(`isleArrow${hue}`, ARROW_W, ARROW_H, (g) => paintArrow(g, hue));

const hues = new WeakMap(); // a shot -> the colour it took the first time it was drawn
let taken = 0; // colours handed out so far

export function hueOf(shot) {
  let hue = hues.get(shot);
  if (!hue) hues.set(shot, (hue = ARROW_HUES[taken++ % ARROW_HUES.length]));
  return hue;
}

// Every plain shot in shots (a side shot, a trident or a mirror bolt is drawn by its own file), as an arrow turned to its flight.
export function drawArrows(ctx, shots) {
  for (const p of shots) {
    if (p.broadside || p.trident || p.mirror) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.drawImage(arrowSprite(hueOf(p)), -ARROW_W / 2, -HEAD);
    ctx.restore();
  }
}
