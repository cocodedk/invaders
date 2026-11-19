// World 21's sky body (registry; BODIES13): isledusk, dusk over a warm sea, baked once over the gradient the builder laid (look.sky,
// deep violet overhead to crimson and gold at the horizon). Low monsoon banks and thin streaks of cloud lie round a great low sun, lit gold
// and crimson on the sun's side; high above, arrows of light streak across like comets, their heads a glow and their tails fading. The
// vulture glides high on the left, painted in full colour, and the champion leaps out of the sunset toward the city low on the
// right, painted in full colour (the owner's cast, 2026-11-19). The sun's disc sits on the horizon, under the alien rows. Nothing here
// animates.
import { glow, soft, hash, rgba, lin, rad, addGlow } from './sprites.js';
import { makeRng } from '../core/rng.js';
import { bank, lobes } from './cloud-kit.js';
import { stars, horizonGlow } from './sky-paint.js';
import { PAL, SUN, ISLE, CAST, fireAt } from './isle-kit.js';
import { champion, CHAMPION } from './isle-champion.js';
import { vulture } from './isle-vulture.js';

export const CLOUDS = { base: 776, seed: 2121, towers: [[70, 360, 150], [1225, 250, 96], [1850, 380, 170]], streaks: [[180, 600, 520, 14], [1060, 560, 420, 10], [1560, 620, 460, 12], [520, 660, 360, 9]] }; // low banks on the horizon, [x, width, height], and thin lit streaks [x, y, length, thickness], the sun left clear
export const SMOKE = { r: 10, grow: 1.1, rise: 0.9, lean: 1.2, steps: 22, alpha: 0.75, top: 120 }; // the thin smoke over each burning roof: its first puff, growth, rise per puff, lean, puffs, alpha, how high it rises
export const TONES = { lit: '#f2c070', gold: '#b86a34', rose: '#4a1a2c', dusk: '#30122c', shade: '#12081a' }; // monsoon cloud, dark, lit gold and crimson
// The streaking arrows: each one's head [x, y] and length, laid clear of the cast's boxes (CAST; isle-cast.test.js), their slope, and the
// glows at the head and along the tail (emberAt: how far back along it, out of its length).
export const ARROWS = { at: [[900, 170, 340], [1240, 300, 420], [1400, 200, 300], [300, 420, 300], [1720, 160, 280], [1160, 380, 220]], drop: 0.18, head: 26, ember: 40, emberAt: 0.2 };
// The birds of ill omen wheeling over the burning city: each flock's middle, how wide it wheels, how many, a bird's span.
export const BIRDS = { flocks: [[760, 230, 110, 7], [1110, 250, 90, 6], [1600, 150, 70, 4]], span: [9, 16], seed: 2123 };

// Low monsoon banks on the horizon (cloud-kit.js), lit from the low sun, and thin streaks of cloud lit gold underneath: the owner
// asked for room (2026-11-19), so the banks stay low and the sky's own things (the cast, arrows, smoke and birds) fill it above them.
function clouds(g) {
  const rng = makeRng(CLOUDS.seed);
  for (const [x, w, h] of CLOUDS.towers) bank(g, lobes(rng, x, CLOUDS.base, w, h), TONES, SUN, 0.85, 0.25);
  for (const [x, y, len, th] of CLOUDS.streaks) {
    for (let k = 0; k < 12; k++) {
      const u = k / 11;
      const r = len * 0.12 * (1 - Math.abs(u - 0.5));
      g.globalAlpha = 0.4;
      g.drawImage(soft(TONES.rose), x + u * len - r, y - th, r * 2, th * 2);
      g.globalAlpha = 0.3;
      g.drawImage(soft(TONES.gold), x + u * len - r * 0.8, y + th * 0.2, r * 1.6, th * 1.1);
    }
  }
  g.globalAlpha = 1;
}

// An arrow of light: a tail fading from gold to nothing behind a bright head.
function arrows(g) {
  g.lineCap = 'round';
  for (const [x, y, len] of ARROWS.at) {
    const [tx, ty] = [x - len, y - len * ARROWS.drop];
    g.strokeStyle = lin(g, tx, ty, x, y, [[0, rgba(PAL.goldPale, 0)], [0.8, rgba(PAL.gold, 0.35)], [1, rgba(PAL.goldPale, 0.8)]]);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(tx, ty);
    g.lineTo(x, y);
    g.stroke();
    addGlow(g, glow(PAL.goldPale), x, y, ARROWS.head, 0.55);
    addGlow(g, glow(PAL.ember), x - len * ARROWS.emberAt, y - len * ARROWS.emberAt * ARROWS.drop, ARROWS.ember, 0.18, 0.4);
  }
}

// The birds wheeling over the city: small dark kites, wings bowed, their undersides warm with the fire and the sunset.
function birds(g) {
  const rng = makeRng(BIRDS.seed);
  for (const [cx, cy, r, n] of BIRDS.flocks) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng();
      const [x, y, s] = [cx + Math.cos(a) * r * (0.5 + rng() * 0.5), cy + Math.sin(a) * r * 0.4, BIRDS.span[0] + rng() * (BIRDS.span[1] - BIRDS.span[0])];
      g.fillStyle = PAL.smoke;
      g.beginPath();
      g.moveTo(x - s, y - s * 0.2);
      g.quadraticCurveTo(x - s * 0.5, y - s * 0.5, x, y);
      g.quadraticCurveTo(x + s * 0.5, y - s * 0.5, x + s, y - s * 0.2);
      g.quadraticCurveTo(x + s * 0.5, y - s * 0.2, x, y + s * 0.18);
      g.quadraticCurveTo(x - s * 0.5, y - s * 0.2, x - s, y - s * 0.2);
      g.fill();
      g.strokeStyle = rgba(PAL.ember, 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - s * 0.8, y - s * 0.12);
      g.quadraticCurveTo(x - s * 0.4, y - s * 0.12, x, y + s * 0.18);
      g.quadraticCurveTo(x + s * 0.4, y - s * 0.12, x + s * 0.8, y - s * 0.12);
      g.stroke();
    }
  }
}

// Thin smoke rising from each burning roof of the city (ISLE.fires), leaning away on the evening wind, its foot lit by the fire.
function smoke(g) {
  for (const [i, f] of ISLE.fires.entries()) {
    const [fx, fy] = fireAt(f);
    const { grow, rise, lean, steps, alpha } = SMOKE;
    for (let k = 0, y = fy, r = SMOKE.r; k < steps && y > SMOKE.top; k++, y -= r * rise, r *= grow) {
      const x = fx + k * k * lean + (hash(i * 50 + k) - 0.5) * r * 0.5;
      g.globalAlpha = alpha * (1 - k / (steps + 1));
      g.drawImage(soft(k < 5 ? PAL.smokeLit : PAL.smoke), x - r, y - r, r * 2, r * 2);
      if (k < 3) addGlow(g, glow(PAL.ember), x, y + r * 0.3, r, 0.25 * (1 - k / 3));
    }
  }
  g.globalAlpha = 1;
}

// The cast in the sky (the owner's, 2026-11-19), each lit toward the sun: the vulture gliding high on the left, the champion leaping
// out of the sunset toward the city on the right with the mountain held up (painted in full colour, lit from his middle, and over the
// sun's glow so it does not wash him). On the boss level he stands smaller in the low right corner (CAST.finale), the one place the
// king's widest reach never comes in any phase, so the king never covers him (isle-cast.test.js sweeps the king's parts).
const toward = ([x, y]) => Math.atan2(SUN.y - y, SUN.x - x);
function champ(g, level) {
  const [x, y, k] = level?.boss ? CAST.finale : [...CAST.champion, 1];
  champion(g, x, y, toward([x + (CHAMPION.w * k) / 2, y + (CHAMPION.h * k) / 2]), k);
}

function isledusk(g, _look, level) {
  g.save();
  stars(g, 70, 21, 240, 0.4);
  horizonGlow(g, PAL.ember, 0.3, SUN.y - 160);
  addGlow(g, glow(PAL.crimson), SUN.x, SUN.y, SUN.r * 9, 0.35, 0.45); // the wide dusk round the sun
  clouds(g);
  smoke(g);
  birds(g);
  vulture(g, CAST.vulture[0], CAST.vulture[1], toward(CAST.vulture));
  addGlow(g, glow(PAL.ember), SUN.x, SUN.y, SUN.r * 4, 0.5);
  champ(g, level);
  g.fillStyle = rad(g, SUN.x, SUN.y, 0, SUN.r, [[0, PAL.goldPale], [0.75, PAL.gold], [1, PAL.ember]]); // gold to its core, not white: a shot still reads on it
  g.beginPath();
  g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  g.fill();
  arrows(g);
  g.restore();
}

export const BODIES13 = { isledusk };
