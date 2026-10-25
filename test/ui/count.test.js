import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';

// The Crimson Count's art under stand-in canvases: what each part puts on the lights layer (all that
// survives Hollow Night's darkness), and the live extras, which are cached sprites only.
installCanvas(64);
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART, painterFor } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const look = LOOKS[9];
const def = BOSS_DEFS.find((d) => d.kind === 'count');
const art = BOSS_ART.count;
const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;

test("every part of the Count, and his hull, paints lights: eyes, heart, claws, cape edge, lapel piping", () => {
  const hull = recorder();
  art.hull(recorder().ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 8, 'the hull lights');
  for (const p of def.parts) {
    const [paint] = painterFor(art, p.id);
    const b = recorder();
    const l = recorder();
    paint(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 6, `${p.id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls) * 0.5, `${p.id} has a body too`);
  }
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 6, `phase ${phase} widens the cape in light`);
  }
});

// A boss to draw live extras for: parts at their places, every one alive.
const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy })) });
const images = (b, t) => {
  const { ctx, calls } = recorder();
  art.live(ctx, b, t, 1);
  return calls.filter(([k]) => k === 'drawImage').length;
};

test('the heart beats and the eyes burn at rest; the cape runs with light in the later phases; the swarm comes with the last', () => {
  const [rest, hover, orbit] = [0, 1, 2].map((phase) => images(boss(phase), 4.2));
  assert.ok(rest >= 5, `${rest} glows at rest`);
  assert.ok(hover >= rest + 10, `${hover} in the hover phase: crimson running down the ribs`);
  assert.ok(orbit >= hover + 25, `${orbit} in the orbit phase: a cloud of bats round the heart`);
});

test('the swarm spirals out of the heart when the phase begins, and keeps its place once it is gone', () => {
  const b = boss(1);
  images(b, 10); // seen in the hover phase
  b.phase = 2;
  const [began, later] = [10.1, 14].map((t) => images(b, t));
  assert.ok(later >= began, 'bats fade in');
  const dead = boss(2);
  dead.parts.find((p) => p.id === 'heart').hp = 0;
  // The heart usually falls before the last phase, so the bats circle its wreck: only its glows go.
  assert.ok(images(dead, 14) > later - 10, 'the swarm outlives the heart');
});

test('a dying part leaves no glow behind in the live extras', () => {
  const b = boss(0);
  for (const p of b.parts) p.hp = 0;
  assert.equal(images(b, 3), 0);
});
