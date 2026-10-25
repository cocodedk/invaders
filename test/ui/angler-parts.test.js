import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { def, art, S, lit, HUD, f } from './angler-kit.js';

// The Lantern Leviathan's fins, eyes and belly (angler-fin.js, -eye.js, -belly.js) under stand-in canvases: what each
// puts on the lights layer, where the art lies against its canvas and the HUD above it, the belly's graded lamps
// and the fin's rays, and the sprite rules over every file of the live extras. The live extras are angler-live.test.js.
const { painterFor } = await import('../../src/ui/bosses/bake.js');
const { LIGHTS } = await import('../../src/ui/bosses/angler-belly.js');
const { RAYS, rayAt } = await import('../../src/ui/bosses/angler-fin.js');

test('the fin, eye and belly paint a body and lights, stay under the HUD and inside their canvases, on both sides', () => {
  assert.deepEqual(painterFor(art, 'finR'), [art.parts.fin, -1]);
  assert.deepEqual(painterFor(art, 'eyeR'), [art.parts.eye, -1]);
  assert.equal(painterFor(art, 'belly')[1], 1);
  for (const [id, floor] of [['finL', 12], ['finR', 12], ['eyeL', 6], ['eyeR', 6], ['belly', 30]]) {
    const p = def.parts.find((q) => q.id === id);
    const [paint] = painterFor(art, id);
    const [body, lights] = [recorder(), recorder()];
    paint(body.ctx, lights.ctx, p, S);
    assert.ok(lit(lights.calls) >= floor, `${id}: ${lit(lights.calls)} lights`);
    assert.ok(lit(body.calls) > lit(lights.calls), `${id} has a body too`);
    const b = tracker();
    paint(b.ctx, tracker().ctx, p, S);
    assert.ok(p.dy + b.bounds.y0 - 2.5 >= HUD, `${id}'s highest point: ${f(p.dy + b.bounds.y0)}`);
    const m = art.margins?.[id] ?? art.margin ?? 34;
    assert.ok(-b.bounds.x0 <= p.w / 2 + m && b.bounds.x1 <= p.w / 2 + m, `${id} is within its canvas side to side: ${f(b.bounds.x0)}..${f(b.bounds.x1)}`);
    assert.ok(-b.bounds.y0 <= p.h / 2 + m && b.bounds.y1 <= p.h / 2 + m, `${id} is within its canvas top to bottom: ${f(b.bounds.y0)}..${f(b.bounds.y1)}`);
    const l = tracker();
    paint(tracker().ctx, l.ctx, p, S);
    assert.ok(-l.bounds.y0 <= p.h / 2 + m && l.bounds.y1 <= p.h / 2 + m && -l.bounds.x0 <= p.w / 2 + m && l.bounds.x1 <= p.w / 2 + m, `${id}'s lights are within its canvas`);
    assert.ok(p.dy + l.bounds.y0 >= HUD - 2.5, `${id}'s lights stop under the HUD`);
    assert.ok(p.dy + b.bounds.y1 <= def.size.h / 2 + 60, `${id} ends inside the box's canvas`);
  }
});

test("the belly's lamps are graded in size from the middle out, in teal, cyan and violet, and the fin has nine jointed rays", () => {
  assert.equal(LIGHTS.length, 17);
  for (const row of [0, 1]) {
    const lamps = LIGHTS.filter((p) => p.row === row).sort((a, b) => a.x - b.x);
    const mid = lamps[Math.floor(lamps.length / 2)];
    assert.ok(lamps.every((p) => p.r <= mid.r + 0.7), `row ${row}: the biggest lamps are in the middle`);
    assert.ok(lamps[0].r < mid.r * 0.72 && lamps.at(-1).r < mid.r * 0.72, `row ${row}: and the smallest at the flanks`);
  }
  assert.ok(new Set(LIGHTS.map((p) => p.c)).size >= 3);
  assert.ok(LIGHTS.every((p) => Math.abs(p.x) <= 100 && p.y + p.r <= def.size.h / 2));
  assert.equal(RAYS.length, 9);
  for (let i = 0; i < RAYS.length; i++) {
    const [a, b] = [rayAt(i, 0), rayAt(i, 1)];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 40, `ray ${i} is long`);
  }
});

test("the live extras' painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const mine = /^angler-(fin|eye|belly|fx|lure|sprites)/;
  const files = readdirSync(dir).filter((n) => mine.test(n));
  assert.ok(files.length >= 8, `the live extras are split over many files: ${files.join(', ')}`);
  for (const name of readdirSync(dir).filter((n) => /^angler.*\.js$/.test(n))) { // every file of the boss: the sprite caches are shared, so each key says whose it is
    const src = readFileSync(new URL(name, dir), 'utf8');
    if (mine.test(name)) {
      assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
      assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    }
    for (const key of src.matchAll(/cached\('([^']+)'/g)) assert.ok(key[1].startsWith('angler'), `${name}: cache key ${key[1]}`);
  }
});
