// The mountain the champion carries (isle-champion.js), painted in colour: a crag of warm rock torn up by its roots, lit by the low sun
// and violet on its far side, its slopes wooded with round trees and spires of pine lit along their sunward edges, a thread of waterfall
// down one face and the healing herbs shining pale green-gold among the trees (their glows are laid by the champion, after the outline).
import { hash, rgba, lin } from './sprites.js';
import { paint, lit, shape, tube, PAINT } from './isle-paint.js';
import { TAU } from '../core/math.js';

// The rock and its torn roots, the woods, the waterfall, the herbs' leaves, how many trees and how wide (of the crag's width); the crag's
// outline (x across -0.5..0.5 of its width, y up 0..1 of its height, the roots under 0; its first 13 points are its top), the herbs on it
// and the waterfall's top and foot, in the same units.
export const MOUNT = {
  rock: '#86606a', root: '#3a1e24', woods: ['#2e5c36', '#3c6a2e', '#24503e'], water: '#d8eef4', herb: '#eaffa0', trees: 64, tree: [0.026, 0.05], facets: 7,
  crag: [[-0.5, 0.02], [-0.44, 0.24], [-0.34, 0.34], [-0.27, 0.56], [-0.15, 0.6], [-0.06, 0.86], [0.04, 1], [0.13, 0.84], [0.22, 0.8],
    [0.3, 0.58], [0.4, 0.48], [0.47, 0.24], [0.5, 0.02], [0.3, -0.12], [0, -0.16], [-0.3, -0.12]],
  herbs: [[-0.32, 0.26], [-0.14, 0.46], [0.03, 0.74], [0.2, 0.56], [0.36, 0.32], [0.04, 0.3]],
  fall: [[0.24, 0.7], [0.27, 0.04]],
};

// The crag's top at x (-0.5..0.5), from its outline.
function top(x) {
  const c = MOUNT.crag.slice(0, 13);
  for (let i = 1; i < c.length; i++) {
    if (x <= c[i][0]) return c[i - 1][1] + ((c[i][1] - c[i - 1][1]) * (x - c[i - 1][0])) / (c[i][0] - c[i - 1][0]);
  }
  return 0;
}

// A tree at (x, y), r wide: a round crown of leaves or, every third one, a spire of pine.
function tree(g, x, y, r, k, u) {
  if (k % 3 === 2) {
    g.beginPath();
    g.moveTo(x, y - r * 2.4);
    for (const [dx, dy] of [[0.5, -1.4], [0.3, -1.4], [0.8, -0.4], [0.4, -0.4], [1, 0.5], [-1, 0.5], [-0.4, -0.4], [-0.8, -0.4], [-0.3, -1.4], [-0.5, -1.4]]) g.lineTo(x + dx * r, y + dy * r);
    g.closePath();
  } else {
    shape(g, Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * TAU;
      const rr = r * (0.85 + 0.3 * hash(k * 13 + i));
      return [x + Math.cos(a) * rr, y - r * 0.6 + Math.sin(a) * rr * 0.9];
    }));
  }
  paint(g, lit(g, MOUNT.woods[k % MOUNT.woods.length], x, y - r, r * 1.3, u), 0.8);
}

// Paint it centred on x with its foot at base, w wide and h tall, lit toward u. Returns where its herbs shine.
export function mount(g, x, base, w, h, u) {
  const at = ([px, py]) => [x + px * w, base - py * h];
  shape(g, MOUNT.crag.map(at));
  paint(g, lit(g, MOUNT.rock, x, base - h * 0.45, w * 0.55, u), 0);
  g.save();
  g.clip();
  g.fillStyle = lin(g, 0, base - h * 0.08, 0, base + h * 0.16, [[0, rgba(MOUNT.root, 0)], [0.45, rgba(MOUNT.root, 0.85)], [1, MOUNT.root]]);
  g.fillRect(x - w, base - h * 0.1, w * 2, h * 0.4); // the torn earth and roots under it
  for (let i = 0; i < MOUNT.facets; i++) { // its faces: lit toward the sun, violet away from it, down from the crags
    const px = -0.42 + (0.84 * (i + 0.5)) / MOUNT.facets;
    const t = at([px, top(px)]);
    const b = at([px + 0.2 * (hash(i + 40) - 0.5), 0.02 + 0.2 * hash(i + 42)]);
    const s = w * 0.09 * (0.6 + hash(i + 41));
    for (const [k, c, a] of [[1, PAINT.sun, 0.1], [-1, PAINT.shadow, 0.22]]) {
      g.beginPath();
      g.moveTo(...t);
      g.lineTo(...b);
      g.lineTo(b[0] + k * u[0] * s, b[1] + k * Math.abs(u[0]) * s * 0.2);
      g.closePath();
      g.fillStyle = rgba(c, a);
      g.fill();
    }
  }
  const [f0, f1] = MOUNT.fall.map(at); // the waterfall down its sunward face
  g.strokeStyle = rgba(MOUNT.water, 0.75);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(...f0);
  g.quadraticCurveTo(f0[0] + w * 0.04, (f0[1] + f1[1]) / 2, ...f1);
  g.stroke();
  g.restore();
  shape(g, MOUNT.crag.map(at));
  paint(g, 'rgba(0,0,0,0)');
  const trees = Array.from({ length: MOUNT.trees }, (_, k) => {
    const px = -0.44 + 0.88 * hash(k * 3 + 1);
    return [px, 0.12 + (top(px) - 0.14) * hash(k * 3 + 2) ** 0.5, k];
  }).sort((a, b) => b[1] - a[1]); // the higher farther: drawn first
  for (const [px, py, k] of trees) tree(g, ...at([px, py]), w * (MOUNT.tree[0] + (MOUNT.tree[1] - MOUNT.tree[0]) * hash(k * 3 + 3)), k, u);
  const herbs = MOUNT.herbs.map(at);
  for (const [hx, hy] of herbs) { // each herb a sprig of three pale leaves round a bright heart
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.8;
      tube(g, [[hx, hy], [hx + Math.cos(a) * 7, hy + Math.sin(a) * 7]], [2.4, 1.2]);
      paint(g, MOUNT.herb, 0.6);
    }
  }
  return herbs;
}
