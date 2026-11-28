import { test } from 'node:test';
import assert from 'node:assert/strict';
import { made, recorder, tracker, fileRules, look as glassLook, LOOKS } from './aliens-bath-kit.js';

// Leg 3's plain art (world 22): a flock's mote is its own small role, drawn by its own cached sprite inside the disc that hurts it; a mirror
// shard is its own cached sprite inside GROUND_R; the kites and the Smudges are drawn as before.
const { drawObjects } = await import('../../src/ui/course-objects.js');
const F = await import('../../src/ui/course-sprites-flats.js');
const S = await import('../../src/ui/course-sprites.js');
const M = await import('../../src/ui/aliens/w22-flock.js');
const { smudgeRole } = await import('../../src/ui/aliens/w22-smudge.js');
const { roleSprites, warmAliens } = await import('../../src/ui/aliens/bake.js');
const { drawAliens } = await import('../../src/ui/aliens/index.js');
const { createWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
const { GROUND_R } = await import('../../src/core/course-ground.js');
const { ALIEN_R } = await import('../../src/core/kinds.js');
const w22 = LOOKS[21];
const level = levelById('w22-3');

test('a flock mote draws the mote sprite, cached, and the kites and Smudges keep their own', () => {
  assert.equal(M.craftRole({ role: 'grunt', path: 'flock' }), 'mote');
  for (const a of [{ role: 'grunt', path: 'swoop' }, { role: 'gunner', path: 'hang', t: 0, cool: 9 }, { role: 'carrier' }]) assert.equal(M.craftRole(a), smudgeRole(a));
  const set = roleSprites(w22, 'mote');
  assert.equal(roleSprites(w22, 'mote'), set, 'baked once');
  assert.ok(set.body.every((c) => made.includes(c)));
  assert.notEqual(set.body[0], roleSprites(w22, 'grunt').body[0]);
  const draw = (a) => {
    const r = recorder();
    drawAliens(r.ctx, { aliens: [a], wrecks: [], saucer: null, level: {} }, w22, 0);
    return r.calls.filter(([k]) => k === 'drawImage').map(([, img]) => img);
  };
  const mote = { id: 1, role: 'grunt', path: 'flock', x: 500, y: 300, hp: 1, maxHp: 1 };
  assert.ok(draw(mote).some((img) => set.body.includes(img)), 'a mote draws the mote');
  const kite = { ...mote, path: 'swoop' };
  assert.ok(!draw(kite).some((img) => set.body.includes(img)), 'a kite does not');
  assert.ok(draw(kite).some((img) => roleSprites(w22, 'grunt').body.includes(img)), 'a kite draws the grunt, as before');
});

test('a mote lies inside the disc that hurts it, on both beats, and the role is warmed with the world', () => {
  assert.ok(M.MOTE_REACH <= ALIEN_R && M.MOTE_SIZE / 2 >= M.MOTE_REACH);
  for (const f of [0, 1]) {
    const b = tracker();
    M.motePainters.mote(b.ctx, tracker().ctx, f, '#fff');
    const { x0, x1, y0, y1 } = b.bounds;
    assert.ok(Math.min(x0, y0) >= -M.MOTE_REACH && Math.max(x1, y1) <= M.MOTE_REACH, `beat ${f}: ${x0}..${x1}, ${y0}..${y1}`);
  }
  assert.deepEqual(M.MOTE_ROLES, ['mote']);
  warmAliens(w22);
  assert.equal(roleSprites(w22, 'mote').size, M.MOTE_SIZE);
});

test('a shard is drawn by its own cached sprite, its body inside GROUND_R', () => {
  const sprite = F.shardSprite();
  assert.equal(F.shardSprite(), sprite, 'cached');
  assert.ok(made.includes(sprite));
  for (const other of [S.stoneSprite(), S.turretSprite(), S.crateSprite()]) assert.notEqual(sprite, other);
  assert.deepEqual([sprite.width, sprite.height], [S.ROUND_HALF * 2, S.ROUND_HALF * 2]);
  for (const [x, y] of F.SHARD_POINTS) assert.ok(Math.hypot(x, y) <= GROUND_R, `corner at ${Math.hypot(x, y)}`);
  const b = sprite.T.bounds; // the shadow lies right and below, so the left and top are the body's
  for (const reach of [S.ROUND_HALF - b.x0, S.ROUND_HALF - b.y0]) assert.ok(reach <= GROUND_R, `reach ${reach}`);
  const world = createWorld(level, level.seed);
  Object.assign(world.course, { ground: [{ id: 1, kind: 'shard', at: 0, x: 700, y: 500, hp: 6 }], held: null, lit: 0 });
  const r = recorder();
  drawObjects(r.ctx, world, 0);
  const [, img, dx, dy] = r.calls.find(([k]) => k === 'drawImage');
  assert.equal(img, sprite);
  assert.deepEqual([dx, dy], [-sprite.width / 2, -sprite.height / 2]);
});

test('the new art files are under 200 lines, with no shadow blur, dice or clock', () => {
  fileRules(assert, ['aliens/w22-flock.js', 'course-sprites-flats.js', 'aliens/w22.js', 'aliens/index.js', 'course-objects.js']);
});
