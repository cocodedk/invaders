import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, recorder, tracker, fileRules } from './aliens-bath-kit.js';

// The things that stand on the ground of world 22's course as the view draws them (course-objects.js blitting the sprites of course-sprites.js): each
// kind of ground object has its painter, every sprite is baked once and sized from the core's own sizes (GROUND_R, a pillar's w x h), a frame draws
// no path, and the awake eyes and the lit lantern are the only live parts. The ground, the rock and the lantern's place are course-view.test.js's.
const { drawObjects, PUPIL_RATE, GLOW } = await import('../../src/ui/course-objects.js');
const S = await import('../../src/ui/course-sprites.js');
const { GROUND_SCORE, GROUND_R } = await import('../../src/core/course-ground.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
const { glow } = await import('../../src/ui/sprites.js');
const { PAL } = await import('../../src/ui/wander-kit.js');

const level = levelById('w22-1');
const KINDS = [...Object.keys(GROUND_SCORE).filter((k) => k !== 'shard'), 'checkpoint']; // the shard's painter comes with Leg 3's art
const entry = (kind, extra = {}) => ({ id: 1, kind, at: 0, x: 700, y: 500, hp: 3, w: 140, h: 150, holdId: 0, reached: false, ...extra });
const worldOf = (ground, held = null) => {
  const world = createWorld(level, level.seed);
  Object.assign(world.course, { ground, held, lit: 0 });
  return world;
};
const draws = (world, t = 0) => {
  const T = tracker();
  drawObjects(T.ctx, world, t);
  return T;
};
const roundSprites = () => [S.stoneSprite(), S.turretSprite(), S.gateSprite(true), S.gateSprite(false), S.crateSprite()];

test('every kind of ground object has a painter: it is a sprite drawn about the object, nothing else', () => {
  for (const kind of KINDS) {
    const T = draws(worldOf([entry(kind)]));
    const sprites = T.calls.filter((c) => c.img !== S.pupilSprite());
    assert.equal(sprites.length, 1, `${kind}: one sprite`);
    const [x0, y0, x1, y1] = sprites[0].box;
    assert.ok(x0 < 700 && x1 > 700 && y0 < 500 + 14 && y1 > 500 - 14, `${kind}: about its centre`);
  }
  assert.equal(draws(worldOf([entry('nothing')])).calls.length, 0, 'a kind with no painter is skipped');
});

test('a round thing is as big as the core says it reaches: sprites hold GROUND_R and the stone is the mockup scaled to it', () => {
  assert.ok(S.ROUND_HALF > GROUND_R, 'the shadow is in the sprite too');
  for (const sprite of roundSprites()) {
    assert.ok(made.includes(sprite), 'baked here, so it can be read back');
    assert.deepEqual([sprite.width, sprite.height], [S.ROUND_HALF * 2, S.ROUND_HALF * 2]);
    const b = sprite.T.bounds;
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= S.ROUND_HALF * 2 && b.y1 <= S.ROUND_HALF * 2, `inside its sprite: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  const stone = S.stoneSprite().T.bounds;
  const reach = S.ROUND_HALF - stone.y0; // the body's top, 28 px a mockup stone up
  assert.ok(reach <= GROUND_R && reach >= GROUND_R * 0.85, `a stone reaches ${reach} of ${GROUND_R}`);
  assert.ok(Math.abs(S.OBJECT_SCALE * S.MOCK_STONE_REACH - GROUND_R) < 1e-9);
  const cage = S.crateSprite().T.bounds;
  assert.ok(S.ROUND_HALF - cage.x0 < GROUND_R && S.ROUND_HALF - cage.x0 > GROUND_R / 2, 'a cage is inside the reach');
});

test('a pillar is exactly as big as it is: its sprite holds its w x h box, which sits where the box that rams does', () => {
  for (const [w, h] of [[140, 150], [90, 60]]) {
    const sprite = S.pillarSprite(w, h);
    assert.deepEqual([sprite.width, sprite.height], [w + 2 * S.PILLAR_PAD + S.SHADOW_DX, h + 2 * S.PILLAR_PAD + S.SHADOW_DY]);
    const b = sprite.T.bounds;
    assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [S.PILLAR_PAD, S.PILLAR_PAD, S.PILLAR_PAD + w, S.PILLAR_PAD + h], 'its outline is the box');
    const r = recorder();
    drawObjects(r.ctx, worldOf([entry('pillar', { w, h })]), 0);
    const [, img, dx, dy] = r.calls.find(([k]) => k === 'drawImage');
    assert.equal(img, sprite);
    assert.deepEqual([dx + S.PILLAR_PAD, dy + S.PILLAR_PAD], [-w / 2, -h / 2], 'drawn about the pillar\'s centre');
  }
  const world = worldOf([entry('pillar')]);
  assert.equal(draws(structuredClone(world)).calls[0].img, draws(world).calls[0].img, 'the sprite is keyed on w and h, so a world cloned every frame bakes nothing');
});

test('the awake eyes breathe and the lit lantern glows, live; asleep and dull things draw one sprite and nothing more', () => {
  const sizes = (world, t) => draws(world, t).calls.filter((c) => c.img === S.pupilSprite()).map((c) => c.box[2] - c.box[0]);
  const turret = worldOf([entry('turret')]);
  const [a, b] = [sizes(turret, 0), sizes(turret, Math.PI / 2 / PUPIL_RATE)];
  assert.ok(a.length === 1 && b.length === 1 && a[0] < b[0] && b[0] <= S.PUPIL_PX + 1e-9, `the pupil swells: ${a} to ${b}`);
  assert.equal(sizes(worldOf([entry('stone')]), 1).length, 0, 'a sleeping stone has no pupil');
  const gate = [entry('gate', { holdId: 2 })];
  assert.equal(sizes(worldOf(gate, { holdId: 2 }), 1).length, 1, 'a gate is awake while its hold stands');
  assert.equal(sizes(worldOf(gate, { holdId: 3 }), 1).length, 0, 'and not for another hold');
  assert.equal(sizes(worldOf(gate, null), 1).length, 0, 'nor once it is over');
  const glows = (world, t) => draws(world, t).calls.filter((c) => c.img === glow(PAL.lamp));
  assert.equal(glows(worldOf([entry('checkpoint')]), 0).length, 0, 'a dull lantern has no light');
  const lit = worldOf([entry('checkpoint', { reached: true })]);
  const [g0, g1] = [glows(lit, 0), glows(lit, Math.PI / 2 / GLOW.rate)];
  assert.ok(g0.length === 1 && g0[0].comp === 'lighter' && g0[0].alpha === GLOW.alpha, 'a lit one glows, added to the ground');
  assert.ok(g1[0].box[2] - g1[0].box[0] > g0[0].box[2] - g0[0].box[0], 'and its glow swells');
});

test('every sprite is baked once and a frame draws no path: blits of what is baked', () => {
  const world = worldOf([...KINDS.map((k, i) => entry(k, { x: 200 + 150 * i, reached: true })), entry('gate', { holdId: 1, x: 1500 })], { holdId: 1 });
  draws(world, 0.3);
  const n = made.length;
  const r = recorder();
  drawObjects(r.ctx, world, 0.9);
  assert.equal(made.length, n, 'nothing is baked on the second frame');
  assert.ok(r.calls.every(([k]) => ['save', 'restore', 'translate', 'drawImage'].includes(k)), [...new Set(r.calls.map(([k]) => k))].join());
  assert.ok(!('shadowBlur' in r.ctx) && !r.calls.some(([k]) => /^create/.test(k)), 'no shadow blur or gradient');
});

test('the object files keep the sprite rules', () => {
  fileRules(assert, ['course-sprites.js', 'course-objects.js']);
});
