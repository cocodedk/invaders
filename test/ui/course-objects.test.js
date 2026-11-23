import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './aliens-bath-kit.js';

// The lit lantern of a course (world 22) is drawn while any of its glow is on the screen, so its glow never pops in or out at the screen's
// edge: a glow reaches further than the post (course-objects.js inSight).
const { drawObjects, GLOW, OFFSCREEN } = await import('../../src/ui/course-objects.js');
const { RESPAWN_Y } = await import('../../src/core/course-check.js');
const { HEIGHT } = await import('../../src/core/kinds.js');

// All drawObjects reads of a course whose last lantern reached has its foot on row y (drawn from course.check, as after a respawn).
const lanternAt = (y) => ({ course: { ground: [], held: null, lit: 1, check: { x: 960, dist: 0 }, dist: y - RESPAWN_Y } });
const BIGGEST = Math.PI / 2 / GLOW.rate; // the time the glow has swelled to its biggest
const frame = (y) => {
  const r = recorder();
  drawObjects(r.ctx, lanternAt(y), BIGGEST);
  return r.calls;
};
const drawn = (y) => frame(y).some(([k]) => k === 'translate'); // the lantern's origin is moved to its foot
// The rows the glow covers, from the foot: its top and its bottom (the glow is the image drawn with a width and a height).
const [TOP, BOTTOM] = (() => {
  const [, , , dy, , dh] = frame(HEIGHT / 2).find(([k, , , , w]) => k === 'drawImage' && w !== undefined);
  return [dy, dy + dh];
})();

test('a lit lantern is drawn exactly while some of its glow is on the screen, below it and above it', () => {
  for (let y = -300; y <= HEIGHT + 300; y++) assert.equal(drawn(y), y + BOTTOM >= 0 && y + TOP <= HEIGHT, `foot at ${y}`);
});

test('a lit lantern is drawn past the 80 px a post is, as far as its glow reaches', () => {
  assert.ok(drawn(HEIGHT + OFFSCREEN + 1) && drawn(-OFFSCREEN - 1));
});
