import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, ROLES, recorder, tracker, lit, text, fileRules } from './aliens-bath-kit.js';

// What world 22 (Wanderlight) is registered with: a look that says it is a course, the style that look is played in, the five kites the
// alien art holds for it (aliens/w22.js, slot 22 of bake.js) and the pickup rim (pickup-wander.js). The course itself is course-view.test.js's.
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { lookFor } = await import('../../src/ui/looks/index.js');
const { kitFor, STYLES } = await import('../../src/ui/sound-data.js');
const { art, roleSprites } = await import('../../src/ui/aliens/bake.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { PAL } = await import('../../src/ui/wander-kit.js');
const { rgb } = await import('../../src/ui/sprites.js');

const look = LOOKS[WORLDS.findIndex((w) => w.name === 'Wanderlight')];
const A = art(look);
const luminance = (hex) => rgb(hex).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const MIN_CONTRAST = 3; // what hurts must stand out of the parchment and the rock at least this much

test("world 22's look is the course's: parchment for a sky, the only one with a ground, its levels get it, and it is played in a style of its own", () => {
  assert.equal(look.world, 22);
  assert.equal(look.ground, true);
  assert.equal(LOOKS.filter((l) => l.ground).length, 1, 'no other world has a ground');
  assert.equal(lookFor(levelById('w22-1')), look);
  assert.equal(look.sky[0][1], PAL.parchment, 'the letterbox and the lobby take the parchment from the sky');
  const kit = kitFor(look.music);
  assert.equal(kit.style, 'road');
  assert.equal(STYLES.road.mood, look.music.mood);
  assert.equal(LOOKS.filter((l) => kitFor(l.music).style === kit.style).length, 1, 'no other look plays it');
});

test('what hurts is violet and reads against the parchment and the rock', () => {
  for (const ground of [PAL.parchment, PAL.rock, PAL.canopyEdge]) {
    assert.ok(contrast(look.palette.enemy, ground) >= MIN_CONTRAST, `enemy fire on ${ground}: ${contrast(look.palette.enemy, ground).toFixed(2)}`);
  }
  assert.ok(contrast(look.palette.enemyRim, PAL.parchment) >= MIN_CONTRAST * 2, 'and its rim is dark');
});

test("slot 22 of the alien art holds world 22's own painter for every role, none of them another world's, and the kites do not glow", () => {
  assert.equal(A.halo, 0);
  for (const role of ROLES) {
    assert.equal(typeof A[role], 'function', role);
    for (const other of LOOKS.filter((l) => l !== look)) assert.notEqual(A[role], art(other)[role], `${role} is not world ${other.world}'s`);
  }
});

test('every kite paints a body on both frames, inside its sprite, the tail wavering between them, and the five are five', () => {
  const drawn = [];
  for (const role of ROLES) {
    const set = roleSprites(look, role);
    const half = set.size / 2;
    for (const f of [0, 1]) {
      const [b, l] = [tracker(), tracker()];
      A[role](b.ctx, l.ctx, f, look.palette.alien[role]);
      assert.ok(b.bounds.x0 >= -half && b.bounds.x1 <= half && b.bounds.y0 >= -half && b.bounds.y1 <= half, `${role} frame ${f}: ${Object.values(b.bounds).map(Math.round)}`);
      assert.ok(Number.isFinite(l.bounds.x0) === (role === 'gunner' || role === 'carrier'), `${role}: light only in the Watcher's eye and the Gift's sparkle`);
    }
    const [b0, b1] = [0, 1].map((f) => recorder());
    A[role](b0.ctx, recorder().ctx, 0, look.palette.alien[role]);
    A[role](b1.ctx, recorder().ctx, 1, look.palette.alien[role]);
    assert.ok(lit(b0) >= 6, `${role}: ${lit(b0)} fills and strokes`);
    assert.notEqual(text(b0), text(b1), `${role} moves between frames`);
    drawn.push(text(b0));
  }
  assert.equal(new Set(drawn).size, ROLES.length);
});

test("every kite hangs its tail below its diamond and casts its shadow to the right, as the mockup's do, and no other world's kite is one of these", () => {
  const HANG = 20; // px: how much further down than up a kite reaches (the tail and the shadow), and how much further right than left (the shadow)
  for (const role of ROLES) {
    const b = tracker();
    A[role](b.ctx, tracker().ctx, 0, look.palette.alien[role]);
    assert.ok(b.bounds.y1 >= -b.bounds.y0 + HANG, `${role}: reaches ${Math.round(b.bounds.y1)} down and ${Math.round(-b.bounds.y0)} up`);
    assert.ok(b.bounds.x1 >= -b.bounds.x0 + HANG, `${role}: reaches ${Math.round(b.bounds.x1)} right and ${Math.round(-b.bounds.x0)} left`);
    for (const n of [20, 21]) assert.notEqual(A[role], art(LOOKS.find((l) => l.world === n))[role], `${role} is not world ${n}'s`);
  }
});

test('the pickup rim is the parchment band: its own frame, inside the 60 px sprite for every colour a power wears', () => {
  assert.equal(typeof FRAMES[22], 'function');
  for (const n of [21, 20, 19]) assert.ok(FRAMES[22] !== FRAMES[n], `not world ${n}'s`);
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[22](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside the sprite`);
    assert.ok(b.x1 - b.x0 >= 48 && b.y1 - b.y0 >= 48, 'and fills it (the path, not the stroke on either side of it)');
  }
});

test("the world's files keep the sprite rules", () => {
  fileRules(assert, ['looks/w22.js', 'aliens/w22.js', 'sound-styles-2.js', 'aliens/bake.js']);
});
