// The middle layer of Golden Isle (islecauseway): the warm sea from its horizon down, the low sun's path laid on it in gold, and a
// causeway of great floating stones crossing it toward the island, near and large at the left, small and far at its foot. Torches on
// poles stand beside the stones every few steps (out.lights). The stones are plain: nothing is carved or written on them.
import { lin, rgba, shade, glow, addGlow } from './sprites.js';
import { PAL, SUN, SEA_TOP, MARGIN } from './isle-kit.js';

export const CAUSEWAY = { from: [60, 300], to: [900, SEA_TOP + 12], size: [100, 14], n: 26, torch: 4 }; // its near and far ends, stone sizes, count, torch every n

// A floating stone centred on (x, y), r wide: a rough slab, its top lit, its shadow on the water.
function stone(g, x, y, r, rng) {
  g.fillStyle = rgba(PAL.sea, 0.6);
  g.beginPath();
  g.ellipse(x, y + r * 0.35, r * 1.1, r * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = lin(g, 0, y - r * 0.5, 0, y + r * 0.3, [[0, PAL.stoneLit], [0.35, PAL.stone], [1, shade(PAL.stone, -0.4)]]);
  g.beginPath();
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const j = 0.8 + rng() * 0.3;
    g.lineTo(x + Math.cos(a) * r * j, y + Math.sin(a) * r * 0.45 * j);
  }
  g.fill();
}

function torch(g, x, y, r, rng, out) {
  const pole = r * 2.2;
  g.fillStyle = PAL.smoke;
  g.fillRect(x - 2, y - pole, 4, pole);
  g.fillStyle = PAL.flame;
  g.beginPath();
  g.ellipse(x, y - pole - 6, 4, 9, 0, 0, Math.PI * 2);
  g.fill();
  out.lights.push({ x, y: y - pole - 6, r: 12 + r * 0.4, color: PAL.ember, mode: 'flicker', ph: rng(), a: 0.4 });
}

export function islecauseway(g, w, h, rng, L, out) {
  g.save();
  g.fillStyle = lin(g, 0, SEA_TOP, 0, h, [[0, PAL.seaLit], [0.35, shade(PAL.sea, 0.12)], [1, L.color]]);
  g.fillRect(0, SEA_TOP, w, h - SEA_TOP);
  const sx = SUN.x + MARGIN; // the sun's path on the water
  addGlow(g, glow(PAL.gold), sx, SEA_TOP, SUN.r * 3, 0.35, 0.18);
  for (let y = SEA_TOP + 4; y < h; y += 6 + (y - SEA_TOP) * 0.05) {
    const spread = 30 + (y - SEA_TOP) * 0.9;
    g.fillStyle = rgba(PAL.gold, 0.5 * (1 - (y - SEA_TOP) / h));
    for (let k = 0; k < 3; k++) g.fillRect(sx + (rng() - 0.5) * spread * 2, y, 12 + rng() * 30, 2);
  }
  const { from, to, size, n, torch: every } = CAUSEWAY;
  for (let i = n - 1; i >= 0; i--) { // far to near, so the near stones lie over the far ones
    const u = i / (n - 1);
    const p = u ** 0.7;
    const [x, y] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
    const r = size[0] + (size[1] - size[0]) * p;
    stone(g, x, y, r, rng);
    if (i % every === 0) torch(g, x + r * 0.8, y, r, rng, out);
  }
  g.restore();
}
