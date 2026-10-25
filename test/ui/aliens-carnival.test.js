import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { LOOKS } from '../../src/ui/looks/index.js';
import { art, ROLE_LIST } from '../../src/ui/aliens/bake.js';
import { stripes } from '../../src/ui/aliens/w14-kit.js';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Ember Carnival's toys: the tin drone, firework rocket, jack-in-the-box, tin drummer and balloon carrier
// (aliens-armada.test.js has world 13's fleet, art.test.js the registry of every world).

const look = LOOKS[13];
const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;

function paint(role, f, make = recorder) {
  const [b, l] = [make(), make()];
  art(look)[role](b.ctx, l.ctx, f, look.palette.alien[role]);
  return { b, l };
}

// A drawing as text: every call with its numbers and strings (gradients and other objects as ~).
const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');

test('every Ember Carnival toy burns on its lights layer on both beats: drone, rocket, jack-in-the-box, drummer and carrier', () => {
  assert.equal(look.world, 14);
  for (const role of ROLE_LIST) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      assert.ok(lit(l) >= 8, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 3, `${role} frame ${f} has a body under its lights`);
    }
  }
});

test('both beats of every toy are two drawings: wings beat, the key turns, sparks fizz, the head springs, sticks trade places, balloons sway', () => {
  for (const role of ROLE_LIST) {
    const [a, b] = [paint(role, 0), paint(role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
  }
  for (const role of ['diver', 'gunner', 'armored']) {
    assert.notEqual(text(paint(role, 0).l), text(paint(role, 1).l), `${role}: the lights are the same on both beats`);
  }
});

test("the jack-in-the-box is shut with its eyes in the gap on one beat and fires on the other: the head out on its coil, fire at its mouth, smoke", () => {
  const [rest, fire] = [paint('gunner', 0), paint('gunner', 1)];
  assert.ok(lit(fire.l) > lit(rest.l) * 1.5, `${lit(fire.l)} fills and strokes of light firing against ${lit(rest.l)} at rest`);
  assert.ok(fire.b.calls.length > rest.b.calls.length * 1.2, 'the head, its ruff and cap and the smoke are only drawn when it fires');
});

test("the rocket sparks differently on each beat and keeps the middle of its tail clear, where a shell's fuse stands", () => {
  const sparks = (f) => paint('diver', f).l.calls.filter(([k]) => k === 'lineTo').map((c) => c[1]);
  const [a, b] = [sparks(0), sparks(1)];
  assert.notDeepEqual(a, b);
  assert.ok(a.length >= 8 && b.length >= 8, 'a fan of sparks on each side');
  assert.ok(![...a, ...b].some((x) => Math.abs(x) < 0.5), 'no spark runs straight up the middle');
});

test('the tin drummer strikes with one stick and lifts the other, and the sides trade on the next beat; he alone cracks, bare tin showing', () => {
  assert.notEqual(text(paint('armored', 0).l), text(paint('armored', 1).l), 'the flash of the strike is on the other side');
  const blooms = (f) => paint('armored', f).l.calls.filter(([k]) => k === 'fillRect').length;
  assert.equal(blooms(0), blooms(1), 'one strike each beat');
  assert.equal(art(look).crack, '#e8eef6', 'bare tin in the splits');
});

test("the carrier's lantern burns on both beats, bright: a flame, a core, a halo and a glint on the lights layer", () => {
  for (const f of [0, 1]) assert.ok(lit(paint('carrier', f).l) >= 10, `frame ${f}: lantern and glow`);
  assert.notEqual(text(paint('carrier', 0).b), text(paint('carrier', 1).b), 'the bunch sways, the box and lantern swing');
});

test('every toy and its lights lie inside the 96 px canvas, the ink outline and every bloom included, on both beats', () => {
  for (const role of ROLE_LIST) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f, tracker);
      const n = `${role} frame ${f}`;
      assert.ok(b.bounds.x0 >= -46.5 && b.bounds.x1 <= 46.5, `${n}: body ${b.bounds.x0.toFixed(1)}..${b.bounds.x1.toFixed(1)} side to side`);
      assert.ok(b.bounds.y0 >= -46.5 && b.bounds.y1 <= 46.5, `${n}: body ${b.bounds.y0.toFixed(1)}..${b.bounds.y1.toFixed(1)} top to bottom`);
      assert.ok(l.bounds.x0 >= -48 && l.bounds.x1 <= 48 && l.bounds.y0 >= -48 && l.bounds.y1 <= 48, `${n}: a bloom or a halo reaches the canvas edge`);
    }
  }
});

test('every painter puts the transform and the clip back: as many restores as saves, on the body and on the lights', () => {
  for (const role of ROLE_LIST) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      for (const [name, c] of [['body', b], ['lights', l]]) {
        const n = (k) => c.calls.filter(([key]) => key === k).length;
        assert.equal(n('save'), n('restore'), `${role} frame ${f} ${name}`);
      }
    }
  }
});

test('a shell can sprout its fuse from every toy: a plug spot in the upper half, on the sprite, with room above it for the fuse', () => {
  const at = art(look).shellAt;
  assert.deepEqual(Object.keys(at).toSorted(), ROLE_LIST.toSorted());
  for (const role of ROLE_LIST) {
    const [x, y] = at[role];
    assert.ok(Number.isFinite(x) && Number.isFinite(y), role);
    assert.ok(Math.abs(x) <= 14 && y < -10 && y > -46, `${role}: the plug at ${x},${y}`);
  }
});

test('stripes are cut at the box they are printed in, so no stripe paints beyond it', () => {
  const t = tracker();
  stripes(t.ctx, 10, -20, 30, 5, 6, 2, '#fff', 0.8);
  assert.ok(t.bounds.x0 >= 10 - 1e-9 && t.bounds.x1 <= 30 + 1e-9, `${t.bounds.x0}..${t.bounds.x1}`);
  assert.ok(t.bounds.y0 >= -20 - 1e-9 && t.bounds.y1 <= 5 + 1e-9);
});

test("Ember Carnival's painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^w14.*\.js$/.test(n));
  assert.ok(files.length >= 8, 'the toys are split over several files');
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
