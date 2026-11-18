import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { fileRules } from './aliens-bath-kit.js';

// The Night Editor's art (bosses/editor.js with editor-kit.js, editor-hull.js, editor-face.js and editor-limbs.js): that it is a module of
// its own, that it draws every part of its definition (bosses-data-7.js) and each phase's rage under a stand-in canvas, every layer inside
// the canvas bake.js gives it, and the file rules. It joins BOSS_ART only in part 7, so it is painted from its own module on a stage built
// as bake.js's stageOf will build it.
installCanvas(64);
const { BOSSES7 } = await import('../../src/core/bosses-data-7.js');
const { BOSS_ART, PART_MARGIN, painterFor } = await import('../../src/ui/bosses/bake.js');
const { default: art } = await import('../../src/ui/bosses/editor.js');
const { default: w20look } = await import('../../src/ui/looks/w20.js');

const look = { world: 20, ...w20look };
const def = BOSSES7.find((d) => d.kind === 'editor');
const pad = art.pad;
const S = { def, pal: look.palette.boss, look, W: def.size.w + pad * 2, H: def.size.h + (art.padY ?? pad) * 2, pad };
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
const margin = (id) => art.margins?.[id] ?? art.margin ?? PART_MARGIN;
const box = (d) => [d.x0, d.y0, d.x1, d.y1].map(Math.round);
const inside = (d, hw, hh) => d.x0 >= -hw && d.x1 <= hw && d.y0 >= -hh && d.y1 <= hh;

function paintPart(p, make = recorder) {
  const [b, l] = [make(), make()];
  const [paint, flip] = painterFor(art, p.id);
  b.ctx.scale(flip, 1);
  l.ctx.scale(flip, 1);
  paint(b.ctx, l.ctx, p, S);
  return { b, l };
}

test('the editor has boss art of its own, a painter for every part and a rage layer for every phase', () => {
  for (const [kind, mod] of Object.entries(BOSS_ART)) {
    assert.notEqual(art, mod, kind);
    assert.notEqual(art.hull, mod.hull, `the hull is not the ${kind}'s`);
    for (const fn of Object.values(art.parts)) assert.ok(!Object.values(mod.parts).includes(fn), `a part is not the ${kind}'s`);
  }
  for (const p of def.parts) assert.ok(painterFor(art, p.id), `${p.id} has a painter`);
  assert.equal(art.rage.length, def.phases.length);
  assert.equal(art.rage[0], null, 'proofreading is calm');
  assert.equal(art.opened, undefined, 'no phase opens a part: bake.js paints each part once, for every phase');
});

test('the hull and every part draw a body and lights, each layer inside its canvas, each part over its own box', () => {
  const [hb, hl] = [tracker(), tracker()];
  art.hull(hb.ctx, hl.ctx, S);
  for (const [name, T] of [['body', hb], ['lights', hl]]) assert.ok(inside(T.bounds, S.W / 2, S.H / 2), `the hull's ${name}: ${box(T.bounds)}`);
  const [rb, rl] = [recorder(), recorder()];
  art.hull(rb.ctx, rl.ctx, S);
  assert.ok(lit(rb.calls) > 100 && lit(rl.calls) >= 8, `the hull: ${lit(rb.calls)} body, ${lit(rl.calls)} lights`);
  for (const p of def.parts) {
    const { b, l } = paintPart(p);
    assert.ok(lit(b.calls) >= 10 && lit(l.calls) >= 2, `${p.id}: ${lit(b.calls)} body, ${lit(l.calls)} lights`);
    const t = paintPart(p, tracker);
    const m = margin(p.id);
    for (const name of ['b', 'l']) assert.ok(inside(t[name].bounds, p.w / 2 + m, p.h / 2 + m), `${p.id} ${name} stays in its canvas: ${box(t[name].bounds)}`);
    const d = t.b.bounds;
    assert.ok(d.x1 - d.x0 >= p.w * 0.8 && d.y1 - d.y0 >= p.h * 0.8, `${p.id} covers its box: ${box(d)}`);
  }
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
  fileRules(assert, ['editor', 'editor-kit', 'editor-hull', 'editor-face', 'editor-limbs'].map((n) => `bosses/${n}.js`));
});
