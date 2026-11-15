// The middle layer of Rubber Regatta (bathshelf): a shelf skyline along the bath's ledge in front of the taps: unlabelled bottles and
// jars in rose, amber and mint, a loofah standing like a cactus and a toy lighthouse (parallax-bath-props.js), with mountains of foam
// heaped behind and between them and a low bank of foam burying every foot. The layer's top is frame y 620, under the alien rows, so its
// creams may be pale. Nothing tall stands at the feet of the far taps' waterfalls (CLEAR), where the drips land in their crown splashes.
import { PAL } from './sky-bodies-11-kit.js';
import { foamHeap } from './parallax-bath-kit.js';
import { bottle, jar, loofah, lighthouse } from './parallax-bath-props.js';

export const LEDGE = 190; // layer y the things stand on (460 tall: frame 810, under the near layer's foam)
export const CLEAR = { at: [774, 1486], half: 150, top: 150 }; // layer x of the waterfalls' feet, how wide each gap is and how high anything in it may reach (layer y)
export const PROPS = [ // kind, layer x, its shape
  ['bottle', 90, { color: 'rose', w: 56, h: 150, cap: 'cork' }],
  ['jar', 196, { color: 'amber', w: 92, h: 70 }],
  ['loofah', 330, { h: 160 }],
  ['bottle', 452, { color: 'mint', w: 64, h: 124, cap: 'brass', round: true }],
  ['bottle', 540, { color: 'rose', w: 38, h: 86, cap: 'cork' }],
  ['lighthouse', 1012, { h: 176 }],
  ['bottle', 1124, { color: 'amber', w: 52, h: 158, cap: 'brass' }],
  ['jar', 1236, { color: 'mint', w: 84, h: 64 }],
  ['jar', 1704, { color: 'rose', w: 100, h: 80 }],
  ['bottle', 1826, { color: 'mint', w: 50, h: 142, cap: 'cork' }],
  ['bottle', 1918, { color: 'amber', w: 62, h: 98, cap: 'brass', round: true }],
  ['bottle', 2062, { color: 'rose', w: 48, h: 132, cap: 'brass' }],
  ['jar', 2172, { color: 'amber', w: 80, h: 68 }],
];
export const HEAPS = [ // the mountains of foam behind them: layer x, width, height (on LEDGE + 20)
  [40, 220, 120], [262, 200, 104], [566, 110, 96], [1064, 240, 130], [1262, 120, 110], [1748, 220, 140], [1994, 260, 150], [2204, 170, 110],
  [774, 300, 50], [1486, 300, 50],
];
const PAINT = { bottle, jar, loofah, lighthouse };

export function bathshelf(g, w, h, rng, L, out) {
  g.save();
  for (const [x, hw, hh] of HEAPS) foamHeap(g, rng, x, LEDGE + 20, hw, hh);
  for (const [kind, x, o] of PROPS) PAINT[kind](g, x, LEDGE, o, rng, out);
  for (let x = 30; x < w; x += 110 + rng() * 80) foamHeap(g, rng, x, LEDGE + 34, 150 + rng() * 110, 44 + rng() * 22); // the low bank
  g.fillStyle = PAL.foam.mid;
  g.fillRect(0, LEDGE + 30, w, h - LEDGE - 30);
  g.restore();
  for (const [kind, x, o] of PROPS) if (kind === 'jar') out.lights.push({ x: x - o.w * 0.3, y: LEDGE - o.h + 16, r: 18, color: PAL.foam.hi, mode: 'pulse', ph: rng(), a: 0.22 });
}
