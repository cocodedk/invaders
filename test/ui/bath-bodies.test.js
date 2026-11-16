import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, LOOKS, ROLES, made, tracker, fileRules } from './aliens-bath-kit.js';

// World 19's knocked-out toys on the field (bodies-view.js, from world.twist.bodies of the bonk rule): a dizzy body with its halo and stars,
// a batted one rimmed and streaked; what warm-bath.js bakes up front; and where a frame draws them. The drawings are aliens-bath.test.js.
const { drawBodies, bodySprites, RAM_REACH, STARS, STAR_COUNT, SPIN, FLY_X, FLY_W, FLY_H } = await import('../../src/ui/bodies-view.js');
const { warmBath } = await import('../../src/ui/warm-bath.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { PLANE, planeSprite } = await import('../../src/ui/ship-bath.js');
const { CORK_W, CORK_H } = await import('../../src/ui/shots-bath.js');
const { glow, star } = await import('../../src/ui/sprites.js');
const { BODY_MAX, BODY_R } = await import('../../src/core/tumble.js');
const { WHACK_R } = await import('../../src/core/bonk.js');
const { ALIEN_R } = await import('../../src/core/kinds.js');
const { SHIP_R } = await import('../../src/core/ship.js');

const body = (id, x, y, extra = {}) => ({ id, role: ROLES[id % 5], x, y, vx: 0, vy: 60, r: BODY_R, fly: false, link: 0, banks: 0, bonks: 0, daze: 0, t: 0.05 + id * 0.13, ...extra });
const field = (bodies, extra = {}) => ({ twist: { bodies }, aliens: [], boss: null, ...extra });
const blits = (world, flying, l = look, t = 1) => {
  const T = tracker();
  drawBodies(T.ctx, world, l, t, flying);
  return T.calls;
};
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const crowd = () => Array.from({ length: BODY_MAX }, (_, i) => body(i, 100 + (i % 15) * 120, 200 + Math.floor(i / 15) * 150, i % 3 ? {} : { fly: true, vx: 700, vy: -400 }));

test('warming bakes every body sprite, the plane and the corks, and drawing then bakes nothing; no other world warms anything', () => {
  const before = made.length;
  warmBath(LOOKS[17]);
  assert.equal(made.length, before, 'nothing for world 18');
  warmBath(look);
  const baked = made.slice(before);
  const S = bodySprites(look);
  for (const role of ROLES) {
    assert.equal(S.dizzy[role].bright.length, STARS, `${role}: a bright halo at every turn of the stars`);
    assert.equal(S.dizzy[role].dim.length, STARS, `${role}: and a dim one`);
    for (const c of [...S.dizzy[role].bright, ...S.dizzy[role].dim, S.flying[role]]) assert.ok(baked.includes(c), `${role}: baked by the warming`);
  }
  assert.ok(baked.includes(planeSprite(look.palette.accent)), 'the toy plane');
  assert.equal(baked.filter((c) => c.width === CORK_W && c.height === CORK_H).length, 2, 'two corks');
  glow(look.palette.accent); // the ship's stock glow and wing-tip star, baked by the first ship of any world with this accent
  star(look.palette.accent);
  drawShots(tracker().ctx, { shots: [{ x: 1, y: 1, vx: 0, vy: -1 }] }, LOOKS[0], 0); // and the side shots' ball, by the first shot of any world
  const warmed = made.length;
  for (let k = 0; k < 10; k++) {
    for (const flying of [false, true]) drawBodies(tracker().ctx, field(crowd()), look, k / 7, flying);
    drawShots(tracker().ctx, { shots: [{ x: 400, y: 500, vx: 0, vy: -1400 }, { x: 600, y: 500, vx: 300, vy: -1300 }] }, look, k / 7);
    drawShip(tracker().ctx, { ship: ship({ vx: 300 }) }, look, k / 7);
  }
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});

test('BODY_MAX bodies cost one blit each, all of baked sprites, and bake nothing', () => {
  warmBath(look);
  const before = made.length;
  const S = bodySprites(look);
  const sprites = new Set(ROLES.flatMap((r) => [...S.dizzy[r].bright, ...S.dizzy[r].dim, S.flying[r]]));
  const list = crowd();
  const calls = [...blits(field(list), false), ...blits(field(list), true)];
  assert.equal(calls.length, BODY_MAX);
  assert.ok(calls.every((c) => sprites.has(c.img)), 'every blit a baked body');
  assert.equal(made.length, before);
});

test('the halo is dim while a live alien or a live boss part is in ram reach of the body, bright otherwise', () => {
  assert.equal(RAM_REACH, WHACK_R + ALIEN_R + SHIP_R);
  const S = bodySprites(look).dizzy.grunt;
  const b = body(0, 800, 600);
  const halo = (extra) => {
    const [c] = blits(field([b], extra), false);
    return S.bright.includes(c.img) ? 'bright' : S.dim.includes(c.img) ? 'dim' : 'neither';
  };
  const alien = (dx, hp = 1) => ({ aliens: [{ id: 7, role: 'grunt', x: 800 + dx, y: 600, hp }] });
  assert.equal(halo({}), 'bright', 'nothing near');
  assert.equal(halo(alien(RAM_REACH - 1)), 'dim', 'an alien just in reach');
  assert.equal(halo(alien(RAM_REACH + 1)), 'bright', 'one just out of reach');
  assert.equal(halo(alien(10, 0)), 'bright', 'a dead one is no trap');
  const boss = (gap, hp = 10, enter = 0) => ({ boss: { enter, dying: null, parts: [{ id: 'bill', x: 800, y: 600 - 50 - gap, w: 120, h: 100, hp }] } });
  assert.equal(halo(boss(RAM_REACH - 1)), 'dim', "a boss part's box just in reach");
  assert.equal(halo(boss(RAM_REACH + 1)), 'bright', 'just out of reach');
  assert.equal(halo(boss(10, 0)), 'bright', 'a part that is gone');
  assert.equal(halo(boss(10, 10, 1)), 'bright', 'a boss still flying in cannot be hit, so it is no trap');
});

test("the stars turn with the body's age and come round every 1 / STAR_COUNT of a turn; a dizzy body rocks about its own place", () => {
  const at = (t) => blits(field([body(0, 500, 400, { t })]), false)[0];
  const third = 1 / (STAR_COUNT * SPIN);
  const seen = new Set();
  for (let k = 0; k < STARS; k++) seen.add(at(((k + 0.5) / STARS) * third).img);
  assert.equal(seen.size, STARS, 'a new frame each step of the turn');
  assert.equal(at(0.37).img, at(0.37 + third).img, 'and round again');
  const { box } = at(0.4);
  assert.ok(Math.abs((box[0] + box[2]) / 2 - 500) < 0.5 && Math.abs((box[1] + box[3]) / 2 - 400) < 0.5, 'centred on the body');
  assert.notDeepEqual(at(0.4).box, at(0.9).box, 'it rocks as it tumbles');
});

test('a flying body is turned to its flight with its streak behind it, rimmed in the accent', () => {
  const S = bodySprites(look);
  const right = blits(field([body(0, 900, 500, { fly: true, vx: 1000, vy: 0 })]), true)[0];
  assert.equal(right.img, S.flying.grunt);
  assert.deepEqual(right.box.map(Math.round), [900 - FLY_X, 500 - FLY_H / 2, 900 - FLY_X + FLY_W, 500 + FLY_H / 2], 'flying right: the streak trails to the left');
  const up = blits(field([body(0, 900, 500, { fly: true, vx: 0, vy: -1000 })]), true)[0];
  assert.ok(up.box[3] > 500 + FLY_X - 1 && up.box[1] < 500 - 40, 'flying up: the streak trails below');
  const fly = S.flying.armored;
  const rims = fly.T.calls.filter((c) => c.img !== fly.T.calls.at(-1).img);
  assert.equal(rims.length, 8, 'the rim: the toy in the accent eight ways round it');
  assert.ok(rims[0].img.fills.includes(look.palette.accent), 'in the accent');
  assert.equal(blits(field([body(0, 900, 500, { fly: true, vx: 9, vy: 0 })]), false).length, 0, 'not drawn with the dizzy');
  assert.equal(blits(field([body(0, 900, 500)]), true).length, 0, 'nor a dizzy one with the flying');
});

test('no other world draws a body, a cork or the plane, and a world without bodies draws none', () => {
  for (const l of [LOOKS[17], LOOKS[12], LOOKS[0]]) assert.equal(blits(field([body(0, 500, 400)]), false, l).length, 0, `w${l.world}`);
  assert.equal(blits({ twist: { timer: 0 }, aliens: [] }, false).length, 0, 'no bodies list');
  assert.equal(blits({ twist: { bodies: [] }, aliens: [] }, true).length, 0, 'an empty one');
  const T = tracker();
  drawShots(T.ctx, { shots: [{ x: 400, y: 500, vx: 0, vy: -1400 }] }, LOOKS[17], 1);
  assert.ok(!T.calls.some((c) => c.img.width === CORK_W && c.img.height === CORK_H), 'world 18 keeps its streaks');
  const P = tracker();
  drawShip(P.ctx, { ship: ship() }, LOOKS[17], 1);
  assert.ok(!P.calls.some((c) => c.img.width === PLANE), 'and its hull');
});

test('the playfield files keep the sprite rules', () => {
  fileRules(assert, ['bodies-view.js', 'warm-bath.js', 'bath-kit.js', 'view.js']);
});
