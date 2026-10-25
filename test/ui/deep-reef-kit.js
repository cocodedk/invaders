// What the tests of Lantern Deep's mid layer (the kelp wood), near layer (the reef) and their sway share: stand-in canvases
// that follow what is drawn into them, the two layers painted straight through their own painters on tracking canvases
// (so their lights, signs and extent can be read), the layers as the flourishes see them, and small helpers.
import { installCanvas, recorder, sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { look } from './deep-kit.js';
import { rgb } from '../../src/ui/sprites.js';

export { look, recorder, sink, tracker };
installCanvas(64);
export const made = [];
const stand = document.createElement;
// Every canvas now made is one that follows what is drawn into it, so a sprite's or a layer's extent can be read off.
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { makeRng } = await import('../../src/core/rng.js');
const { buildLayers, layerX } = await import('../../src/ui/parallax.js');
const { MID } = await import('../../src/ui/parallax-deep-mid.js');
const { REEF } = await import('../../src/ui/parallax-deep-reef.js');
export const { FLOURISH_SWAY, warmSway, wormOpen, kelpAngles, KELP } = await import('../../src/ui/flourish-deep-sway.js');
export const sprites = await import('../../src/ui/flourish-deep-sway-sprites.js');
export const { LANTERN } = await import('../../src/ui/parallax-deep-reef-arch.js');
export { layerX };

export const [W, H, MARGIN] = [1920, 1080, 160];
export const [LW, MID_H, REEF_H] = [W + MARGIN * 2, look.layers[1].height, look.layers[2].height];
const PAINT = { kelpwood: MID.kelpwood, reef: REEF.reef };

// A layer painted straight through its own painter on a tracking canvas (the way parallax.js builds it, with the same
// seed), so that its signs, its lights and its extent can be read, whether or not the registry has it yet.
export function paint(i, seed = 5) {
  const L = look.layers[i];
  const T = tracker();
  const out = { lights: [], signs: [] };
  PAINT[L.kind](T.ctx, LW, L.height, makeRng(seed * 101 + i * 7), L, out);
  return { ...out, T, L, h: L.height };
}
export const [mid, reef] = [paint(1), paint(2)];

// The layers as the flourishes see them: through buildLayers when the registry has them, else the painted ones.
export let layers;
try {
  layers = buildLayers(look, 5);
  if (!layers[1].signs.some((s) => s.kelp)) throw new Error('not registered');
} catch {
  layers = [null, { top: H - MID_H, speed: look.layers[1].speed, lights: mid.lights, signs: mid.signs }, { top: H - REEF_H, speed: look.layers[2].speed, lights: reef.lights, signs: reef.signs }];
}

export const inside = (c, pad = 0) => c.T.bounds.x0 >= -pad && c.T.bounds.y0 >= -pad && c.T.bounds.x1 <= c.width + pad && c.T.bounds.y1 <= c.height + pad;
export const dims = (c) => `${c.width}x${c.height}: ${['x0', 'y0', 'x1', 'y1'].map((k) => Math.round(c.T.bounds[k])).join(',')}`;
export const images = (calls) => calls.filter(([k]) => k === 'drawImage');
export const hex = (c) => rgb(c);
export const warm = (c) => hex(c)[0] > hex(c)[2] + 20; // more red than blue: gold, amber, rose
export const amberish = (c) => { const [r, g, b] = hex(c); return r > 200 && g > 100 && g < 200 && b < 110; };

export const env = (t, shipX = 960) => ({ v: { look, layers, cache: {} }, world: { ship: { x: shipX } }, t, quality: 1 });
export const kelpsway = (t, x0 = layerX(layers[1], 960), ctx = recorder()) => { FLOURISH_SWAY.kelpsway.mid(ctx.ctx, env(t), x0, layers[1].top); return ctx; };
export const reefsway = (t, shipX = 960, ctx = recorder()) => { FLOURISH_SWAY.reefsway.near(ctx.ctx, env(t, shipX)); return ctx; };
export const turns = (calls) => calls.filter(([k]) => ['rotate', 'transform'].includes(k)).map((c) => [c[0], ...c.slice(1).map((v) => +v.toFixed(4))].join(' ')).join('|');

export const state = () => {
  const s = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none' };
  const stack = [];
  return new Proxy(s, {
    get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
    set: (o, k, v) => ((o[k] = v), true),
  });
};

