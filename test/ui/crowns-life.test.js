import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { fileRules } from './aliens-bath-kit.js';

// The Ten-Crowned King alive (crowns-life.js; bosses/life.js): what bends and from where, and how his hull comes apart for it (bake.js):
// the limbs (each side's upper arms, each head's neck) baked to their boxes and drawn with their part's transform, under the front layer
// (his body), under the parts; the hull still the whole composite; each live head's collar now in its own sprite.
installCanvas(64);
const { BOSSES8 } = await import('../../src/core/bosses-data-8.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { LEVELS } = await import('../../src/core/levels.js');
const { lookFor } = await import('../../src/ui/looks/index.js');
const { BOSS_ART, bossArt, stageOf } = await import('../../src/ui/bosses/bake.js');
const { drawBoss, drawBossLights } = await import('../../src/ui/bosses/index.js');
const { lifeFor, lifeMatrix, breathOf, LIFE_MAX_PX, LIFE_BREATH_HZ } = await import('../../src/ui/bosses/life.js');
const { CROWNS_SEAT, CROWNS_BREATH } = await import('../../src/ui/bosses/crowns-life.js');
const { glow } = await import('../../src/ui/sprites.js');
const { ELBOWS, SHOULDER } = await import('../../src/ui/bosses/crowns-arms.js');
const { collar, collarDrop, edgeUnder } = await import('../../src/ui/bosses/crowns-robe.js');
const { front, hull, neckBox, armsBox } = await import('../../src/ui/bosses/crowns-hull.js');
const { head } = await import('../../src/ui/bosses/crowns-head.js');
const { neckOf, neckBase, PART } = await import('../../src/ui/bosses/crowns-kit.js');

const art = BOSS_ART.crowns;
const def = BOSSES8.find((d) => d.kind === 'crowns');
const look = lookFor(LEVELS.find((l) => l.boss === 'crowns'));
const S = stageOf(look, 'crowns');
const HEADS = def.parts.filter((p) => p.regrow).map((p) => p.id);
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
const paint = (fn, make = recorder) => {
  const [b, l] = [make(), make()];
  fn(b.ctx, l.ctx);
  return { b, l };
};
const stand = () => ({ kind: 'crowns', x: 960, y: 370, phase: 0, dying: null, warns: [],
  parts: def.parts.map((p) => ({ ...p, max: p.hp, x: 960 + p.dx, y: 370 + p.dy, open: false, cracked: false })) });

test('his heads bend from where their necks leave the mantle, the arm fans from the shoulders; the plate and the heart only breathe', () => {
  for (const id of HEADS) {
    const s = lifeFor(art.life, id);
    const [x, y] = neckOf(id);
    assert.deepEqual(s.pivot, id === 'headT' ? [0, neckBase(id)] : [x, y + edgeUnder(id)], `${id}'s pivot`);
    if (PART[id].x) assert.equal(s.coil, Math.sign(PART[id].x), `${id} coils outward`);
  }
  const shoulder = [SHOULDER[0] + PART.armsL.x, SHOULDER[1] + PART.armsL.y];
  assert.deepEqual(lifeFor(art.life, 'armsL').pivot, shoulder);
  assert.deepEqual(lifeFor(art.life, 'armsR').pivot, [-shoulder[0], shoulder[1]], 'the right fan, mirrored');
  for (const id of ['breast', 'heart']) assert.equal(lifeFor(art.life, id), null);
  for (const p of def.parts.filter((q) => lifeFor(art.life, q.id))) { // and each uses its room: at its limits it moves visibly
    const s = lifeFor(art.life, p.id);
    const m = lifeMatrix(s.pivot, [p.dx, p.dy], s.turn, s.stretch);
    const off = Math.hypot(m[0] * p.dx + m[2] * p.dy + m[4] - p.dx, m[1] * p.dx + m[3] * p.dy + m[5] - p.dy);
    assert.ok(off > LIFE_MAX_PX / 2, `${p.id}: ${off.toFixed(2)} px at its limits`);
  }
  assert.ok(art.life.breath.y > 0, 'he breathes about the seat, below his heads and arms');
});

test('the limbs are each side\'s upper arms and each head\'s neck, painted inside their boxes; the arms reach from the shoulder to every elbow', () => {
  assert.deepEqual(Object.keys(art.limbs), ['armsL', 'armsR', ...HEADS], 'the upper arms first, under the necks, as the hull paints them');
  const inside = (d, [x0, y0, x1, y1]) => d.x0 >= x0 && d.y0 >= y0 && d.x1 <= x1 && d.y1 <= y1;
  for (const [id, { box, paint: p }] of Object.entries(art.limbs)) {
    const { b, l } = paint((bc, lc) => p(bc, lc, S), tracker);
    assert.ok(inside(b.bounds, box) && (l.calls.length === 0 || inside(l.bounds, box)), `${id} stays in its box`);
    assert.ok(lit(paint((bc, lc) => p(bc, lc, S)).b.calls) > 0, `${id} paints`);
  }
  for (const s of [-1, 1]) {
    const [x0, y0, x1, y1] = armsBox(s);
    const pts = [[-s * (SHOULDER[0] + PART.armsL.x), SHOULDER[1] + PART.armsL.y], ...ELBOWS.map((e) => [-s * (e.x + PART.armsL.x), e.y + PART.armsL.y])];
    for (const [x, y] of pts) assert.ok(x > x0 && x < x1 && y > y0 && y < y1, `side ${s}: ${x}, ${y} in the box`);
  }
  for (const id of HEADS) assert.deepEqual(neckBox(id), art.limbs[id].box);
});

test('the hull is still the whole composite: the front, every limb and each live head\'s collar, nothing more or less', () => {
  const whole = lit(paint((b, l) => hull(b, l)).b.calls);
  const body = lit(paint((b, l) => front(b, l)).b.calls);
  const limbs = Object.values(art.limbs).reduce((n, { paint: p }) => n + lit(paint((b, l) => p(b, l, S)).b.calls), 0);
  const collars = HEADS.filter((id) => id !== 'headT').reduce((n, id) => n + lit(paint((b, l) => collar(b, l, 0, 0, neckOf(id)[2])).b.calls), 0);
  assert.equal(whole, body + limbs + collars);
});

test('each live head but the one above the great head paints its jewelled collar first, under its neck and face', () => {
  for (const p of def.parts.filter((q) => q.regrow)) {
    const [, ny, nw] = neckOf(p.id);
    const own = paint((b, l) => head(b, l, p)).b.calls;
    const ring = paint((b, l) => collar(b, l, 0, ny - p.dy + collarDrop(p.id), nw)).b.calls;
    const starts = JSON.stringify(own.slice(0, ring.length).map((c) => c.slice(0, 1))) === JSON.stringify(ring.map((c) => c.slice(0, 1)));
    assert.equal(starts, p.id !== 'headT', p.id);
  }
});

// The transform pushed for each drawImage of a recorded pass: the last 'transform' not yet restored, or null.
function transforms(calls) {
  const stack = [null];
  const out = [];
  for (const c of calls) {
    if (c[0] === 'save') stack.push(stack.at(-1));
    else if (c[0] === 'restore') stack.pop();
    else if (c[0] === 'transform') stack[stack.length - 1] = c.slice(1).join();
    else if (c[0] === 'drawImage') out.push([c[1], stack.at(-1), c.slice(2)]);
  }
  return out;
}

test('alive he is drawn as his limbs, then his front, then his parts, each limb with its part\'s own transform; never the whole hull', () => {
  const B = bossArt(look, 'crowns');
  assert.ok(B.hull.front && B.hull.body !== B.hull.front.body);
  assert.deepEqual(B.limbs.map((m) => m.id), Object.keys(art.limbs));
  const b = stand();
  b.warns = [{ part: 'armsL', left: 0.3, total: 0.7 }];
  const r = recorder();
  drawBoss(r.ctx, { boss: b }, look, 12.5);
  const drawn = transforms(r.calls);
  const at = (img) => drawn.findIndex(([d]) => d === img);
  const [fr, firstPart] = [at(B.hull.front.body), Math.min(...def.parts.map((p) => at(B.parts[p.id].body)))];
  assert.equal(at(B.hull.body), -1, 'the composite is not drawn alive');
  assert.ok(fr > 0 && fr < firstPart, 'the front over the limbs, under the parts');
  for (const m of B.limbs) {
    const i = at(m.body);
    assert.ok(i >= 0 && i < fr, `${m.id}'s limb under the front`);
    assert.ok(drawn[i][1], `${m.id}'s limb bends`);
    assert.equal(drawn[i][1], drawn[at(B.parts[m.id].body)][1], `${m.id}'s limb and part move as one`);
  }
  const q = recorder();
  drawBossLights(q.ctx, { boss: b }, look, 12.5, 1);
  const lights = transforms(q.calls).map(([img]) => img);
  assert.ok(lights.includes(B.hull.front.lights) && !lights.includes(B.hull.lights), 'lit by the front, not the composite');
  for (const m of B.limbs) assert.equal(lights.includes(m.lights), m.lights !== null, `${m.id}: ${m.lights ? 'its glints' : 'no lights'}`);
  assert.deepEqual(B.limbs.filter((m) => m.lights).map((m) => m.id), ['armsL', 'armsR'], 'only the upper arms carry lights');
});

test('he breathes: all of him, in both passes, is scaled about the chariot\'s seat by the breath of the moment; a boss without breath is not', () => {
  const t = 1 / (4 * LIFE_BREATH_HZ); // a full breath in
  const [sx, sy, py] = breathOf(art.life, t);
  assert.equal(py, CROWNS_SEAT);
  assert.ok(Math.abs(sy - 1 - CROWNS_BREATH) < 1e-12 && sx > 1, 'he swells');
  const b = stand();
  bossArt(look, 'crowns');
  for (const pass of [(c) => drawBoss(c, { boss: b }, look, t), (c) => drawBossLights(c, { boss: b }, look, t, 1)]) {
    const r = recorder();
    pass(r.ctx);
    assert.deepEqual(r.calls.slice(0, 4).map((c) => [...c]), [['save'], ['translate', b.x, b.y + CROWNS_SEAT], ['scale', sx, sy],
      ['translate', -b.x, -b.y - CROWNS_SEAT]], 'the breath is pushed before anything is drawn');
    assert.deepEqual([...r.calls.at(-1)], ['restore'], 'and taken off after');
  }
  const titan = { ...stand(), kind: 'titan', parts: bossDef('titan').parts.map((p) => ({ ...p, max: p.hp, x: 960 + p.dx, y: 370 + p.dy })) };
  const lk = lookFor(LEVELS.find((l) => l.boss === 'titan'));
  const r = recorder();
  drawBoss(r.ctx, { boss: titan }, lk, t);
  assert.deepEqual([...r.calls[0]].slice(0, 2), ['drawImage', bossArt(lk, 'titan').hull.body], 'a boss without breath starts on its hull');
});

test('posed off rest, every part\'s halo, lights and charge-up are drawn under the same transform as its body, in both passes', () => {
  const B = bossArt(look, 'crowns');
  const b = stand();
  b.warns = ['head', 'armsL', 'headL2'].map((part) => ({ part, left: 0.2, total: 0.7 }));
  const t = 7.7;
  const r = recorder();
  drawBoss(r.ctx, { boss: b }, look, t);
  const bodies = transforms(r.calls);
  const q = recorder();
  drawBossLights(q.ctx, { boss: b }, look, t, 1);
  const glows = [glow(look.palette.boss.weak), glow(look.palette.enemy), glow('#ffffff')];
  const count = { lights: 0, halo: 0, warn: 0 };
  for (const p of b.parts) {
    const set = B.parts[p.id];
    const [, own] = bodies.find(([img]) => img === set.body);
    assert.equal(Boolean(own), Boolean(lifeFor(art.life, p.id)), `${p.id} bends if it has life`);
    for (const drawn of [bodies, transforms(q.calls)]) {
      for (const [img, tr, args] of drawn) {
        const centred = glows.includes(img) && Math.hypot(args[0] + args[2] / 2 - p.x, args[1] + args[3] / 2 - p.y) < 1e-6;
        if (img !== set.lights && !centred) continue;
        assert.equal(tr, own, `${p.id}: its ${img === set.lights ? 'lights' : 'glow'} move with it`);
        count[img === set.lights ? 'lights' : img === glows[0] && p.weak ? 'halo' : 'warn']++;
      }
    }
  }
  assert.ok(count.lights >= 2 * b.parts.length && count.halo >= 2 * HEADS.length && count.warn >= 2 * 2 * b.warns.length, JSON.stringify(count));
});

test('the boss files keep the sprite rules', () => {
  fileRules(assert, ['life', 'crowns-life', 'crowns', 'crowns-hull', 'crowns-head', 'crowns-robe', 'crowns-kit', 'bake', 'parts', 'index']
    .map((n) => `bosses/${n}.js`));
});
