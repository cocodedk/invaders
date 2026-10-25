import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canvases } from './craving-smoke-kit.js';
import { tracker } from './galleon-track.js';

// The Craving's smoke kit (bosses/craving-puff.js, craving-blob.js, craving-wisp.js, craving-smoke.js): every sprite holds what
// it draws, the variants wrap, a mass and a tendril paint the same smoke from the same seed, the churn pose wraps without a
// jump, nothing is drawn above the line given, and the files keep to the rules (under 200 lines, no randomness, no shadowBlur).
const { puff, puffMax, smokeMass, warmPuffs, kindSizes } = await import('../../src/ui/bosses/craving-puff.js');
const { tendril } = await import('../../src/ui/bosses/craving-smoke.js');

const KINDS = ['billow', 'cool', 'core', 'wisp', 'wispPale', 'wispLit', 'curl', 'curlLit'];

test('every sprite of the kit holds what it draws: nothing within 2 px of its edge', () => {
  warmPuffs();
  let seen = 0;
  for (const c of canvases) {
    if (c.width < 40 || (c.width === 96 && c.height === 96)) continue; // the dots, and the scratch canvas a bump is made on
    const b = c.T.bounds;
    assert.ok(b.x0 >= 2 && b.y0 >= 2 && b.x1 <= c.width - 2 && b.y1 <= c.height - 2, `${c.width}x${c.height}: ${b.x0.toFixed(1)},${b.y0.toFixed(1)} .. ${b.x1.toFixed(1)},${b.y1.toFixed(1)}`);
    seen++;
  }
  assert.ok(seen > 100, `all the sprites were baked (${seen})`);
});

test('puff gives a cached sprite of the nearest size, the variants wrap, wisps are twice as wide as tall', () => {
  for (const kind of KINDS) {
    const sizes = kindSizes(kind);
    assert.ok(sizes.length >= 4, `${kind} has sizes`);
    assert.equal(puff(kind, sizes[1] + 3, 0), puff(kind, sizes[1], 0), `${kind}: the nearest size`);
    assert.equal(puff(kind, sizes[0], 0), puff(kind, sizes[0], 0), 'cached');
    const s = puff(kind, sizes[0], 0);
    assert.equal(s.width, sizes[0]);
    assert.equal(s.height, kind.startsWith('wisp') ? sizes[0] >> 1 : sizes[0], `${kind}: its shape`);
  }
  assert.ok(puff('billow', 144, 0) !== puff('billow', 144, 1), 'the variants differ');
  assert.equal(puff('billow', 144, 6), puff('billow', 144, 6 - 5), 'and wrap: 5 variants at 144');
  assert.equal(puffMax('billow', 150, 0).width, 144, 'puffMax: the biggest that fits');
  assert.equal(puffMax('billow', 47, 0), null, 'or none');
  assert.ok(kindSizes('billow').at(-1) >= 280 && kindSizes('billow')[0] <= 48);
});

const run = (fn) => { const T = tracker(); fn(T.ctx); return T; };
const sig = (T) => T.calls.map((c) => c.box.map((v) => Math.round(v * 20) / 20 + 0).join(',') + '|' + c.img.width).join(';');

test('a smoke mass is the same smoke from the same seed, another from another', () => {
  const a = run((g) => smokeMass(g, 0, 0, 120, 60, 5, { size: 1.6 }));
  const b = run((g) => smokeMass(g, 0, 0, 120, 60, 5, { size: 1.6 }));
  const c = run((g) => smokeMass(g, 0, 0, 120, 60, 6, { size: 1.6 }));
  assert.equal(sig(a), sig(b));
  assert.notEqual(sig(a), sig(c));
  assert.ok(a.calls.length > 6, `it is made of puffs (${a.calls.length})`);
});

test('the churn pose wraps: pose 0 and pose 1 are the same picture, and the poses between move the puffs', () => {
  const at = (pose) => sig(run((g) => smokeMass(g, 0, 0, 120, 60, 5, { size: 1.6, pose })));
  assert.equal(at(0), at(1), 'pose 0 and pose 1');
  assert.notEqual(at(0), at(0.25));
  const [p, q] = [run((g) => smokeMass(g, 0, 0, 120, 60, 5, { pose: 0 })), run((g) => smokeMass(g, 0, 0, 120, 60, 5, { pose: 0.125 }))];
  const mid = (c) => [(c.box[0] + c.box[2]) / 2, (c.box[1] + c.box[3]) / 2];
  const worst = Math.max(...p.calls.map((c, i) => Math.hypot(mid(c)[0] - mid(q.calls[i])[0], mid(c)[1] - mid(q.calls[i])[1])));
  assert.ok(worst < 8, `an eighth of a cycle moves a puff by ${worst.toFixed(1)} px at most: the frames cross-fade without a jump`);
});

test('nothing is drawn above the line given: puffs near it shrink to fit, and no sprite box crosses it', () => {
  for (let seed = 1; seed < 40; seed++) {
    for (const pose of [0, 0.3, 0.7]) {
      const T = run((g) => smokeMass(g, 0, -100, 220, 70, seed, { pose, size: 2.2, top: -154 }));
      assert.ok(T.bounds.y0 >= -154 - 1e-6, `seed ${seed}: ${T.bounds.y0}`);
      const U = run((g) => tendril(g, [-150, -78, -250, -90, -300, -150, -252, -142], 36, 8, seed, { pose, top: -154 }));
      assert.ok(U.bounds.y0 >= -154 - 1e-6, `tendril seed ${seed}: ${U.bounds.y0}`);
    }
  }
});

test('a tendril runs from its start to its end, thinning, the same every time', () => {
  const path = [0, 0, 60, -40, 120, 0];
  const a = run((g) => tendril(g, path, 30, 8, 3, { n: 9 }));
  const b = run((g) => tendril(g, path, 30, 8, 3, { n: 9 }));
  assert.equal(sig(a), sig(b));
  assert.equal(a.calls.length, 18, 'a bed of core puffs and a row of lit billows');
  const w = a.calls.map((c) => c.box[2] - c.box[0]);
  assert.ok(w[0] > w[8] && w[9] > w[17], 'thinner toward the end');
  assert.ok(a.bounds.x0 < 5 && a.bounds.x1 > 115, 'and it runs the length of the path');
});

test('the smoke files are under 200 lines and use no randomness, no clock and no shadowBlur', () => {
  for (const name of ['puff', 'blob', 'wisp', 'smoke', 'paint', 'figure', 'frames', 'thick', 'motion', 'fx', 'ember']) {
    const src = readFileSync(new URL(`../../src/ui/bosses/craving-${name}.js`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `craving-${name}.js: ${src.split('\n').length} lines`);
    assert.ok(!/Math\.random|Date\.now|performance\.now|shadowBlur/.test(src.replace(/^\/\/.*$/gm, '')), `craving-${name}.js`);
  }
});
