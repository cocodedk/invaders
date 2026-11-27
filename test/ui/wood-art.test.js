import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, recorder, fileRules } from './aliens-bath-kit.js';

// Leg 2's plain art (world 22): a thorn piece is a bramble box exactly its w x h, drawn by its own sprite (not a pillar's); the Smudge (a hang
// craft) is its own role, eye shut until CURTAIN_WIND before each curtain; the curtain's body scale is a named constant.
const { drawObjects } = await import('../../src/ui/course-objects.js');
const W = await import('../../src/ui/course-sprites-wood.js');
const S = await import('../../src/ui/course-sprites.js');
const { smudgeRole, SMUDGE_ROLES } = await import('../../src/ui/aliens/w22-smudge.js');
const { HANG_ARRIVE, HANG_LEAVE, CURTAIN_WIND, CURTAIN_COOL } = await import('../../src/core/course-air.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');

const { GROUND_R } = await import('../../src/core/course-ground.js');
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

test("w22-2's gates draw the Thicket's bramble ring and w22-1's still draw the stone one, the ring reaching at most GROUND_R", () => {
  const gateDrawn = (id, awake) => {
    const lv = levelById(id);
    const world = createWorld(lv, lv.seed);
    Object.assign(world.course, { ground: [{ id: 1, kind: 'gate', at: 0, x: 700, y: 500, holdId: awake ? 1 : 2 }], held: { holdId: 1 }, lit: 0 });
    const r = recorder();
    drawObjects(r.ctx, world, 0);
    return r.calls.find(([k]) => k === 'drawImage')[1];
  };
  for (const awake of [true, false]) {
    assert.equal(gateDrawn('w22-2', awake), W.thicketGateSprite(awake));
    assert.equal(gateDrawn('w22-1', awake), S.gateSprite(awake));
    assert.notEqual(W.thicketGateSprite(awake), S.gateSprite(awake));
    const sprite = W.thicketGateSprite(awake);
    assert.ok(made.includes(sprite));
    assert.deepEqual([sprite.width, sprite.height], [S.ROUND_HALF * 2, S.ROUND_HALF * 2]);
    const b = sprite.T.bounds; // the shadow lies right and below, so the left and top are the body's
    for (const reach of [S.ROUND_HALF - b.x0, S.ROUND_HALF - b.y0]) assert.ok(reach <= GROUND_R && reach > GROUND_R - 1, `reach ${reach}`);
  }
});

test("a gate's thorns start on the ring's outside, none of the base dipping into the dark centre, and end at GROUND_R", () => {
  for (let i = 0; i < W.THICKET_THORNS; i++) {
    const [p, q, tip] = W.thicketThorn((i / W.THICKET_THORNS) * 2 * Math.PI);
    for (const [x, y] of [p, q]) assert.ok(Math.hypot(x, y) >= W.THICKET_OUTER - 1e-9, `base corner at ${Math.hypot(x, y)}`);
    assert.ok(Math.hypot((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) >= W.THICKET_OUTER - 1e-9, 'the base chord');
    assert.ok(Math.abs(Math.hypot(...tip) - GROUND_R) < 1e-9);
  }
});

test('the Smudge is a role of its own, its eye open from CURTAIN_WIND before each curtain until it falls', () => {
  const hang = (t, cool) => ({ role: 'gunner', path: 'hang', t, cool });
  assert.equal(smudgeRole({ role: 'grunt', path: 'swoop' }), 'grunt');
  assert.equal(smudgeRole({ role: 'gunner', path: 'hang', t: 0, cool: CURTAIN_WIND }), 'smudge', 'shut while it drifts in');
  assert.equal(smudgeRole(hang(HANG_ARRIVE, CURTAIN_WIND)), 'smudgeOpen', 'looks as it arrives, the first curtain a wind-up away');
  assert.equal(smudgeRole(hang(HANG_ARRIVE + 3, CURTAIN_COOL)), 'smudge', 'shut after a curtain falls');
  assert.equal(smudgeRole(hang(HANG_ARRIVE + 3, CURTAIN_WIND)), 'smudgeOpen');
  assert.equal(smudgeRole(hang(HANG_LEAVE, 0)), 'smudge', 'shut once it goes on down, however low its cool');
  assert.deepEqual(SMUDGE_ROLES, ['smudge', 'smudgeOpen']);
});

test('the wood sprites file keeps the rules', () => {
  fileRules(assert, ['course-sprites-wood.js']);
});
