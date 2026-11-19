import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// The rule for bosses from world 21 on (CLAUDE.md, bosses/life.js): every one is alive, and alive only in its art. No part is drawn more
// than LIFE_MAX_PX from where the core puts it, at every limit's extreme and through a whole fight; a boss without `life` (the twenty
// older ones) draws exactly as before; and any boss added after them that has no `life` fails here.
installCanvas(64);
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { LEVELS } = await import('../../src/core/levels.js');
const { createWorld, stepWorld } = await import('../../src/core/world.js');
const { autopilot } = await import('../../src/core/autopilot.js');
const { lookFor } = await import('../../src/ui/looks/index.js');
const { BOSS_ART, bakeWith, stageOf, warmBoss } = await import('../../src/ui/bosses/bake.js');
const { drawBoss, drawBossLights } = await import('../../src/ui/bosses/index.js');
const { halos, partBodies, partLights, warns } = await import('../../src/ui/bosses/parts.js');
const { lifeFor, lifeMatrix, breathOf, LIFE_MAX_PX, LIFE_BREATH_HZ } = await import('../../src/ui/bosses/life.js');

// The bosses of worlds 1-20, drawn before bosses came alive; every boss after them must have life.
const OLDER = ['mothership', 'pyramid', 'fortress', 'shogun', 'queen', 'agent', 'titan', 'singularity', 'behemoth', 'count', 'wyrm',
  'grimoire', 'galleon', 'carousel', 'angler', 'moth', 'craving', 'ray', 'duck', 'editor'];
const rigged = Object.entries(BOSS_ART).filter(([, mod]) => mod.life);
const levelOf = (kind) => LEVELS.find((l) => l.boss === kind);
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

test('every boss after the twenty older ones is alive: it declares life, and its rig covers parts of its own', () => {
  assert.equal(OLDER.length, 20);
  for (const kind of OLDER) assert.ok(BOSS_ART[kind], `${kind} is a boss`);
  const newer = Object.keys(BOSS_ART).filter((k) => !OLDER.includes(k));
  assert.ok(newer.includes('crowns'), 'the Ten-Crowned King is the first');
  for (const kind of newer) {
    const life = BOSS_ART[kind].life;
    assert.ok(life, `${kind} has life (bosses/life.js)`);
    const def = BOSS_DEFS.find((d) => d.kind === kind);
    assert.ok(def.parts.some((p) => lifeFor(life, p.id)), `${kind}'s parts bend`);
    assert.ok(life.breath, `${kind} breathes`);
  }
});

test('with every limit at its extreme, no part of a living boss is drawn more than LIFE_MAX_PX from its box', () => {
  const ks = [-1, -0.5, 0, 0.5, 1];
  for (const [kind, mod] of rigged) {
    const def = BOSS_DEFS.find((d) => d.kind === kind);
    for (const p of def.parts) {
      const s = lifeFor(mod.life, p.id);
      let most = 0;
      for (const a of ks) for (const st of ks) for (const w of [-1, 0, 1]) {
        const m = s ? lifeMatrix(s.pivot, [p.dx, p.dy], a * s.turn, st * s.stretch) : [1, 0, 0, 1, 0, 0];
        const [sx, sy, py] = breathOf(mod.life, w / (4 * LIFE_BREATH_HZ)) ?? [1, 1, 0]; // w: the breath's sine, at -1, 0, 1
        const [x, y] = apply(m, [p.dx, p.dy]);
        most = Math.max(most, Math.hypot(sx * x - p.dx, py + sy * (y - py) - p.dy));
      }
      assert.ok(most <= LIFE_MAX_PX, `${kind}.${p.id} moves up to ${most.toFixed(2)} px`);
    }
  }
});

// Every canvas a baked part owns, mapped to the part: its body in any state, its lights, its flash.
function owners(B) {
  const map = new Map();
  const walk = (o, id) => {
    if (!o || typeof o !== 'object' || map.has(o)) return;
    if (o.getContext) return void map.set(o, id);
    Object.values(o).forEach((v) => walk(v, id));
  };
  for (const [id, set] of Object.entries(B.parts)) walk(set, id);
  return map;
}

test('through a whole fight every part of a living boss is drawn within LIFE_MAX_PX of its box, in both passes', () => {
  for (const [kind] of rigged) {
    const level = levelOf(kind);
    const look = lookFor(level);
    const B = warmBoss(look, kind);
    const own = owners(B);
    const w = createWorld(level, level.seed);
    let [drawn, most] = [0, 0];
    for (let i = 0; i < 60 * 60; i++) {
      stepWorld(w, 1 / 60, autopilot(w));
      w.events.length = 0;
      if (w.boss && w.boss.dying !== null) break;
      if (!w.boss || i % 5) continue;
      for (const pass of [drawBoss, drawBossLights]) {
        const T = tracker();
        pass(T.ctx, w, look, i / 60, 1, 1);
        for (const c of T.calls) {
          const id = own.get(c.img);
          if (!id || c.args.length !== 2) continue; // a part's sprite drawn whole (not a sliding half)
          const p = w.boss.parts.find((q) => q.id === id);
          const off = Math.hypot((c.box[0] + c.box[2]) / 2 - p.x, (c.box[1] + c.box[3]) / 2 - p.y);
          assert.ok(off <= LIFE_MAX_PX + 1e-6, `${kind}.${id} at ${(i / 60).toFixed(2)} s: ${off.toFixed(2)} px off`);
          [drawn, most] = [drawn + 1, Math.max(most, off)];
        }
      }
    }
    assert.ok(drawn > 1000, `${kind}: ${drawn} part draws checked`);
    assert.ok(most > LIFE_MAX_PX / 3, `${kind}: and they move, up to ${most.toFixed(2)} px`);
  }
});

// A boss standing at (960, 370), every part at its place, at full hp; one warn half wound.
const stand = (def) => ({ kind: def.kind, x: 960, y: 370, phase: 0, dying: null,
  parts: def.parts.map((p) => ({ ...p, max: p.hp, x: 960 + p.dx, y: 370 + p.dy, open: false, cracked: false })),
  warns: [{ part: def.parts[0].id, left: 0.6, total: 1 }] });

test('a boss without life draws as before: each part one sprite at its corner, and no life transform anywhere', () => {
  const def = BOSS_DEFS.find((d) => d.kind === 'crowns');
  const look = lookFor(levelOf('crowns'));
  const { life, front, limbs, ...still } = BOSS_ART.crowns; // the King as he was drawn before he came alive
  assert.ok(life && front && limbs);
  const B = bakeWith(still, stageOf(look, 'crowns'));
  const b = stand(def);
  const r = recorder();
  partBodies(r.ctx, b, B, look, 50);
  assert.deepEqual(r.calls.map((c) => c.slice(0, 4)), b.parts.map((p) => {
    const set = B.parts[p.id];
    return ['drawImage', set.body, p.x - set.w / 2 - set.m, p.y - set.h / 2 - set.m];
  }), 'one sprite per part, where the core puts it');
  for (const pass of [(c) => partLights(c, b, B, look, 50, 1), (c) => halos(c, b, B, look.palette.boss, 50, 1), (c) => warns(c, b, B, look, 50, 1)]) {
    const q = recorder();
    pass(q.ctx);
    assert.ok(q.calls.every(([k]) => k === 'drawImage'), 'only sprites, no transform pushed');
  }
  for (const kind of OLDER) {
    const lk = lookFor(levelOf(kind));
    const bb = stand(BOSS_DEFS.find((d) => d.kind === kind));
    for (const pass of [drawBoss, drawBossLights]) {
      const q = recorder();
      pass(q.ctx, { boss: bb }, lk, 50, 1, 1);
      assert.ok(!q.calls.some(([k]) => k === 'transform'), `${kind}: no life transform`);
      assert.equal(q.calls.filter(([k]) => k === 'save').length, q.calls.filter(([k]) => k === 'restore').length);
    }
  }
});
