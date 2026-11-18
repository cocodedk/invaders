import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, LOOKS, lit, text, tracker, recorder, fileRules } from './aliens-bath-kit.js';

// Golden Isle's host: the Masked Soldier, the Golden Deer, the Demon Archer, the Gilded Giant and the Chariot (aliens/w21.js .. w21-*.js),
// as the painters draw them in slot 21 of the alien art. The look is not in LOOKS until part 027, so it is built here as the game will.
const { default: w21look } = await import('../../src/ui/looks/w21.js');
const { art, SIZE } = await import('../../src/ui/aliens/bake.js');
const { default: w21 } = await import('../../src/ui/aliens/w21.js');

const look = { world: 21, ...w21look };
const A = art(look);
const WORLDS = LOOKS.map((l) => l.world).filter((w) => w !== look.world); // every other world in LOOKS
const HALF = SIZE / 2;

function paint(role, f, make = recorder) {
  const [b, l] = [make(), make()];
  A[role](b.ctx, l.ctx, f, look.palette.alien[role]);
  return { b, l };
}

test("slot 21 of the alien art holds world 21's own painter for every role, none of them another world's", () => {
  assert.equal(A.rate, look.music.bpm / 60, 'a frame a beat of the drums');
  assert.match(A.crack, /^#[0-9a-f]{6}$/);
  for (const role of ROLES) {
    assert.equal(typeof A[role], 'function', role);
    assert.equal(A[role], w21[role], `${role} comes from w21.js`);
    for (const world of WORLDS) assert.notEqual(A[role], art({ world })[role], `${role} is not world ${world}'s`);
  }
});

test('every creature paints a body with lights over it on both beats, inside its sprite, and the five are five', () => {
  const drawn = [];
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      assert.ok(lit(b) >= 20, `${role} frame ${f}: ${lit(b)} fills and strokes of body`);
      assert.ok(lit(l) >= 4, `${role} frame ${f}: ${lit(l)} lights`);
      const { b: tb, l: tl } = paint(role, f, tracker);
      for (const d of [tb.bounds, tl.bounds]) {
        assert.ok(d.x0 >= -HALF && d.x1 <= HALF && d.y0 >= -HALF && d.y1 <= HALF, `${role} frame ${f}: ${[d.x0, d.y0, d.x1, d.y1].map(Math.round)}`);
      }
    }
    assert.notEqual(text(paint(role, 0).b), text(paint(role, 1).b), `${role} moves between beats`);
    drawn.push(text(paint(role, 0).b));
  }
  assert.equal(new Set(drawn).size, ROLES.length);
});

test('the cast files keep the sprite rules', () => {
  fileRules(assert, ['w21', 'w21-kit', 'w21-host', 'w21-deer', 'w21-giant', 'bake'].map((n) => `aliens/${n}.js`));
});
