import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { fileRules } from './aliens-bath-kit.js';

// The Ten-Crowned King's art (bosses/crowns.js with crowns-kit.js, crowns-hull.js, crowns-head.js, crowns-arms.js and crowns-breast.js):
// that it is a module of its own, that it draws every part of its definition (bosses-data-8.js), a fallen head as a stump and the heart
// laid bare, and each phase's rage under a stand-in canvas, every layer inside the canvas bake.js gives it, and the file rules. It joins
// BOSS_ART only in part 029, so it is painted from its own module on a stage built as bake.js's stageOf will build it, and baked with
// bakeWith to draw its parts the way the game does.
installCanvas(64);
const { BOSSES8 } = await import('../../src/core/bosses-data-8.js');
const { BOSS_ART, PART_MARGIN, painterFor, bakeWith } = await import('../../src/ui/bosses/bake.js');
const { partBodies, partLights } = await import('../../src/ui/bosses/parts.js');
const { drawDying } = await import('../../src/ui/bosses/death.js');
const { CHAIN } = await import('../../src/core/boss-phase.js');
const { default: art } = await import('../../src/ui/bosses/crowns.js');
const { default: w21look } = await import('../../src/ui/looks/w21.js');

const look = { world: 21, ...w21look };
const def = BOSSES8.find((d) => d.kind === 'crowns');
const pad = art.pad;
const S = { def, pal: look.palette.boss, look, W: def.size.w + pad * 2, H: def.size.h + (art.padY ?? pad) * 2, pad };
const HEADS = def.parts.filter((p) => p.regrow).map((p) => p.id);
const PART = (id) => def.parts.find((p) => p.id === id);
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
const margin = (id) => art.margins?.[id] ?? art.margin ?? PART_MARGIN;
const box = (d) => [d.x0, d.y0, d.x1, d.y1].map(Math.round);
const inside = (d, hw, hh) => d.x0 >= -hw && d.x1 <= hw && d.y0 >= -hh && d.y1 <= hh;

function paintWith(mod, p, make = recorder) {
  const [b, l] = [make(), make()];
  const [paint, flip] = painterFor(mod, p.id);
  b.ctx.scale(flip, 1);
  l.ctx.scale(flip, 1);
  paint(b.ctx, l.ctx, p, S);
  return { b, l };
}

test('the king has boss art of its own, a painter for every part, a stump for every head and a rage layer for every phase', () => {
  for (const [kind, mod] of Object.entries(BOSS_ART).filter(([k]) => k !== 'crowns')) {
    assert.notEqual(art, mod, kind);
    assert.notEqual(art.hull, mod.hull, `the hull is not the ${kind}'s`);
    for (const fn of Object.values(art.parts)) assert.ok(!Object.values(mod.parts).includes(fn), `a part is not the ${kind}'s`);
  }
  for (const p of def.parts) assert.ok(painterFor(art, p.id), `${p.id} has a painter`);
  assert.ok(HEADS.length > 0);
  assert.deepEqual(HEADS, def.parts.filter((p) => p.weak).map((p) => p.id), 'every head grows back');
  for (const id of HEADS) assert.ok(painterFor({ parts: art.fallen }, id), `${id} has a stump`);
  for (const id of def.phases.flatMap((ph) => ph.open ?? [])) assert.equal(typeof art.opened[id], 'function', `${id} has art laid bare`);
  assert.equal(art.rage.length, def.phases.length);
  assert.equal(art.rage[0], null, 'the court of war is calm');
});

test('the hull and every part draw a body and lights, each layer inside its canvas, each part over its own box', () => {
  const [hb, hl] = [tracker(), tracker()];
  art.hull(hb.ctx, hl.ctx, S);
  for (const [name, T] of [['body', hb], ['lights', hl]]) assert.ok(inside(T.bounds, S.W / 2, S.H / 2), `the hull's ${name}: ${box(T.bounds)}`);
  const [rb, rl] = [recorder(), recorder()];
  art.hull(rb.ctx, rl.ctx, S);
  assert.ok(lit(rb.calls) > 100 && lit(rl.calls) >= 8, `the hull: ${lit(rb.calls)} body, ${lit(rl.calls)} lights`);
  const looks = [...def.parts.map((p) => [art, p, 'whole']), ...HEADS.map((id) => [{ parts: art.fallen }, def.parts.find((p) => p.id === id), 'fallen']),
    ...Object.keys(art.opened).map((id) => [{ parts: art.opened }, def.parts.find((p) => p.id === id), 'bare'])];
  for (const [mod, p, state] of looks) {
    const { b, l } = paintWith(mod, p);
    assert.ok(lit(b.calls) >= 10 && lit(l.calls) >= 2, `${p.id} ${state}: ${lit(b.calls)} body, ${lit(l.calls)} lights`);
    const t = paintWith(mod, p, tracker);
    const m = margin(p.id);
    for (const name of ['b', 'l']) assert.ok(inside(t[name].bounds, p.w / 2 + m, p.h / 2 + m), `${p.id} ${state} ${name} stays in its canvas: ${box(t[name].bounds)}`);
    const d = t.b.bounds;
    if (state !== 'fallen') assert.ok(d.x1 - d.x0 >= p.w * 0.8 && d.y1 - d.y0 >= p.h * 0.8, `${p.id} ${state} covers its box: ${box(d)}`);
  }
});

test('a head that falls is drawn as its stump where the definition puts it, and whole again once it grows back', () => {
  const B = bakeWith(art, S);
  const boss = { x: 0, y: 0, parts: def.parts.map((p) => ({ ...p, max: p.hp, x: p.dx, y: p.dy, open: false, cracked: false })) };
  let t = 0; // each look a second later, so no hit is still flashing
  const drawn = () => {
    const r = recorder();
    partBodies(r.ctx, boss, B, look, (t += 10));
    return r.calls.filter(([k]) => k === 'drawImage');
  };
  const expect = (want) => drawn().forEach(([, img, x, y], i) => {
    const p = boss.parts[i];
    const set = B.parts[p.id];
    assert.ok(img === want(p, set), `${p.id} is drawn in its state (${Object.entries(set).find(([, v]) => v === img || v?.body === img)?.[0]})`);
    assert.deepEqual([x, y], [p.dx - set.w / 2 - set.m, p.dy - set.h / 2 - set.m], `${p.id} is drawn where it is`);
  });
  expect((p, set) => set.body);
  const down = boss.parts.find((p) => p.id === HEADS[3]);
  down.hp = 0;
  expect((p, set) => (p === down ? set.down.body : set.body));
  down.hp = down.max;
  expect((p, set) => set.body);
  for (const p of boss.parts) if (p.regrow) p.hp = 0;
  boss.parts.find((p) => p.armor && p.dx === 0).cracked = true; // no head left: the breastplate splits
  for (const id of def.phases.at(-1).open) boss.parts.find((p) => p.id === id).open = true;
  drawn(); // the heart slides open
  expect((p, set) => (p.regrow ? set.down.body : p.cracked ? set.exposed.body : p.open ? set.open.body : set.body));
});

// The King as the game holds him, every part at full hp at its place in boss coordinates, and his baked canvases.
const stand = () => ({ kind: 'crowns', x: 0, y: 0, dying: 0, parts: def.parts.map((p) => ({ ...p, max: p.hp, x: p.dx, y: p.dy, open: false, cracked: false })) });

test("a fallen head's lights are its own stump's, not the embers of a wreck; a standing part's are its own", () => {
  const B = bakeWith(art, S);
  const boss = stand();
  const down = boss.parts.find((p) => p.id === HEADS[2]);
  down.hp = 0;
  const r = recorder();
  partLights(r.ctx, boss, B, look, 1, 1);
  const drawn = r.calls.filter(([k]) => k === 'drawImage').map(([, img]) => img);
  assert.deepEqual(drawn, boss.parts.map((p) => (p === down ? B.parts[p.id].down.lights : B.parts[p.id].lights)));
});

test('as he dies, a fallen head stays its stump at both ends of the break, and a head still standing chars like any part', () => {
  const B = bakeWith(art, S);
  const boss = stand();
  boss.dying = CHAIN; // the first instant of the collapse: every part still rides its half, the centre line's on the seam
  const fallen = [HEADS.find((id) => PART(id).dx !== 0), HEADS.find((id) => PART(id).dx === 0)];
  for (const id of fallen) boss.parts.find((p) => p.id === id).hp = 0;
  const r = recorder();
  drawDying(r.ctx, boss, B, 0);
  const drawn = new Set(r.calls.filter(([k]) => k === 'drawImage').map(([, img]) => img));
  for (const id of HEADS) assert.equal(drawn.has(B.parts[id].down.body), fallen.includes(id), `${id} is drawn as a stump only if it fell`);
  for (const id of HEADS.filter((h) => !fallen.includes(h))) assert.ok(drawn.has(B.parts[id].wreck), `${id} chars`);
});

test('each phase after the first adds its own rage, inside the hull canvas, the last glaring more', () => {
  const rages = art.rage.slice(1).map((paint, i) => {
    const t = tracker();
    paint(t.ctx, S);
    assert.ok(inside(t.bounds, S.W / 2, S.H / 2), `phase ${i + 1}'s rage: ${box(t.bounds)}`);
    const r = recorder();
    paint(r.ctx, S);
    assert.ok(lit(r.calls) >= 10, `phase ${i + 1}: the rage adds light (${lit(r.calls)})`);
    return lit(r.calls);
  });
  assert.ok(rages[1] > rages[0], `the last phase glares more: ${rages}`);
});

test('the boss files keep the sprite rules', () => {
  fileRules(assert, ['crowns', 'crowns-kit', 'crowns-hull', 'crowns-robe', 'crowns-head', 'crowns-arms', 'crowns-breast', 'bake', 'parts', 'cracks', 'death']
    .map((n) => `bosses/${n}.js`));
});
