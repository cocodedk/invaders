import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, recorder, fileRules } from './aliens-bath-kit.js';

// Leg 2's plain art (world 22): a thorn piece is a bramble box exactly its w x h, drawn by its own sprite (not a pillar's); the Smudge (a hang
// craft) is its own role, eye shut until CURTAIN_WIND before each curtain; the curtain's body scale is a named constant.
const { drawObjects } = await import('../../src/ui/course-objects.js');
const W = await import('../../src/ui/course-sprites-wood.js');
const S = await import('../../src/ui/course-sprites.js');
const { smudgeRole, SMUDGE_ROLES } = await import('../../src/ui/aliens/w22-smudge.js');
const { HANG_ARRIVE, CURTAIN_WIND, CURTAIN_COOL } = await import('../../src/core/course-air.js');
const { CURTAIN_BODY_SCALE } = await import('../../src/ui/bullets-view.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');

const level = levelById('w22-2');

test('a thorn piece is drawn by the bramble sprite, its outline exactly its w x h box', () => {
  for (const [w, h] of [[140, 60], [90, 120]]) {
    const sprite = W.thornSprite(w, h);
    assert.ok(made.includes(sprite) && sprite !== S.pillarSprite(w, h));
    const b = sprite.T.bounds;
    assert.deepEqual([b.x0, b.y0, b.x1, b.y1], [S.PILLAR_PAD, S.PILLAR_PAD, S.PILLAR_PAD + w, S.PILLAR_PAD + h]);
    const world = createWorld(level, level.seed);
    Object.assign(world.course, { ground: [{ id: 1, kind: 'thorn', at: 0, x: 700, y: 500, hp: 1, w, h }], held: null, lit: 0 });
    const r = recorder();
    drawObjects(r.ctx, world, 0);
    const [, img, dx, dy] = r.calls.find(([k]) => k === 'drawImage');
    assert.equal(img, sprite);
    assert.deepEqual([dx + S.PILLAR_PAD, dy + S.PILLAR_PAD], [-w / 2, -h / 2]);
  }
});

test('the Smudge is a role of its own, its eye open from CURTAIN_WIND before each curtain until it falls', () => {
  const hang = (t, cool) => ({ role: 'gunner', path: 'hang', t, cool });
  assert.equal(smudgeRole({ role: 'grunt', path: 'swoop' }), 'grunt');
  assert.equal(smudgeRole({ role: 'gunner', path: 'hang', t: 0, cool: CURTAIN_WIND }), 'smudge', 'shut while it drifts in');
  assert.equal(smudgeRole(hang(HANG_ARRIVE, CURTAIN_WIND)), 'smudgeOpen', 'looks as it arrives, the first curtain a wind-up away');
  assert.equal(smudgeRole(hang(HANG_ARRIVE + 3, CURTAIN_COOL)), 'smudge', 'shut after a curtain falls');
  assert.equal(smudgeRole(hang(HANG_ARRIVE + 3, CURTAIN_WIND)), 'smudgeOpen');
  assert.deepEqual(SMUDGE_ROLES, ['smudge', 'smudgeOpen']);
});

test('the curtain bullet scale is a named constant and the files keep the rules', () => {
  assert.equal(CURTAIN_BODY_SCALE, 1.8);
  fileRules(assert, ['course-sprites-wood.js']);
});
