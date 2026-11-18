// Ambient kinds of Golden Isle (same contract as ambient.js): isleembers, sparks rising from the burning city on the warm air, each
// flickering (the look draws them additive), and marigolds, petals tumbling down through the dusk, each a sprite baked once per colour.
// Every position is a function of the index, the time and the drift, so nothing is simulated.
import { W, H, hash, wrap, glow, cached } from './sprites.js';
import { TAU } from '../core/math.js';

const PETAL = 32; // a petal sprite's side

const petal = (color) => cached(`islepetal${color}`, PETAL, PETAL, (g) => {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(PETAL / 2, 2);
  g.quadraticCurveTo(PETAL - 4, PETAL / 2, PETAL / 2, PETAL - 2);
  g.quadraticCurveTo(4, PETAL / 2, PETAL / 2, 2);
  g.fill();
});

function isleembers(ctx, a, t, drift) {
  const [s0, s1] = a.size;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + 1301;
    const s = s0 + (s1 - s0) * hash(k + 2);
    const y = wrap(hash(k) * H - t * a.speed * (0.5 + hash(k + 3)), -20, H + 20);
    const x = wrap(hash(k + 1) * (W + 200) + Math.sin(t * 1.7 + hash(k + 4) * TAU) * 24 + drift * 0.4, -100, W + 100);
    ctx.globalAlpha = a.alpha * (0.5 + 0.5 * Math.sin(t * 8 + k) ** 2);
    ctx.drawImage(glow(a.colors[i % a.colors.length]), x - s * 3, y - s * 3, s * 6, s * 6);
  }
  ctx.globalAlpha = 1;
}

function marigolds(ctx, a, t, drift, wind = 0) {
  const [s0, s1] = a.size;
  ctx.globalAlpha = a.alpha;
  for (let i = 0; i < a.n; i++) {
    const k = i * 5 + 1601;
    const s = s0 + (s1 - s0) * hash(k + 2);
    const y = wrap(hash(k) * H + t * a.speed * (0.6 + 0.8 * hash(k + 3)), -40, H + 40);
    const x = wrap(hash(k + 1) * (W + 200) + Math.sin(t * 0.6 + hash(k + 4) * TAU) * 50 + (drift + wind) * 0.3, -100, W + 100);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (hash(k + 4) - 0.5) * 2 + hash(k + 4) * TAU);
    ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + k))); // it tumbles
    ctx.drawImage(petal(a.colors[i % a.colors.length]), -s / 2, -s / 2, s, s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export const AMBIENT13 = { isleembers, marigolds };
