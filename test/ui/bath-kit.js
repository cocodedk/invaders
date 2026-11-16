// What the tests of world 19's backdrop share (bath-*.test.js, line-cap-bath.test.js): the look as the game has it, the canvases that
// were made (so a sprite baked in the middle of a fight can be counted), colour maths, helpers that draw one flourish at one time and hand
// back every drawImage, a context that writes down the text it is asked to fill, and the backdrop's files. Import this before anything
// under src/ui: it installs the canvases.
import { readdirSync, readFileSync } from 'node:fs';
import { installCanvas, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';
export { contrast, hue } from './glass-env-kit.js';
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
export const look = LOOKS[18];
export { drawFlourishes };
export const [W, H] = [1920, 1080];
export const FAR_TOP = H - 700; // the far layer's top
export const PHASE = { sky: [0, 0], far: [-160, FAR_TOP], mid: [-160, H - 460], near: [0, 0], front: [0, 0], screen: [0, 0] }; // [x0, top] each phase's hook gets (ship at the middle)

// The relative luminance of a #rrggbb colour (WCAG), 0 black .. 1 white.
export const lum = (hex) => rgb(hex).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);

export const env = (names, t, quality = 1, flashes = []) => ({
  v: { look: { ...look, flourish: names }, layers: [], cache: {} }, world: { ship: { x: 960 } }, fx: { flashes, time: t }, t, quality,
});
// Every drawImage one flourish makes in one phase at time t: { img, alpha, comp, args, box }.
export function frame(name, phase, t, quality = 1, flashes = []) {
  const T = tracker();
  drawFlourishes(T.ctx, env([name], t, quality, flashes), phase, ...PHASE[phase]);
  return T.calls;
}

// A canvas factory whose contexts write down every fillText (the text, where, the font, fill and alignment it was drawn in, and the
// size of the canvas it went on) and swallow everything else; install() swaps it in for document.createElement and hands back the record and a way to put the old one back.
export function scribe() {
  const texts = [];
  const ctx = (c) => {
    const state = { font: '10px sans-serif', fillStyle: '#000000', textAlign: 'start', textBaseline: 'alphabetic' };
    return new Proxy(state, {
      get: (o, k) => (k === 'fillText' ? (text, x, y, maxWidth) => texts.push({ text, x, y, maxWidth, ...o, canvas: [c.width, c.height] }) : k in o ? o[k] : () => sink),
      set: (o, k, v) => ((o[k] = v), true),
    });
  };
  const before = document.createElement;
  document.createElement = () => {
    const c = { width: 64, height: 64 };
    c.getContext = () => ctx(c);
    return c;
  };
  return { texts, restore: () => (document.createElement = before) };
}

// A context that keeps the state a painter may change (the filter and the text's settings among it: the sky blurs and the plate is
// lettered), with a real save and restore, and hands everything else to the sink.
export function stateful() {
  const state = {
    lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over',
    filter: 'none', font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
  };
  const stack = [];
  return new Proxy(state, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
}

// The files of the backdrop (src/ui): the sprite rules run over every one.
export function backdropFiles() {
  const dir = new URL('../../src/ui/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^(parallax-bath|flourish-bath|sky-bodies-11)/.test(n) || n === 'ambient-11.js');
  return { dir, names, read: (n) => readFileSync(new URL(n, dir), 'utf8') };
}
