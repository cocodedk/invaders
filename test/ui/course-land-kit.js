import { recorder } from './dom-kit.js';

// What the tests of World 22's land (course-land.js, course-land-art.js) share: every canvas the land makes records what it is asked to draw, and the level,
// the world and the helpers are the game's own. Import this before anything under src/ui: it installs the canvases.
export const canvases = [];
globalThis.document = {
  createElement: () => {
    const { ctx, calls } = recorder();
    const c = { width: 1, height: 1, calls, getContext: () => ctx };
    canvases.push(c);
    return c;
  },
  addEventListener() {},
};
export const { createLand, drawLand, MAX_STRIPS, BAKES_PER_FRAME, SEAM } = await import('../../src/ui/course-land.js');
export const { paintStrip, scatter, riverAt, STRIP_SPAN, TREE_MARGIN, FIELD_MARGIN } = await import('../../src/ui/course-land-art.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
export const { bandAt } = await import('../../src/core/course-terrain.js');
export const { SPAWN_Y } = await import('../../src/core/course-kinds.js');
export const { SEED_R } = await import('../../src/core/course-seed.js');
export const { stepRespawn, RESPAWN_DELAY } = await import('../../src/core/course-check.js');
export const { WIDTH, HEIGHT } = await import('../../src/core/kinds.js');

export const level = levelById('w22-1');
export const data = level.course;
export const MID = 6000; // a scroll in the middle of the leg: on screen, the course rows 4840 to 5920
export const world = (dist = MID) => {
  const w = createWorld(level, level.seed);
  w.course.dist = dist;
  return w;
};
export const atOf = (w, y) => w.course.dist + SPAWN_Y - y;
export const frame = (land, w) => {
  const r = recorder();
  drawLand(r.ctx, land, w);
  return r;
};
export const settle = (land, w) => { for (let i = 0; i < 8; i++) frame(land, w); };
export const ops = () => canvases.reduce((n, c) => n + c.calls.length, 0);
const isBase = ([k, ...a]) => k === 'fillRect' && a[2] === WIDTH && a[3] === STRIP_SPAN;
// the stamps a strip's sketch holds: the drawImage calls of the shared scratch since the sketch was last baked
export const stamps = (land, c) => c.calls.slice(c.calls.findLastIndex(isBase)).filter(([k, img]) => k === 'drawImage' && img === land.scratch);
// the strips (their indices) whose rows are on the screen at a scroll, worked out from the screen rows rather than from the module's formula
export const onScreen = (dist) => {
  const top = Math.round(SPAWN_Y + dist);
  return Array.from({ length: 200 }, (_, i) => i - 100).filter((k) => top - (k + 1) * STRIP_SPAN < HEIGHT && top - k * STRIP_SPAN > 0);
};
export const ready = (land) => [...land.slots.values()].filter((s) => s.ready).map((s) => s.k).sort((p, q) => p - q);
export { recorder };
