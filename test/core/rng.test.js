import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, createRng, rand, between, pick } from '../../src/core/rng.js';

const draw = (next, n) => Array.from({ length: n }, next);

test('makeRng is deterministic per seed and stays in [0, 1)', () => {
  const a = draw(makeRng(42), 200);
  assert.deepEqual(a, draw(makeRng(42), 200));
  assert.notDeepEqual(a, draw(makeRng(43), 200));
  for (const v of a) assert.ok(v >= 0 && v < 1);
});

test('rand(createRng(seed)) is the same stream as makeRng(seed)', () => {
  const r = createRng(7);
  assert.deepEqual(draw(() => rand(r), 100), draw(makeRng(7), 100));
});

test('createRng keeps its state in a plain { s } object that survives structuredClone', () => {
  const r = createRng(99);
  assert.deepEqual(Object.keys(r), ['s']);
  draw(() => rand(r), 10);
  const copy = structuredClone(r);
  assert.deepEqual(copy, r);
  assert.deepEqual(draw(() => rand(copy), 50), draw(() => rand(r), 50));
});

test('rand advances the state it is given and nothing else', () => {
  const r = createRng(5);
  const before = r.s;
  const v = rand(r);
  assert.notEqual(r.s, before);
  assert.ok(v >= 0 && v < 1);
});

test('between and pick draw from a makeRng stream', () => {
  const rng = makeRng(3);
  for (let i = 0; i < 100; i++) {
    const v = between(rng, 10, 20);
    assert.ok(v >= 10 && v < 20);
  }
  const seen = new Set(draw(() => pick(rng, ['a', 'b', 'c']), 100));
  assert.deepEqual([...seen].sort(), ['a', 'b', 'c']);
});
