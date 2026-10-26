// What the tests of world 18's backdrop share (storm-*.test.js): the look as the game has it, the canvases that were made (so a sprite baked in the
// middle of a fight can be counted), colour maths, and helpers that draw one flourish at one time and hand back every drawImage. Import this
// before anything under src/ui: it installs the canvases.
import { readdirSync, readFileSync } from 'node:fs';
import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';
export { contrast, hue, stateful } from './glass-env-kit.js';
export { tracker };

installCanvas(64);
export const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const c = stand(...a);
  made.push(c);
  return c;
};
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
export const look = LOOKS[17];
export { drawFlourishes };
export const [W, H] = [1920, 1080];
export const FAR_TOP = H - 700; // the far layer's top
export const PHASE = { sky: [0, 0], far: [-160, FAR_TOP], mid: [-160, H - 460], near: [0, 0], front: [0, 0], screen: [0, 0] }; // [x0, top] each phase's hook gets (ship at the middle)

export const env = (names, t, quality = 1) => ({
  v: { look: { ...look, flourish: names }, layers: [], cache: {} }, world: { ship: { x: 960 } }, fx: { flashes: [], time: t }, t, quality,
});
// Every drawImage one flourish makes in one phase at time t: { img, alpha, comp, args, box }.
export function frame(name, phase, t, quality = 1) {
  const T = tracker();
  drawFlourishes(T.ctx, env([name], t, quality), phase, ...PHASE[phase]);
  return T.calls;
}

// The bullets' hot rose and its neighbours: hues 330-360 and 0-12 that are bright and saturated.
export const roseish = (hex) => {
  const [r, g, b] = rgb(hex);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (hi === lo) return false;
  const d = hi - lo;
  const h = (hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return (h >= 330 || h <= 12) && hi > 140 && d / hi > 0.4;
};

// The files of the backdrop (src/ui): the sprite rules run over every one.
export function backdropFiles() {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-storm|flourish-storm|sky-bodies-10)/.test(n) || n === 'ambient-10.js');
  return { dir, names, read: (n) => readFileSync(new URL(n, dir), 'utf8') };
}
