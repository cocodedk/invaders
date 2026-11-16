import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, LOOKS, ROLES, made, recorder, tracker, fileRules } from './aliens-bath-kit.js';

// What world 19 (Rubber Regatta) draws on the player's side: corks for shots (shots-bath.js), a wooden toy seaplane for the ship (ship-bath.js),
// a ring of suds round the pickup (pickup-bath.js), and where a whole frame puts the knocked-out toys (bodies-view.js through view.js).
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { CORK_W, CORK_H, HEAD, warmCorks } = await import('../../src/ui/shots-bath.js');
const { PLANE, planeSprite } = await import('../../src/ui/ship-bath.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { INK, glow } = await import('../../src/ui/sprites.js');

const isCork = (img) => img.width === CORK_W && img.height === CORK_H;
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const shot = (x, extra = {}) => ({ x, y: 500, vx: 0, vy: -1400, r: 4, ...extra });

test("world 19's shots are corks, one sprite a plain shot and no streak; the side shots, tridents and mirror bolts keep their own", () => {
  const T = tracker();
  drawShots(T.ctx, { shots: [shot(300), shot(400), shot(500, { vx: 400 })] }, look, 1);
  assert.equal(T.calls.length, 3, 'one blit a shot');
  assert.ok(T.calls.every((c) => isCork(c.img) && c.comp === 'source-over'), 'every one a cork, drawn over the tile');
  const r = recorder();
  drawShots(r.ctx, { shots: [shot(300)] }, look, 1);
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, 0, 'no streak');
  const others = tracker();
  drawShots(others.ctx, { shots: [shot(300, { broadside: 1, vx: 1400, vy: 0 }), shot(400, { trident: true }), shot(500, { mirror: true })] }, look, 1);
  assert.ok(!others.calls.some((c) => isCork(c.img)), 'not a cork among them');
});

test('a cork lies inside its sprite with a dark outline, its narrow end at the shot, and turns along a slanted flight', () => {
  warmCorks();
  const corks = made.filter(isCork);
  assert.equal(corks.length, 2, 'two speckle patterns, each baked once');
  for (const c of corks) {
    const b = c.T.bounds;
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= CORK_W && b.y1 <= CORK_H, `inside: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
    assert.ok(c.strokes.some(([style, w]) => style === INK && w >= 1.5), 'a dark outline');
  }
  const up = tracker();
  drawShots(up.ctx, { shots: [shot(300)] }, look, 1);
  const [x0, y0, x1, y1] = up.calls[0].box;
  assert.ok(x0 < 300 && x1 > 300 && Math.abs(y0 - (500 - HEAD)) < 1e-9 && y1 > 500 + HEAD, 'its tip just ahead of the shot, its rush behind');
  const r = recorder();
  drawShots(r.ctx, { shots: [shot(300, { vx: 500, vy: -1300 })] }, look, 1);
  const turn = r.calls.find(([k]) => k === 'rotate');
  assert.ok(turn && Math.abs(turn[1] - (Math.atan2(-1300, 500) + Math.PI / 2)) < 1e-9, 'turned to its heading');
});

test("world 19's ship is the toy seaplane: one baked sprite, a turning propeller, no engine flames, and it blinks with the ship", () => {
  const T = tracker();
  drawShip(T.ctx, { ship: ship({ vy: -700 }) }, look, 1);
  const plane = T.calls.filter((c) => c.img === planeSprite(look.palette.accent));
  assert.equal(plane.length, 1, 'the plane, once');
  assert.ok(Math.abs((plane[0].box[0] + plane[0].box[2]) / 2 - 700) < 1 && Math.abs((plane[0].box[1] + plane[0].box[3]) / 2 - 820) < 1, 'on the ship');
  assert.ok(!T.calls.some((c) => c.img === glow('#ffffff')), 'no flames, even climbing');
  const prop = (t) => {
    const r = recorder();
    drawShip(r.ctx, { ship: ship() }, look, t);
    return r.calls.find(([k]) => k === 'fillRect')[3];
  };
  assert.notEqual(prop(1), prop(1.01), 'the propeller turns');
  const blink = tracker();
  drawShip(blink.ctx, { ship: ship({ invuln: 1 }) }, look, 0);
  assert.ok(blink.calls.every((c) => c.alpha <= 0.3 + 1e-9), 'every sprite dims while it blinks');
  const sprite = planeSprite(look.palette.accent);
  assert.ok(made.includes(sprite), 'baked here, so it can be read back');
  const b = sprite.T.bounds;
  assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= PLANE && b.y1 <= PLANE, `the plane inside its sprite: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(sprite.fills.includes(look.palette.accent), 'the red of the nose on its tips');
});

test('the pickup rim is a ring of suds: its own frame, inside the 60 px sprite for every colour a power wears', () => {
  assert.equal(typeof FRAMES[19], 'function');
  for (const n of [18, 17, 16, 15, 14, 13]) assert.ok(FRAMES[19] !== FRAMES[n], `not world ${n}'s`);
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[19](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside the sprite`);
    assert.ok(b.x1 - b.x0 > 50 && b.y1 - b.y0 > 50, 'and fills it');
  }
  const r = recorder();
  FRAMES[19](r.ctx, look.power.laser);
  assert.ok(r.calls.filter(([k]) => k === 'arc').length >= 14 * 3, 'fourteen bubbles, each with its rim and glint');
});

test('in a whole frame of w19-1 a dizzy body is drawn under every alien and a flying one over the shots', async () => {
  const { createView, drawFrame } = await import('../../src/ui/view.js');
  const { createWorld, stepWorld } = await import('../../src/core/world.js');
  const { levelById } = await import('../../src/core/levels.js');
  const { createFx } = await import('../../src/fx/fx.js');
  const { IDLE, TICK } = await import('../core/world-kit.js');
  const { roleSprites } = await import('../../src/ui/aliens/bake.js');
  const { bodySprites } = await import('../../src/ui/bodies-view.js');
  const { BODY_R } = await import('../../src/core/tumble.js');
  const T = tracker();
  const canvas = { width: 1920, height: 1080, clientWidth: 1920, clientHeight: 1080, getContext: () => T.ctx };
  const level = levelById('w19-1');
  const v = createView(canvas, level);
  const w = createWorld(level);
  w.ship.invuln = Infinity;
  for (let i = 0; i < 60 * 4; i++) stepWorld(w, TICK, IDLE);
  w.events.length = 0;
  assert.ok(w.aliens.length > 0, 'the wave is in');
  const base = { r: BODY_R, link: 0, banks: 0, bonks: 0, daze: 0, t: 0.3 };
  w.twist.bodies.push({ ...base, id: 900, role: 'grunt', x: 700, y: 500, vx: 0, vy: 60, fly: false }, { ...base, id: 901, role: 'diver', x: 900, y: 450, vx: 800, vy: -300, fly: true });
  w.shots.push(shot(960, { y: 600 }));
  drawFrame(v, w, createFx(), 4);
  const imgs = T.calls.map((c) => c.img);
  const S = bodySprites(look);
  const dizzyAt = imgs.findIndex((i) => S.dizzy.grunt.bright.includes(i) || S.dizzy.grunt.dim.includes(i));
  const aliens = new Set(ROLES.flatMap((r) => [...roleSprites(look, r).body, ...roleSprites(look, r).flash]));
  const alienAt = imgs.findIndex((i) => aliens.has(i));
  const corkAt = imgs.findIndex(isCork);
  const flyAt = imgs.indexOf(S.flying.diver);
  assert.ok(dizzyAt >= 0 && alienAt >= 0 && corkAt >= 0 && flyAt >= 0, `all drawn: ${[dizzyAt, alienAt, corkAt, flyAt]}`);
  assert.ok(dizzyAt < alienAt, 'the dizzy body under the aliens');
  assert.ok(corkAt < flyAt, 'the flying body over the shots');
});

test('the player-side files keep the sprite rules', () => {
  fileRules(assert, ['ship-bath.js', 'shots-bath.js', 'pickup-bath.js', 'pickup-skins.js', 'lasers-view.js', 'ship-view.js']);
});
