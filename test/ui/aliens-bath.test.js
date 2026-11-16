import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, ROLES, colourOf, paint, dizzy, lit, text, colours, far, tracker, stateful, fileRules } from './aliens-bath-kit.js';

// Rubber Regatta's five bath toys: the Squeakling, the Slipper, the Squirt Frog, the Sponge and the Paper Boat (aliens/w19.js .. w19-*.js),
// as the painters draw them, and their knocked-out drawings (dizzy, w19-*-dizzy.js) that bodies-view.js bakes; the pieces they share are
// in w19-kit.js. The bodies on the field are test/ui/bath-bodies.test.js.
const { art } = await import('../../src/ui/aliens/bake.js');
const { default: w19 } = await import('../../src/ui/aliens/w19.js');
const { SIZE: SOAP_SIZE } = await import('../../src/ui/aliens/w19-soap.js');

const A = art(look);
const GRAPE = look.palette.enemy;
const NEAR = 60; // no colour of a toy within this distance (in RGB) of the enemy's grape

test("the world's module is registered, bobs in time with the music and has a painter and a dizzy drawing for every role", () => {
  assert.equal(look.world, 19);
  assert.equal(A.grunt, w19.grunt, 'bake.js has the world-19 module in slot 19');
  assert.equal(A.rate, look.music.bpm / 60, 'a frame a beat');
  assert.equal(A.sync, true, 'the whole fleet in step');
  assert.ok(A.bob >= 1 && A.bob <= 4 && A.halo > 0 && A.halo < 0.4);
  assert.match(A.crack, /^#[0-9a-f]{6}$/);
  for (const role of ROLES) {
    assert.equal(typeof A[role], 'function', role);
    assert.equal(typeof A.dizzy[role], 'function', `${role} dizzy`);
  }
  assert.equal(A.diver.size, SOAP_SIZE, 'the soap has a taller canvas for its trail of bubbles');
  for (const role of ROLES.filter((r) => r !== 'diver')) assert.equal(A[role].size, undefined, `${role} keeps the 96 px canvas`);
});

test('every toy paints a lavish body with wet shine over it, on both beats', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f);
      assert.ok(lit(l) >= 12, `${role} frame ${f}: ${lit(l)} fills and strokes of shine`);
      assert.ok(lit(b) >= 60, `${role} frame ${f}: ${lit(b)} fills and strokes of body`);
      assert.ok(b.calls.length >= 300, `${role} frame ${f}: ${b.calls.length} calls of body is not lavish`);
      assert.ok(b.calls.length > l.calls.length, `${role} frame ${f} has a body under its shine`);
    }
  }
});

test('the beats are two drawings for every toy, body and shine, and each is deterministic; the five are five different drawings', () => {
  for (const role of ROLES) {
    const [a, b] = [paint(A, role, 0), paint(A, role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
    assert.notEqual(text(a.l), text(b.l), `${role}: the shine is the same on both beats`);
    const again = paint(A, role, 1);
    assert.equal(text(again.b), text(b.b), `${role}: painted twice, the body differs`);
    assert.equal(text(again.l), text(b.l), `${role}: painted twice, the shine differs`);
  }
  assert.equal(new Set(ROLES.map((role) => text(paint(A, role, 0).b))).size, 5);
});

test('the duckling squeaks on beat 1, the frog puffs its cheeks then, and the boat carries the gold-starred crate', () => {
  const squeaks = (f) => paint(A, 'grunt', f).l.calls.filter(([k]) => k === 'lineTo').length;
  assert.equal(squeaks(1) - squeaks(0), 3, 'three squeak lines leave the bill on beat 1 alone');
  const cheeks = (f) => paint(A, 'gunner', f).b.calls.filter(([k, , , r]) => k === 'arc' && r >= 10.5).length;
  assert.ok(cheeks(1) >= 2 && cheeks(0) === 0, 'two cheeks blown up on beat 1, none on beat 0');
  const gold = colours((b, l) => A.carrier(b(), l(), 0, colourOf('carrier')));
  assert.ok(gold.includes('#ffd23a'), 'a gold star on the crate');
});

test('every toy and its shine lie inside the canvas with the outline to spare, on both beats', () => {
  for (const role of ROLES) {
    const half = (A[role].size ?? 96) / 2;
    for (const f of [0, 1]) {
      const { b, l } = paint(A, role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -half + 1.5 && b.bounds.x1 <= half - 1.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -half + 1.5 && b.bounds.y1 <= half - 1.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -half && l.bounds.x1 <= half && l.bounds.y0 >= -half && l.bounds.y1 <= half, `${n}: a light reaches the canvas edge`);
    }
  }
});

test('every painter, live and dizzy, gives back the line caps and joins, width, colours, alpha and blend mode, with every save restored', () => {
  for (const role of ROLES) {
    for (const f of [0, 1]) {
      const [b, l] = [stateful(), stateful()];
      const before = { ...b.state };
      A[role](b.ctx, l.ctx, f, colourOf(role));
      for (const [name, s] of [['body', b], ['lights', l]]) {
        assert.equal(s.stack.length, 0, `${role} frame ${f} ${name}: unbalanced saves`);
        assert.deepEqual({ ...s.state }, before, `${role} frame ${f} ${name}`);
      }
    }
    const g = stateful();
    const before = { ...g.state };
    A.dizzy[role](g.ctx, colourOf(role));
    assert.equal(g.stack.length, 0, `${role} dizzy: unbalanced saves`);
    assert.deepEqual({ ...g.state }, before, `${role} dizzy`);
  }
});

test("nothing the toys are painted in, live or dizzy, comes near the enemy's grape", () => {
  for (const role of ROLES) {
    const runs = [0, 1].map((f) => (b, l) => A[role](b(), l(), f, colourOf(role)));
    runs.push((g) => A.dizzy[role](g(), colourOf(role)));
    for (const run of runs) {
      for (const c of colours(run)) assert.ok(far(c, GRAPE) >= NEAR, `${role}: ${c} is too near the grape (${far(c, GRAPE).toFixed(0)})`);
    }
  }
});

test('the five dizzy drawings are five, each unlike its live toy, and fit the 96 px a live toy has', () => {
  const drawn = ROLES.map((role) => text(dizzy(A, role)));
  assert.equal(new Set(drawn).size, 5);
  for (const [i, role] of ROLES.entries()) {
    for (const f of [0, 1]) assert.notEqual(drawn[i], text(paint(A, role, f).b), `${role}: the dizzy drawing is the live one`);
    const { bounds: d } = dizzy(A, role, tracker);
    assert.ok(d.x0 >= -48 && d.x1 <= 48 && d.y0 >= -48 && d.y1 <= 48, `${role} dizzy: ${[d.x0, d.y0, d.x1, d.y1].map(Math.round)}`);
    const eyes = dizzy(A, role).calls.filter(([k]) => k === 'ellipse' || k === 'arc').length;
    assert.ok(eyes >= 4, `${role} dizzy: two eyes and their pupils`);
  }
});

test('the cast files keep the sprite rules', () => {
  fileRules(assert, ['w19', 'w19-kit', 'w19-duck', 'w19-duck-dizzy', 'w19-soap', 'w19-soap-dizzy', 'w19-frog', 'w19-frog-dizzy', 'w19-sponge', 'w19-sponge-dizzy', 'w19-boat', 'w19-boat-dizzy', 'bake'].map((n) => `aliens/${n}.js`));
});
