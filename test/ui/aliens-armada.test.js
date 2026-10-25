import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { LOOKS } from '../../src/ui/looks/index.js';
import { art, ROLE_LIST } from '../../src/ui/aliens/bake.js';
import { recorder } from './dom-kit.js';

// Sunset Armada's fleet: the rotor drone, gull glider, balloon gun-pod, ironclad and cargo zeppelin
// (art.test.js has the other worlds', art-archive.test.js the archive's).

const look = LOOKS[12];
const lit = ({ calls }) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;

function paint(role, f) {
  const [b, l] = [recorder(), recorder()];
  art(look)[role](b.ctx, l.ctx, f, look.palette.alien[role]);
  return { b, l };
}

// A drawing as text: every call with its numbers and strings (gradients and other objects as ~).
const text = ({ calls }) => calls.map((c) => c.map((a) => (typeof a === 'number' || typeof a === 'string' ? a : '~')).join(',')).join(';');

test('every Sunset Armada ship burns on its lights layer on both beats: the drone, glider, gun-pod, ironclad and zeppelin', () => {
  assert.equal(look.world, 13);
  for (const role of ROLE_LIST) {
    for (const f of [0, 1]) {
      const { b, l } = paint(role, f);
      assert.ok(lit(l) >= 5, `${role} frame ${f}: ${lit(l)} fills and strokes of light`);
      assert.ok(b.calls.length > lit(l) * 3, `${role} frame ${f} has a body under its lights`);
    }
  }
  assert.equal(art(look).crack, '#ffb54a', 'the ironclad cracks with the furnace showing in the splits');
});

test('both beats of every ship are two drawings: rotors turn, wings flap, flags and crates swing, smoke climbs', () => {
  for (const role of ROLE_LIST) {
    const [a, b] = [paint(role, 0), paint(role, 1)];
    assert.notEqual(text(a.b), text(b.b), `${role}: the body is the same on both beats`);
  }
});

test("the gun-pod's gun is quiet on one beat and fires on the other: a flash of fire at the muzzle", () => {
  const [rest, fire] = [paint('gunner', 0), paint('gunner', 1)];
  assert.ok(lit(fire.l) > lit(rest.l) * 1.5, `${lit(fire.l)} fills and strokes of light firing against ${lit(rest.l)} at rest`);
  assert.ok(fire.b.calls.length > rest.b.calls.length, 'the shot leaves puffs of smoke');
});

test("the ironclad's broadside rolls: the outer guns glow on one beat, the great gun on the other", () => {
  const [a, b] = [paint('armored', 0), paint('armored', 1)];
  assert.notEqual(text(a.l), text(b.l), 'the furnace light is the same on both beats');
});

test("the zeppelin carries the power-up's lantern, bright on both beats, and lamps in its gondola", () => {
  for (const f of [0, 1]) {
    const { l } = paint('carrier', f);
    assert.ok(lit(l) >= 12, `frame ${f}: ${lit(l)} fills and strokes of light: lantern, portholes, nav lamps, props`);
  }
});

test("Sunset Armada's painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/aliens/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^w13.*\.js$/.test(n));
  assert.ok(files.length >= 8, 'the fleet is split over several files');
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
