import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ofKind, react, run } from './fx-kit.js';

const at = (world) => ({ level: { world }, ship: { x: 800, y: 900 } });
const cut = { type: 'cut', x: 600, y: 400 };

test('in Aurora Kingdom a cut shatters the shard: glass slivers, a bright flash and ring, and some glitter', () => {
  const fx = react(cut, at(11));
  const shards = ofKind(fx, 'shard');
  assert.ok(shards.length >= 8, `${shards.length} slivers`);
  assert.ok(shards.every((p) => p.gravity > 0 && p.life >= 0.5), 'they tumble and fall');
  assert.ok(ofKind(fx, 'spark').length > 0, 'and glitter');
  assert.equal(fx.flashes.length, 1);
  assert.equal(fx.flashes[0].tag, 'cut');
  assert.equal(fx.rings.length, 1);
  run(fx, 1.2);
  assert.equal(fx.particles.length, 0, 'all gone within the second');
});

test('everywhere else a cut is steel sparks as it was, in world 4 and with no world at all', () => {
  const bare = react(cut);
  assert.equal(ofKind(bare, 'shard').length, 0);
  assert.ok(ofKind(bare, 'spark').length > 0);
  for (const world of [1, 4, 10]) assert.deepEqual(react(cut, at(world)), bare, `world ${world}`);
});
