// Ambient kinds of Midnight Press (same contract as ambient.js): presstype, pieces of type (sorts) drifting down through the hall, turning
// slowly as they go, each letter a sprite baked once per letter and colour; and papermotes, specks of paper dust hanging in the lamplight
// (the look draws them additive). Every position is a function of the index, the time and the drift, so nothing is simulated.
import { W, H, hash, wrap, glow, cached } from './sprites.js';
import { TAU } from '../core/math.js';

export const SORTS = ['a', 'e', 'g', 'R', 'S', 'M', '&', '?', 'q', 'P']; // the letters that drift
const SORT = 48; // a letter sprite's side

const sort = (ch, color) => cached(`press${ch}${color}`, SORT, SORT, (g) => {
  g.font = `700 ${SORT * 0.75}px Georgia, "DejaVu Serif", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(ch, SORT / 2, SORT / 2);
});

function presstype(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  ctx.globalAlpha = a.alpha;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + 501;
    const s = s0 + (s1 - s0) * hash(k + 2);
    const y = wrap(hash(k) * H + t * a.speed * (0.6 + 0.8 * hash(k + 3)), -40, H + 40);
    const x = wrap(hash(k + 1) * (W + 200) + Math.sin(t * 0.4 + hash(k + 4) * TAU) * 40 + drift * 0.3, -100, W + 100);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (hash(k + 4) - 0.5) + hash(k + 4) * TAU);
    ctx.drawImage(sort(SORTS[i % SORTS.length], a.colors[i % a.colors.length]), -s / 2, -s / 2, s, s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function papermotes(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + 901;
    const s = s0 + (s1 - s0) * hash(k + 2);
    const x = wrap(hash(k + 1) * (W + 200) + Math.sin(t * 0.3 + k) * 60 + drift * 0.2, -100, W + 100);
    const y = wrap(hash(k) * H - t * a.speed * hash(k + 3) + Math.sin(t * 0.5 + k) * 20, -20, H + 20);
    ctx.globalAlpha = a.alpha * (0.4 + 0.6 * Math.sin(t * 0.9 + k) ** 2);
    ctx.drawImage(glow(a.colors[i % a.colors.length]), x - s * 2, y - s * 2, s * 4, s * 4);
  }
  ctx.globalAlpha = 1;
}

export const AMBIENT12 = { presstype, papermotes };
