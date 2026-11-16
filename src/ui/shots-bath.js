// The ship's shots in Rubber Regatta (world 19; lasers-view.js hands the plain ones here instead of drawing streaks): every shot is a
// CORK popped from the toy, flying narrow end first along its own flight, a tapered plug of speckled cork with a dark outline, so it
// reads on the pale waterline as on the green tile, and two short pale lines of its rush behind it. Two speckle patterns turn as it
// spins; both are baked once (warmCorks, from warm-bath.js), and a frame draws one sprite a shot, no shadow blur.
import { INK, cached, rgba, lin, hash } from './sprites.js';
import { CORK } from './bath-kit.js';

export const [CORK_W, CORK_H] = [20, 48]; // px, a cork's sprite
const TIP = 4; // px from the sprite's top to the cork's narrow end
const LONG = 21; // px from the narrow end to the wide one
const [NARROW, WIDE] = [10, 13.6]; // px across its two ends
export const HEAD = 11; // px from the sprite's top to where the shot is
export const SPIN_RATE = 18; // frames a second the speckles turn

const cork = (v) => cached('cork' + v, CORK_W, CORK_H, (g) => {
  const mid = CORK_W / 2;
  g.beginPath();
  g.moveTo(mid - NARROW / 2, TIP + 1);
  g.lineTo(mid + NARROW / 2, TIP + 1);
  g.lineTo(mid + WIDE / 2, TIP + LONG);
  g.lineTo(mid - WIDE / 2, TIP + LONG);
  g.closePath();
  g.fillStyle = lin(g, mid - WIDE / 2, 0, mid + WIDE / 2, 0, [[0, '#7a4a22'], [0.3, '#f0c48a'], [0.55, CORK], [1, '#6a3c18']]);
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 22; i++) { // the cork's speckle
    g.fillStyle = rgba(i % 3 ? '#5a3010' : '#fff0d0', 0.6);
    g.fillRect(mid - WIDE / 2 + hash(v * 97 + i) * WIDE, TIP + 2 + hash(v * 97 + i + 40) * (LONG - 2), 1.3, 1.3);
  }
  g.restore();
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.stroke();
  g.beginPath(); // the narrow end, seen a little from above
  g.ellipse(mid, TIP + 1, NARROW / 2, 1.8, 0, 0, Math.PI * 2);
  g.fillStyle = '#e8b878';
  g.fill();
  g.lineWidth = 1.4;
  g.stroke();
  g.lineCap = 'round';
  for (const x of [mid - 3, mid + 3]) { // its rush
    g.beginPath();
    g.moveTo(x, TIP + LONG + 4);
    g.lineTo(x, CORK_H - 2);
    g.lineWidth = 1.8;
    g.strokeStyle = rgba('#fffbe8', 0.65);
    g.stroke();
  }
});

export function warmCorks() {
  cork(0);
  cork(1);
}

// Every plain shot in shots (a side shot, a trident or a mirror bolt is drawn by its own file), as a cork.
export function drawCorks(ctx, shots, t) {
  const turn = Math.floor(t * SPIN_RATE);
  for (const p of shots) {
    if (p.broadside || p.trident || p.mirror) continue;
    const img = cork((turn + (p.x | 0)) & 1);
    if (!p.vx) {
      ctx.drawImage(img, p.x - CORK_W / 2, p.y - HEAD);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.drawImage(img, -CORK_W / 2, -HEAD);
    ctx.restore();
  }
}
