import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, LOOKS, lit, text, tracker, recorder, fileRules } from './aliens-bath-kit.js';

// Midnight Press's five type creatures: the Lowercase, the Ink Drop, the Nib, the Slug and the Late Edition (aliens/w20.js .. w20-*.js),
// as the painters draw them in slot 20 of the alien art. The look is not in LOOKS until part 6, so it is built here as the game will.
const { default: w20look } = await import('../../src/ui/looks/w20.js');
const { art, SIZE } = await import('../../src/ui/aliens/bake.js');
const { default: w20 } = await import('../../src/ui/aliens/w20.js');

const look = { world: 20, ...w20look };
const A = art(look);
const WORLDS = LOOKS.map((l) => l.world).filter((w) => w !== look.world); // every other world in LOOKS
const HALF = SIZE / 2;

function paint(role, f, make = recorder) {
  const [b, l] = [make(), make()];
  A[role](b.ctx, l.ctx, f, look.palette.alien[role]);
  return { b, l };
}

test('slot 20 of the alien art holds world 20\'s own painter for every role, none of them another world\'s', () => {
  assert.equal(A.rate, look.music.bpm / 60, 'a frame a beat of the press');
  assert.match(A.crack, /^#[0-9a-f]{6}$/);
  for (const role of ROLES) {
    assert.equal(typeof A[role], 'function', role);
    assert.equal(A[role], w20[role], `${role} comes from w20.js`);
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
      const { b: tb } = paint(role, f, tracker);
      const d = tb.bounds;
      assert.ok(d.x0 >= -HALF && d.x1 <= HALF && d.y0 >= -HALF && d.y1 <= HALF, `${role} frame ${f}: ${[d.x0, d.y0, d.x1, d.y1].map(Math.round)}`);
    }
    assert.notEqual(text(paint(role, 0).b), text(paint(role, 1).b), `${role} moves between beats`);
    drawn.push(text(paint(role, 0).b));
  }
  assert.equal(new Set(drawn).size, ROLES.length);
});

test('the cast files keep the sprite rules', () => {
  fileRules(assert, ['w20', 'w20-kit', 'w20-type', 'w20-block', 'w20-paper', 'bake'].map((n) => `aliens/${n}.js`));
});
