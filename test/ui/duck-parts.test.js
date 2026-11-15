import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { canvases, def, art, look, S, TOP, PAD, f, part, margin, lit, painter, paint } from './duck-kit.js';

// The Dowager Duck's still art (duck-hull.js with duck-foam.js, duck-face.js and duck-cap.js; the parts duck-bobble.js, duck-bill.js, duck-band.js,
// duck-belly.js, duck-foot.js and duck-squeak.js; duck-rage.js; glued by duck.js; the live half is duck-live.test.js, what she is drawn as
// duck-form.test.js): how the module is built (which parts are painted as a left twin and mirrored, the rage layers, the pose), that every piece paints
// a body and lights, where the art lies against her box and the HUD above it, that the whole boss bakes, and that no file reaches for chance or the clock.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');

const ids = def.parts.map((p) => p.id);

test('the armbands and the feet are painted once, as the left ones, and mirrored for the right; one rage layer per phase', () => {
  for (const base of ['band', 'foot']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['bobble', 'bill', 'belly', 'squeak']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.deepEqual(Object.keys(art.parts).sort(), ['band', 'belly', 'bill', 'bobble', 'foot', 'squeak']);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is bath time');
  assert.equal(typeof art.rage[1], 'function');
  assert.equal(typeof art.rage[2], 'function');
  for (const id of ids) assert.ok(Number.isFinite(art.margins[id]), `${id} has a margin of its own`);
  assert.equal(typeof art.live, 'function');
  assert.equal(typeof art.warm, 'function');
  assert.equal(typeof art.pose, 'function', 'she squashes when bonked');
  assert.equal(art.behind, undefined, 'the rubber is a baked hull');
});

test('the hull and every part paint a body and lights: the rubber\'s sheen on the lights, more on the body', () => {
  const [hb, hl] = [recorder(), recorder()];
  art.hull(hb.ctx, hl.ctx, S);
  assert.ok(lit(hb.calls) > 100 && lit(hl.calls) >= 4, `the hull: ${lit(hb.calls)} on the body, ${lit(hl.calls)} lights`);
  for (const p of def.parts) {
    const [b, l] = [recorder(), recorder()];
    painter(p.id)(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 2, `${p.id} has lights: ${lit(l.calls)}`);
    assert.ok(lit(b.calls) >= 5, `${p.id} has a body: ${lit(b.calls)}`);
  }
});

test('the rage layers add light, the last phase more than the first', () => {
  const count = (i) => {
    const l = recorder();
    art.rage[i](l.ctx, S);
    return lit(l.calls);
  };
  assert.ok(count(1) >= 20, `the hover phase adds light: ${count(1)}`);
  assert.ok(count(2) > count(1) * 1.5, `the orbit phase more: ${count(2)} against ${count(1)}`);
});

test('the whole boss bakes, damage states and all, a rage layer for the second and third phases, and every part is baked', () => {
  const B = warmBoss(look, 'duck');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
  for (const p of def.parts) assert.ok(B.parts[p.id].cracks[1] && B.parts[p.id].cracks[2] && B.parts[p.id].wreck, `${p.id} has its cracked and wrecked states`);
  for (const id of ['bobble', 'bandL', 'bandR']) assert.ok(B.parts[id].exposed, `${id} can be split open`);
  assert.ok(B.hull.flash, 'and the hull has its collapse flash');
});

test('nothing but the bobble rises above TOP, the HUD\'s edge at the top of her orbit, and each piece stays on its canvas', () => {
  const before = canvases.length;
  const [hull, hullLights] = [tracker(), tracker()];
  art.hull(hull.ctx, hullLights.ctx, S);
  for (const [name, b] of [['body', hull.bounds], ['lights', hullLights.bounds]]) {
    assert.ok(b.y0 >= TOP - 0.01, `the hull's ${name} top out at ${f(b.y0)}`);
    assert.ok(b.y1 <= S.H / 2 && -b.x0 <= PAD && b.x1 <= PAD, `the hull's ${name} lie on its canvas: ${f(b.x0)}..${f(b.x1)}, to ${f(b.y1)}`);
  }
  for (const c of canvases.slice(before)) assert.ok(!(c.T.bounds.y0 < TOP - 0.01), 'and so does every canvas the hull made');
  for (const p of def.parts) {
    const { b, l } = paint(p.id);
    const m = margin(p.id);
    for (const [what, t] of [['art', b], ['lights', l]]) {
      if (p.id === 'bobble') assert.ok(p.dy + t.y0 < TOP, 'the bobble may rise past it, into the HUD at the top of her orbit');
      else assert.ok(p.dy + t.y0 >= TOP, `${p.id}'s ${what} stop under TOP: ${f(p.dy + t.y0)}`);
      assert.ok(-t.x0 <= p.w / 2 + m && t.x1 <= p.w / 2 + m, `${p.id}'s ${what} are within the canvas side to side: ${f(t.x0)}..${f(t.x1)}`);
      assert.ok(-t.y0 <= p.h / 2 + m && t.y1 <= p.h / 2 + m, `${p.id}'s ${what} are within the canvas top to bottom: ${f(t.y0)}..${f(t.y1)}`);
    }
  }
  art.rage.forEach((paintRage, i) => {
    if (!paintRage) return;
    const l = tracker();
    paintRage(l.ctx, S);
    const b = l.bounds;
    assert.ok(b.y1 <= S.H / 2 && b.y0 >= TOP - 0.01 && -b.x0 <= S.W / 2 && b.x1 <= S.W / 2, `phase ${i}'s light ends on the hull's canvas, under TOP: ${f(b.x0)}..${f(b.x1)}, ${f(b.y0)}..${f(b.y1)}`);
  });
});

test('painting twice makes the same picture; every duck file starts with its comment, stays under 200 lines, uses no chance, clock or shadowBlur, and borrows nothing from world 19\'s aliens', () => {
  const once = (id) => {
    const [b, l] = [tracker(), tracker()];
    painter(id)(b.ctx, l.ctx, part(id), S);
    return [b.calls.length, l.calls.length, ...Object.values(b.bounds).map(f), ...Object.values(l.bounds).map(f)];
  };
  for (const id of ids) assert.deepEqual(once(id), once(id), id);
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^duck(-.*)?\.js$/.test(n));
  assert.ok(names.length >= 15, `${names.length} files`);
  for (const n of names) {
    const text = readFileSync(new URL(n, dir), 'utf8');
    const src = text.replace(/\/\/.*$/gm, '');
    assert.ok(!/Math\.random|Date\.now|performance\.now|shadowBlur/.test(src), `${n} uses chance, the clock or shadowBlur`);
    assert.ok(!/aliens\/w19/.test(src), `${n} imports from world 19's alien art`);
    assert.ok(text.startsWith('//'), `${n} starts with its comment`);
    assert.ok(text.split('\n').length < 200, `${n} is ${text.split('\n').length} lines`);
    assert.ok(!/cached\(\s*['"`]/.test(src) || /cached\(\s*['"`]duck/.test(src), `${n}: sprite keys are prefixed duck`);
  }
});
