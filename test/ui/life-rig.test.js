import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The life rig (bosses/life.js), read through the King's own life (crowns-life.js): one spring per part, a turn and a stretch about a
// pivot, driven by rest (a sway, livelier each phase), motion (a lean against his speed that the spring carries past when he stops),
// hits (a squash and a twist that wobble out) and warns (a wind-up as the warn counts down, a lunge once it is spent); a pure function
// of the times it is drawn at, stepping once per time; the transform it makes; the twin rule; the breath.
installCanvas(64);
const { BOSSES8 } = await import('../../src/core/bosses-data-8.js');
const { WARN } = await import('../../src/core/boss-attack.js');
const { BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const L = await import('../../src/ui/bosses/life.js');
const { lifeOf, lifeFor, lifeMatrix, breathOf, LIFE_ACROSS, LIFE_MAX_DT, LIFE_PHASE } = L;

const art = BOSS_ART.crowns;
const B = { mod: art };
const def = BOSSES8.find((d) => d.kind === 'crowns');
const TICK = 1 / 60;
const boss = (phase = 0, x = 960) => ({ kind: 'crowns', x, y: 370, phase, dying: null, warns: [],
  parts: def.parts.map((p) => ({ ...p, max: p.hp, x: x + p.dx, y: 370 + p.dy, open: false, cracked: false })) });
const part = (b, id) => b.parts.find((p) => p.id === id);
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
// The turn and stretch part id is drawn at: its centre's angle about the pivot, and its distance from it, against where the core puts it.
function read(pose, id) {
  const { pivot: [px, py] } = lifeFor(art.life, id);
  const p = def.parts.find((q) => q.id === id);
  const [x, y] = apply(pose[id], [p.dx, p.dy]);
  const turn = Math.atan2(y - py, x - px) - Math.atan2(p.dy - py, p.dx - px);
  return { turn: Math.atan2(Math.sin(turn), Math.cos(turn)), stretch: Math.hypot(x - px, y - py) / Math.hypot(p.dx - px, p.dy - py) - 1 };
}
// Two bosses drawn at the same times from t0, each frame first given what `at(b, t, which)` does to it; returns per frame both reads of id.
function twins(id, t0, secs, at, phase = 0) {
  const [a, b] = [boss(phase), boss(phase)];
  const out = [];
  for (let i = 0, t = t0; i <= Math.round(secs / TICK); i++, t = t0 + i * TICK) {
    at(a, t, 0);
    at(b, t, 1);
    out.push({ t, a: read(lifeOf(a, B, t), id), b: read(lifeOf(b, B, t), id) });
  }
  return out;
}
const near = (x, y, eps = 1e-9) => Math.abs(x - y) <= eps;

test('the rig is a pure function of the times it is drawn at, and the same time twice steps once', () => {
  const script = (b, t) => { // he glides, a head is hit, the great head warns
    b.x = 960 + 200 * Math.sin(t * 0.6);
    if (near(t, 5.5, 1e-6)) part(b, 'headL2').hp -= 1;
    b.warns = t > 6 && t < 6 + WARN ? [{ part: 'head', left: 6 + WARN - t, total: WARN }] : [];
  };
  const run = (twice) => {
    const b = boss(1);
    const poses = [];
    for (let i = 0; i < 300; i++) {
      const t = 4 + i * TICK;
      script(b, t);
      if (twice) lifeOf(b, B, t);
      poses.push(lifeOf(b, B, t));
    }
    return poses;
  };
  const once = run(false);
  assert.deepEqual(run(false), once, 'a second boss given the same times is drawn the same');
  assert.deepEqual(run(true), once, 'drawing each frame twice (the bodies, the lights, the darkness pass) changes nothing');
  const b = boss();
  const first = lifeOf(b, B, 3);
  b.x += 80;
  part(b, 'head').hp -= 4;
  assert.equal(lifeOf(b, B, 3), first, 'the same t gives the same pose, whatever changed');
  assert.notDeepEqual(lifeOf(b, B, 3 + TICK), first, 'the next t steps');
});

test('a boss first seen starts at rest, its spring on its target: two copies at the same t are drawn alike; stalls and rewinds stay sane', () => {
  const [a, b] = [boss(), boss()];
  assert.deepEqual(lifeOf(a, B, 7.3), lifeOf(b, B, 7.3), 'clones and frozen frames match');
  assert.ok(Math.abs(read(lifeOf(a, B, 7.3), 'headL3').turn) > 0.01, 'and they already sway');
  const c = boss();
  for (const t of [1, 1 + TICK, 40, 39, 39 + TICK, 1e4]) {
    for (const [id, r] of Object.entries(lifeOf(c, B, t))) assert.ok(r.every(Number.isFinite), `${id} at ${t}`);
    for (const id of ['head', 'armsR']) assert.ok(Math.abs(read(lifeOf(c, B, t), id).turn) <= lifeFor(art.life, id).turn + 1e-9);
  }
  assert.ok(LIFE_MAX_DT <= 0.1, 'a stall steps the spring a little at most');
});

test('a hit snaps the part back, a squash and a twist that wobble out', () => {
  const hit = 6;
  const run = twins('headL1', 5, 4, (b, t, w) => { if (w && near(t, hit, 1e-6)) part(b, 'headL1').hp -= 1; });
  const d = run.map((f) => ({ t: f.t, turn: f.b.turn - f.a.turn, stretch: f.b.stretch - f.a.stretch }));
  assert.ok(d.filter((f) => f.t < hit).every((f) => near(f.turn, 0) && near(f.stretch, 0)), 'nothing before the hit');
  const soon = d.filter((f) => f.t > hit && f.t < hit + 0.3);
  const { stretch, turn } = lifeFor(art.life, 'headL1');
  assert.ok(Math.min(...soon.map((f) => f.stretch)) < -0.3 * stretch, 'it squashes');
  assert.ok(Math.max(...soon.map((f) => Math.abs(f.turn))) > 0.3 * turn, 'and twists');
  const after = d.filter((f) => f.t > hit);
  const flips = after.slice(1).filter((f, i) => Math.sign(f.turn) !== Math.sign(after[i].turn) && Math.abs(f.turn) > 1e-4).length;
  assert.ok(flips >= 2, `it wobbles: the twist swings back and forth (${flips} crossings)`);
  assert.ok(after.filter((f) => f.t > hit + 2.5).every((f) => Math.abs(f.turn) < 0.02 * turn && Math.abs(f.stretch) < 0.02 * stretch), 'and settles');
});

// The great head warns at `at`; spent (it fired) or cleared (`clear`: the phase changed under it) when its countdown ends.
function warned(clear) {
  const at = 6;
  return twins('head', 5, 3, (b, t, w) => {
    const left = at + WARN - t;
    b.warns = w && t >= at && left > 0 ? [{ part: 'head', left, total: WARN }] : [];
    if (w && clear && left <= 0) b.phase = 1;
  }).map((f) => ({ t: f.t - at, turn: f.b.turn - f.a.turn, stretch: f.b.stretch - f.a.stretch }));
}

test('a warn coils the part back and squashes it as it counts down, then it lunges when the warn is spent', () => {
  const d = warned(false);
  const { coil = 1, turn, stretch } = lifeFor(art.life, 'head');
  const at = (s) => d.reduce((best, f) => (Math.abs(f.t - s) < Math.abs(best.t - s) ? f : best));
  const [early, late] = [at(WARN * 0.3), at(WARN - TICK)];
  assert.ok(late.turn * coil > 0.4 * turn && late.turn * coil > early.turn * coil, `it coils, more as the warn grows: ${early.turn} then ${late.turn}`);
  assert.ok(late.stretch < -0.3 * stretch && late.stretch < early.stretch, 'and squashes');
  const lunge = d.filter((f) => f.t > WARN && f.t < WARN + 0.35);
  assert.ok(Math.max(...lunge.map((f) => f.stretch)) > 0.5 * stretch, 'then stretches forward');
  assert.ok(Math.min(...lunge.map((f) => f.turn * coil)) < -0.3 * turn, 'and swings past where it rested');
});

test('a warn cleared without a shot (a phase change, a kill) ends in no lunge', () => {
  const peak = (d) => Math.max(...d.filter((f) => f.t > WARN && f.t < WARN + 0.35).map((f) => f.stretch));
  const [spent, cleared] = [peak(warned(false)), peak(warned(true))];
  assert.ok(spent > cleared + 0.3 * lifeFor(art.life, 'head').stretch, `spent ${spent.toFixed(3)} against cleared ${cleared.toFixed(3)}`);
});

test('he leans against his motion; when he stops the heads swing on past and back', () => {
  const [go, stop] = [5, 7];
  const run = twins('head', 4, 5, (b, t, w) => { if (w) b.x = 960 + 150 * (Math.min(Math.max(t, go), stop) - go); });
  const d = run.map((f) => ({ t: f.t, turn: f.b.turn - f.a.turn }));
  const moving = d.filter((f) => f.t > go + 1 && f.t < stop);
  assert.ok(moving.every((f) => f.turn < 0), 'moving right, the head (above its pivot) trails left');
  const after = d.filter((f) => f.t > stop && f.t < stop + 1.5);
  assert.ok(Math.max(...after.map((f) => f.turn)) > 0.1 * lifeFor(art.life, 'head').turn, 'stopped, it overshoots to the right');
});

test('he sways wider in each later phase', () => {
  const range = (phase) => {
    const b = boss(phase);
    let most = 0;
    for (let t = 2; t < 22; t += TICK) most = Math.max(most, Math.abs(read(lifeOf(b, B, t), 'headR2').turn));
    return most;
  };
  const r = [0, 1, 2].map(range);
  assert.ok(r[1] > r[0] && r[2] > r[1], `${r.map((x) => x.toFixed(3))}`);
  assert.ok(LIFE_PHASE.every((k, i) => i === 0 || k > LIFE_PHASE[i - 1]));
});

test('the transform turns about the pivot and stretches along the pivot-to-centre axis, narrowing across it', () => {
  const [P, C] = [[10, 20], [10, -30]];
  const m = lifeMatrix(P, C, 0.2, 0.1);
  assert.deepEqual(apply(m, P).map((v) => +v.toFixed(9)), P, 'the pivot stays put');
  const [x, y] = apply(m, C);
  assert.ok(near(Math.hypot(x - P[0], y - P[1]), 50 * 1.1, 1e-9), 'the centre is stretched along the axis');
  assert.ok(near(Math.atan2(y - P[1], x - P[0]) - Math.atan2(-50, 0), 0.2, 1e-9), 'and turned');
  const [sx, sy] = apply(lifeMatrix(P, C, 0, 0.1), [P[0] + 10, P[1]]);
  assert.ok(near(Math.hypot(sx - P[0], sy - P[1]), 10 * (1 - LIFE_ACROSS * 0.1), 1e-9), 'across the axis it narrows');
});

test('a part keyed by its base name serves its right twin mirrored; the breath scales about its line', () => {
  const life = { parts: { arm: { pivot: [-100, 5], turn: 0.1, stretch: 0.1, sway: 0.5, coil: 1 }, eye: { pivot: [0, 0], turn: 0.1, stretch: 0, sway: 0 } } };
  assert.equal(lifeFor(life, 'armL'), life.parts.arm);
  assert.deepEqual([lifeFor(life, 'armR').pivot, lifeFor(life, 'armR').coil], [[100, 5], -1]);
  assert.equal(lifeFor(life, 'eye'), life.parts.eye);
  assert.equal(lifeFor(life, 'tail'), null);
  assert.equal(breathOf(life, 3), null, 'no breath declared, none drawn');
  const { y, amp } = art.life.breath;
  for (let t = 0; t < 10; t += 0.37) {
    const [sx, sy, py] = breathOf(art.life, t);
    assert.equal(py, y);
    assert.ok(Math.abs(sy - 1) <= amp + 1e-12 && Math.abs(sx - 1) <= Math.abs(sy - 1) + 1e-12);
  }
  assert.equal(lifeOf({ x: 0, parts: [] }, { mod: { parts: {} } }, 1), null, 'a module without life has no pose');
});
