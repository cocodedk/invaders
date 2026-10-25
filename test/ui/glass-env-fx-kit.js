// What the Glass Cathedral flourish tests share (glass-env-flourish.test.js and glass-env-mover.test.js): stand-in canvases that follow
// what is drawn into them (so a sprite's extent can be read and a sprite baked mid-fight can be counted), the look and its built
// layers (with the signs the live art finds), and helpers that draw one flourish at one time and hand back every drawImage
// (frame) or every call (rec). Import this before anything under src/ui: it installs the canvases.
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

installCanvas(64);
export const made = [];
const stand = document.createElement;
document.createElement = (...a) => { // every canvas now made follows what is drawn into it
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
export const { look } = await import('./glass-env-look-kit.js');
const { buildLayers, layerX } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');

export const [W, H] = [1920, 1080];
export const layers = buildLayers(look, 5);
export const PHASE = { far: [layerX(layers[0], 960), 380], mid: [layerX(layers[1], 960), 620], sky: [0, 0], near: [0, 0], front: [0, 0], screen: [0, 0] }; // [x0, top] each phase's hook gets
export const env = (names, t, quality = 1) => ({ v: { look: { ...look, flourish: names }, layers, cache: {} }, world: { ship: { x: 960 } }, fx: { flashes: [], time: t }, t, quality });
export { drawFlourishes };

export const frame = (name, phase, t, quality = 1) => { // what one flourish draws at t: every drawImage with its alpha, blend and bounds
  const T = tracker();
  drawFlourishes(T.ctx, env([name], t, quality), phase, ...PHASE[phase]);
  return T.calls;
};
export const rec = (name, phase, t, quality = 1) => { // every call it makes
  const r = recorder();
  drawFlourishes(r.ctx, env([name], t, quality), phase, ...PHASE[phase]);
  return r.calls;
};
export const shows = (c, pad = 0) => c.box[2] > -pad && c.box[0] < W + pad && c.box[3] > -pad && c.box[1] < H + pad;
