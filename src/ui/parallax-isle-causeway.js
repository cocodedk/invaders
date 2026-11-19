// The middle layer of Golden Isle (islecauseway): the warm sea from its horizon down, the low sun's path laid on it in gold, and a
// causeway of great floating stones crossing it toward the island, near and large at the left, small and far at its foot. Torches on
// poles stand beside the stones every few steps (out.lights). The stones are plain: nothing is carved or written on them. To the right of
// the sun's path the demon king's giant brother sleeps on a rocky islet (isle-giant.js), wholly under the horizon, so he never covers
// the sky's figures.
import { H, lin, rgba, shade, glow, addGlow } from './sprites.js';
import { PAL, SUN, SEA_TOP, MARGIN, ISLE } from './isle-kit.js';
import { warrior } from './isle-host.js';
import { giant, GIANT } from './isle-giant.js';

// Its near end (behind the near shore's tip) and far end (the island's foot) in the frame, the stones' sizes there, their count, a torch
// every n stones; the host crossing on it (the owner's cast, 2026-11-19): who walks each stone in turn, and how tall against a stone.
export const ISLET = [1390, 905]; // the giant's islet: its box's bottom left in the frame
export const CAUSEWAY = { from: [380, 1000], to: [772, ISLE.sea + 12], size: [62, 12], n: 20, torch: 4, ranks: [['carry', 'shoulder'], ['shoulder'], ['carry', 'heave'], ['shoulder', 'carry']], tall: 1.05 };

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
  const X = (x) => x + MARGIN; // frame x and y to this layer's
  const Y = (y) => y - (H - h);
  g.fillStyle = lin(g, 0, SEA_TOP, 0, h, [[0, PAL.seaLit], [0.35, shade(PAL.sea, 0.12)], [1, L.color]]);
  g.fillRect(0, SEA_TOP, w, h - SEA_TOP);
  const sx = SUN.x + MARGIN; // the sun's path on the water
  addGlow(g, glow(PAL.gold), sx, SEA_TOP, SUN.r * 3, 0.35, 0.18);
  for (let y = SEA_TOP + 4; y < h; y += 6 + (y - SEA_TOP) * 0.05) {
    const spread = 30 + (y - SEA_TOP) * 0.9;
    g.fillStyle = rgba(PAL.gold, 0.5 * (1 - (y - SEA_TOP) / h));
    for (let k = 0; k < 3; k++) g.fillRect(sx + (rng() - 0.5) * spread * 2, y, 12 + rng() * 30, 2);
  }
  const [ix, iy] = ISLET;
  giant(g, X(ix), Y(iy), Math.atan2(SUN.y - (iy - GIANT.h / 2), SUN.x - (ix + GIANT.w / 2)));
  const { from, to, size, n, torch: every, ranks, tall } = CAUSEWAY;
  for (let i = n - 1; i >= 0; i--) { // far to near, so the near stones and their walkers lie over the far ones
    const p = (i / (n - 1)) ** 0.8;
    const [x, y] = [X(from[0] + (to[0] - from[0]) * p), Y(from[1] + (to[1] - from[1]) * p)];
    const r = size[0] + (size[1] - size[0]) * p;
    stone(g, x, y, r, rng);
    const rank = ranks[i % ranks.length];
    for (const [k, pose] of rank.entries()) warrior(g, pose, x + (k - (rank.length - 1) / 2) * r * 0.7, y - r * 0.12, r * tall);
    if (i % every === 0) torch(g, x + r * 0.9, y, r, rng, out);
  }
  g.restore();
}
