import { installCanvas } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// What The Dowager Duck's art tests share (duck-form.test.js: what she is drawn as and that she holds her boxes; duck-parts.test.js: the hull, the
// parts, the rage layers and the file rules; duck-live.test.js: the live pass, the bonk and the pose; line-cap-duck.test.js: the context state):
// stand-in canvases that keep a tracker for every canvas made (so that a baked sprite's extent can be read back, and that "nothing is baked
// mid-fight" can be counted), her definition and look, her module, a boss to draw for, and the stage a painter is measured on. Part painters are
// measured the way the boss cache calls them: on a body and a lights context, centred on the part's rect.
installCanvas(64);
export const canvases = [];
document.createElement = () => {
  const T = tracker();
  canvases.push({ width: 64, height: 64, getContext: () => T.ctx, T });
  return canvases.at(-1);
};
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART, stageOf } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { fx } = await import('../../src/ui/bosses/duck-fx.js');
const kit = await import('../../src/ui/bosses/duck-kit.js');

export const look = LOOKS[18];
export const def = BOSS_DEFS.find((d) => d.kind === 'duck');
export const art = BOSS_ART.duck;
export const S = stageOf(look, 'duck'); // as bake.js sizes it
export const { TOP } = kit; // the highest anything but the bobble may reach, in boss coordinates (the HUD is above, at the top of her orbit)
export const PAD = S.W / 2; // the hull's half width plus duck.js's pad: how far either side the baked canvas reaches
export const f = (n) => Math.round(n);
export const part = (id) => def.parts.find((p) => p.id === id);
export const margin = (id) => art.margins?.[id] ?? art.margin ?? 34;
export const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;
export const painter = (id) => art.parts[id] ?? art.parts[id.replace(/[LR]$/, '')];

// One part painted on a tracker pair (mirrored for a right twin, as the cache does); the bounds are in the part's own coordinates.
export function paint(id) {
  const b = tracker();
  const l = tracker();
  const flip = !art.parts[id] && id.endsWith('R') ? -1 : 1;
  b.ctx.scale(flip, 1);
  l.ctx.scale(flip, 1);
  painter(id)(b.ctx, l.ctx, part(id), S);
  return { b: b.bounds, l: l.bounds };
}

export const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy, max: p.hp })) });
export const without = (b, ...ids) => ({ ...b, parts: b.parts.map((p) => (ids.includes(p.id) ? { ...p, hp: 0 } : p)) });

// One pass of the live extras read back through a tracker, standing, as the game does, in 'lighter'.
export function pass(b, t, own = true, k = 1) {
  const T = tracker();
  T.ctx.globalCompositeOperation = 'lighter';
  fx(T.ctx, b, t, k, own, 0);
  return { ...T, after: T.ctx.globalCompositeOperation };
}
export const sweepT = (b, own, fn) => { for (let t = 3; t < 40; t += 0.29) fn(pass(b, t, own), t); };
