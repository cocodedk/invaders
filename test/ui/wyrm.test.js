import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';

// The Crystal Wyrm's art under stand-in canvases: what each part puts on the lights layer, and the live
// extras, which are cached sprites only (the opaque ones only in the boss's own pass).
installCanvas(64);
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART, painterFor } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const look = LOOKS[10];
const def = BOSS_DEFS.find((d) => d.kind === 'wyrm');
const art = BOSS_ART.wyrm;
const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;

test('every part of the wyrm, and its hull, paints lights: eyes, gems, the throat, the veins and the frill', () => {
  const hull = recorder();
  art.hull(recorder().ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 8, 'the hull lights');
  for (const p of def.parts) {
    const [paint] = painterFor(art, p.id);
    const b = recorder();
    const l = recorder();
    paint(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 5, `${p.id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls) * 0.5, `${p.id} has a body too`);
  }
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 10, `phase ${phase} lights the frill and the veins`);
  }
});

// A boss to draw live extras for: parts at their places, every one alive.
const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy })) });
const images = (b, t, own = false) => {
  const { ctx, calls } = recorder();
  art.live(ctx, b, t, 1, own, 10);
  return calls.filter(([k]) => k === 'drawImage').length;
};

test('the breath curls and the eyes and gems burn at rest; the crest and the frill light up from the second phase; the blizzard comes with the last', () => {
  const [rest, hover, orbit] = [0, 1, 2].map((phase) => images(boss(phase), 14));
  assert.ok(rest >= 12, `${rest} glows at rest`);
  assert.ok(hover >= rest + 20, `${hover} in the hover phase: crest tips and light running along the frill`);
  assert.ok(orbit >= hover + 20, `${orbit} in the orbit phase: a glint on every shard of the blizzard`);
});

test('the mist and the shards are opaque and come only in the boss\'s own pass', () => {
  assert.ok(images(boss(0), 14, true) >= images(boss(0), 14) + 8, 'mist and snow drawn in the own pass');
  assert.ok(images(boss(2), 14, true) >= images(boss(2), 14) + 40, 'and the shards themselves');
});

test('the blizzard spirals out of the head when the phase begins, and keeps its place once the head is gone', () => {
  const b = boss(1);
  images(b, 10);
  b.phase = 2;
  const [began, later] = [10.1, 14].map((t) => images(b, t, true));
  assert.ok(later >= began, 'shards fade in');
  const dead = boss(2);
  dead.parts.find((p) => p.id === 'head').hp = 0;
  assert.ok(images(dead, 14, true) > later - 20, 'the storm outlives the head: only its glows go');
});

test('a dying part leaves no glow behind in the live extras, and a boss with no maw breathes nothing', () => {
  const b = boss(0);
  for (const p of b.parts) p.hp = 0;
  assert.equal(images(b, 3), 0);
  const noMaw = boss(0);
  noMaw.parts.find((p) => p.id === 'maw').hp = 0;
  assert.equal(images(boss(0), 3) - images(noMaw, 3), 7, 'seven glows of breath fewer');
});
