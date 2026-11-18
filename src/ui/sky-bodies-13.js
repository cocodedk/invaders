// World 21's sky body (registry; BODIES13): isledusk, dusk over a warm sea, baked once over the gradient the builder laid (look.sky,
// deep violet overhead to crimson and gold at the horizon). Towering monsoon clouds stand round a great low sun, their dark bodies lit
// gold and crimson on the sun's side; high above, arrows of light streak across like comets, their heads a glow and their tails fading.
// The sun's disc sits on the horizon, under the alien rows; the clouds are dark where the fight is, lit only at their edges. Nothing here animates.
import { W, glow, soft, hash, rgba, lin, rad, addGlow } from './sprites.js';
import { makeRng } from '../core/rng.js';
import { bank, lobes } from './cloud-kit.js';
import { stars, horizonGlow } from './sky-paint.js';
import { PAL, SUN, ISLE } from './isle-kit.js';

export const CLOUDS = { base: 690, seed: 2121, towers: [[150, 440, 540], [640, 360, 440], [1010, 290, 380], [1830, 470, 560]] }; // the cloud towers' foot and [x, width, height], a gap left at the sun
export const TONES = { lit: '#f2c070', gold: '#b86a34', rose: '#4a1a2c', dusk: '#30122c', shade: '#12081a' }; // monsoon cloud, dark, lit gold and crimson
export const ARROWS = { n: 6, y: [120, 300], len: [260, 460], drop: 0.18 }; // the streaking arrows: how many, their height, length, slope

// The monsoon towers, each a cumulus bank (cloud-kit.js) lit from the low sun: gold crowns and crimson flanks over a dark violet foot.
function clouds(g) {
  const rng = makeRng(CLOUDS.seed);
  for (const [x, w, h] of CLOUDS.towers) bank(g, lobes(rng, x, CLOUDS.base, w, h), TONES, SUN, 0.9, 0.25);
}

// An arrow of light: a tail fading from gold to nothing behind a bright head.
function arrows(g) {
  const [y0, y1] = ARROWS.y;
  const [l0, l1] = ARROWS.len;
  g.lineCap = 'round';
  for (let i = 0; i < ARROWS.n; i++) {
    const x = hash(i + 500) * W;
    const y = y0 + (y1 - y0) * hash(i + 501);
    const len = l0 + (l1 - l0) * hash(i + 502);
    const [tx, ty] = [x - len, y - len * ARROWS.drop];
    g.strokeStyle = lin(g, tx, ty, x, y, [[0, rgba(PAL.goldPale, 0)], [0.8, rgba(PAL.gold, 0.35)], [1, rgba(PAL.goldPale, 0.8)]]);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(x, y);
    g.stroke();
    addGlow(g, glow(PAL.goldPale), x, y, 26, 0.55);
    addGlow(g, glow(PAL.ember), x - len * 0.2, y - len * 0.2 * ARROWS.drop, 40, 0.18, 0.4);
  }
}

// Smoke rising from the burning quarters of the city (ISLE.fires), leaning away on the evening wind, its foot lit by the fires.
function smoke(g) {
  for (const [i, fx] of ISLE.fires.entries()) {
    for (let k = 0, y = ISLE.fireY, r = 30; k < 16 && y > ARROWS.y[1]; k++, y -= r * 0.7, r *= 1.1) {
      const x = fx + k * k * 1.6 + (hash(i * 50 + k) - 0.5) * r * 0.4;
      g.globalAlpha = 0.75 * (1 - k / 17);
      g.drawImage(soft(k < 6 ? PAL.smokeLit : PAL.smoke), x - r, y - r, r * 2, r * 2);
      if (k < 4) addGlow(g, glow(PAL.ember), x, y + r * 0.3, r * 0.9, 0.2 * (1 - k / 4));
    }
  }
  g.globalAlpha = 1;
}

function isledusk(g) {
  g.save();
  stars(g, 70, 21, 240, 0.4);
  horizonGlow(g, PAL.ember, 0.3, SUN.y - 160);
  addGlow(g, glow(PAL.crimson), SUN.x, SUN.y, SUN.r * 9, 0.35, 0.45); // the wide dusk round the sun
  clouds(g);
  smoke(g);
  addGlow(g, glow(PAL.ember), SUN.x, SUN.y, SUN.r * 4, 0.5);
  g.fillStyle = rad(g, SUN.x, SUN.y, 0, SUN.r, [[0, PAL.goldPale], [0.75, PAL.gold], [1, PAL.ember]]); // gold to its core, not white: a shot still reads on it
  g.beginPath();
  g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  g.fill();
  arrows(g);
  g.restore();
}

export const BODIES13 = { isledusk };
