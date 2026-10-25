import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// Ember Carnival's fireworks as the screen draws them: a shell's lit fuse and the glow through its body
// (shell-view.js), and the flower of sparks a burst opens (burst-view.js, drawn by fx-view.js).
installCanvas(64);
let made = 0;
const create = document.createElement;
document.createElement = (...a) => (made++, create(...a));
const { BURST_R } = await import('../../src/core/damage.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { HUES } = await import('../../src/fx/react-carnival.js');
const { createFx } = await import('../../src/fx/fx.js');
const { addRing } = await import('../../src/fx/fx.js');
const { paintBloom, drawBloom, warmBurst, CX, CY, OPEN, DROOP, SAG } = await import('../../src/ui/burst-view.js');
const { drawShells, paintFuse, warmShells, anchor, FUSE, PLUG, TIP } = await import('../../src/ui/shell-view.js');
const { drawAliens } = await import('../../src/ui/aliens/index.js');
const { drawFx } = await import('../../src/ui/fx-view.js');
const { ROLE_LIST } = await import('../../src/ui/aliens/bake.js');

const look = LOOKS[13];
const images = (calls) => calls.filter(([k]) => k === 'drawImage');
const state = (ctx) => [ctx.globalCompositeOperation, ctx.globalAlpha];

function ring(over = {}) {
  const fx = createFx();
  addRing(fx, { x: 800, y: 400, r0: 10, maxR: BURST_R, kind: 'bloom', color: HUES[1][0], life: 0.85, ...over });
  return fx.rings[0];
}


test('warmBurst bakes both flowers of all six colours; drawing any of them then bakes nothing', () => {
  const before = made;
  warmBurst();
  assert.ok(made - before >= 12, `${made - before} canvases`);
  const warmed = made;
  for (const [c] of HUES) drawBloom(recorder().ctx, Object.assign(ring({ color: c }), { r: 100, life: 0.4 }));
  assert.equal(made, warmed);
});


test('warmShells bakes the fuse and the glow of every role on both beats, and a long fight then bakes nothing big', () => {
  const before = made;
  warmShells(look);
  assert.ok(made - before >= 11, `${made - before} canvases`);
  const warmed = made;
  const aliens = ROLE_LIST.map((r, i) => alien(i, r));
  for (let t = 0; t < 20; t += 0.7) drawShells(recorder().ctx, aliens, look, t, place);
  assert.equal(made, warmed);
});

test('the flower fits its sprite, open and drooped, with the tips reaching the burst\'s radius, and the drooped one hangs lower', () => {
  const open = tracker();
  paintBloom(open.ctx, '#ff3fa0', '#ffd0ea', 0);
  const drooped = tracker();
  paintBloom(drooped.ctx, '#ff3fa0', '#ffd0ea', 1);
  for (const [name, b, size] of [['open', open.bounds, OPEN], ['drooped', drooped.bounds, DROOP]]) {
    assert.ok(-b.x0 <= CX && b.x1 <= size.w - CX && -b.y0 <= CY && b.y1 <= size.h - CY, `${name}: x ${b.x0.toFixed(0)}..${b.x1.toFixed(0)}, y ${b.y0.toFixed(0)}..${b.y1.toFixed(0)} inside ${size.w}x${size.h} about (${CX}, ${CY})`);
    assert.ok(Math.min(-b.x0, b.x1) >= BURST_R * 0.8, `${name}: the tips reach ${BURST_R * 0.8} px to either side at least`);
  }
  assert.ok(-open.bounds.y0 >= BURST_R * 0.8 && open.bounds.y1 >= BURST_R * 0.8, 'and the open flower as far up and down');
  assert.ok(drooped.bounds.y1 - open.bounds.y1 >= SAG * 0.7, 'the drooped rays hang');
  assert.ok(Math.abs(CX - BURST_R) < 20, 'the sprite is no bigger than the burst needs');
});

test('the flower paints additive light only, leaves the context as it found it, and has a ray for every direction', () => {
  const { ctx, calls } = recorder();
  paintBloom(ctx, '#4be08a', '#d2ffe4', 0);
  assert.equal(calls[0][0], 'save', 'the round caps and the additive mode are set inside a save...');
  assert.equal(calls.at(-1)[0], 'restore', '...and given back by its restore');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length);
  assert.ok(calls.filter(([k]) => k === 'stroke').length >= 100, 'long and short rays, a soft stroke and a hot one each');
  assert.ok(images(calls).length >= 52, 'a bright head on every ray');
});

test('the flower grows with the ring, shows the drooped flower once it is open, fades out, and leaves the context normal', () => {
  const draw = (r) => {
    const { ctx, calls } = recorder();
    drawBloom(ctx, r);
    return { calls: images(calls), ctx };
  };
  const young = Object.assign(ring(), { r: 40, life: 0.8 });
  const open = Object.assign(ring(), { r: BURST_R, life: 0.5 });
  const old = Object.assign(ring(), { r: BURST_R, life: 0.2 });
  const [a, b, c] = [young, open, old].map(draw);
  assert.equal(a.calls.length, 1, 'only the open flower at first');
  assert.equal(b.calls.length, 2, 'the drooped one comes in over it');
  assert.ok(a.calls[0][4] < b.calls[0][4], 'it grows: 40/160 against the whole');
  assert.equal(b.calls[0][4], OPEN.w, 'at full size it is drawn 1:1');
  assert.equal(b.calls[0][2] + CX, 800, 'about the burst\'s centre');
  assert.ok(c.calls[1].alpha > c.calls[0].alpha, 'by the end the drooped one carries it');
  assert.ok(c.calls.every((x) => x.alpha < b.calls[0].alpha), 'and all of it fades');
  for (const x of [a, b, c]) assert.deepEqual(state(x.ctx), ['source-over', 1]);
});

test('drawFx draws a bloom ring from its sprite, not as a stroked ring, and still strokes the others', () => {
  const run = (kind) => {
    const fx = createFx();
    addRing(fx, { x: 500, y: 500, maxR: 160, kind, color: '#ff3fa0', life: 0.5 });
    const { ctx, calls } = recorder();
    drawFx(ctx, fx);
    return calls;
  };
  assert.equal(run('bloom').filter(([k]) => k === 'arc').length, 0);
  assert.ok(images(run('bloom')).length >= 1);
  assert.ok(run('ring').filter(([k]) => k === 'arc').length >= 1);
});

test('the fuse fits its sprite, and its tip is where the sparks are drawn from', () => {
  const { ctx, bounds } = tracker();
  paintFuse(ctx);
  assert.ok(bounds.x0 >= 0 && bounds.y0 >= 0 && bounds.x1 <= FUSE.w && bounds.y1 <= FUSE.h, `${bounds.x0}..${bounds.x1} x ${bounds.y0}..${bounds.y1} in ${FUSE.w}x${FUSE.h}`);
  assert.deepEqual([PLUG.x + TIP.x, PLUG.y + TIP.y], [22, 9], 'the cord ends at the charred tip');
  assert.ok(bounds.y0 <= PLUG.y + TIP.y, 'with the cord reaching up to it');
});

const spot = { x: 0, y: 0, rot: 0, f: 0 };
const place = (a) => Object.assign(spot, { x: a.x, y: a.y, rot: a.rot ?? 0, f: a.id & 1 });
const alien = (id, role, shell = true, extra = {}) => ({ id, role, x: 300 + id * 120, y: 400, hp: 1, maxHp: 1, ...(shell ? { shell: true } : {}), ...extra });

test('every role has a spot for its fuse, from its art or a default', () => {
  for (const role of ROLE_LIST) {
    const [x, y] = anchor(look, role);
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && y < 0 && y > -48, `${role}: ${x}, ${y}`);
  }
});

test('a shell wears a fuse and a glow on top of its sprite; a plain alien wears nothing; the context is left normal', () => {
  const draw = (aliens, t = 2) => {
    const { ctx, calls } = recorder();
    drawShells(ctx, aliens, look, t, place);
    return { ctx, calls };
  };
  assert.equal(draw([alien(1, 'grunt', false)]).calls.length, 0, 'no shell, nothing drawn');
  const one = draw([alien(1, 'grunt')]);
  const fuses = images(one.calls).filter((c) => c[4] === FUSE.w && c[5] === FUSE.h);
  assert.equal(fuses.length, 1);
  assert.ok((fuses[0].alpha ?? 1) === 1, 'the fuse is opaque');
  const lit = images(one.calls).filter((c) => c !== fuses[0]);
  assert.ok(lit.length >= 6, `${lit.length} additive images: the burn inside, the fizz, its star and three sparks`);
  assert.equal(lit.filter((c) => c[4] === 10).length, 3, 'three sparks off the tip');
  assert.deepEqual(state(one.ctx), ['source-over', 1]);
  for (const role of ROLE_LIST) assert.ok(images(draw([alien(2, role)]).calls).length >= 7, `${role} burns`);
  const five = draw(ROLE_LIST.map((r, i) => alien(i, r)));
  assert.equal(images(five.calls).filter((c) => c[4] === FUSE.w).length, 5);
  assert.equal(draw([alien(1, 'grunt'), alien(2, 'diver', false), alien(3, 'gunner')]).calls.length, draw([alien(1, 'grunt'), alien(3, 'gunner')]).calls.length, 'a plain alien in the list changes nothing');
});

test('the fuse fizzes and the burn breathes from moment to moment, and the same moment draws the same', () => {
  const sig = (t) => {
    const { ctx, calls } = recorder();
    drawShells(ctx, [alien(1, 'gunner')], look, t, place);
    return images(calls).map((c) => [c[2].toFixed(1), c[4], (c.alpha ?? 1).toFixed(2)].join()).join(';');
  };
  assert.notEqual(sig(2), sig(2.2));
  assert.equal(sig(2), sig(2));
});

test('a shell that leans into a swoop carries its fuse with it, and the glow turns with the body', () => {
  const { ctx, calls } = recorder();
  drawShells(ctx, [alien(1, 'grunt', true, { rot: 0.4 })], look, 1, place);
  assert.equal(calls.filter(([k, a]) => k === 'rotate' && a === 0.4).length, 2, 'the fuse and the glow each turn by the lean');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length);
});

test('drawAliens puts the fuses on the shells of a fireworks level, and only there', () => {
  const world = (twist) => ({ level: { twist }, aliens: [alien(1, 'grunt'), alien(2, 'diver')], wrecks: [], saucer: null, ship: { x: 900 } });
  const fuses = (twist) => {
    const { ctx, calls } = recorder();
    drawAliens(ctx, world(twist), look, 1);
    return images(calls).filter((c) => c[4] === FUSE.w && c[5] === FUSE.h).length;
  };
  assert.equal(fuses('fireworks'), 2);
  assert.equal(fuses('broadside'), 0);
  assert.equal(fuses(undefined), 0);
});

