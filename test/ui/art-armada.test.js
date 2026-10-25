import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNKER } from '../../src/core/bunkers.js';
import { installCanvas, recorder } from './dom-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// Sunset Armada's bunkers, pickup rim and wingmen icon, and what the ship wears there: the escorts, the gun
// ports and the cannon balls (art.test.js and art-archive.test.js have the other worlds').
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { FRAMES, ICONS } = await import('../../src/ui/pickup-skins.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawEscorts, drawGunPorts } = await import('../../src/ui/ship-armada.js');

const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { warmArmada } = await import('../../src/ui/warm-armada.js');

const look = LOOKS[12];
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 960, y: 900, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const images = (calls) => calls.filter(([k]) => k === 'drawImage');

test('warmArmada bakes every large sprite the live art draws: a long run of flourishes, ambient, ship and shots then makes no new one', () => {
  const made = [];
  const make = document.createElement;
  document.createElement = (...a) => made.push(make(...a)) && made.at(-1);
  const layers = buildLayers(look, 5);
  const before = made.length;
  warmArmada(look);
  assert.ok(made.length - before >= 10, `${made.length - before} sprites baked ahead of the fight`);
  const warmed = made.length;
  const shots = [{ pattern: 'shot', x: 700, y: 900, vx: -1800, vy: 0, broadside: -1 }, { pattern: 'shot', x: 960, y: 800, vx: 0, vy: -1800 }];
  for (let t = 0; t < 150; t += 1.5) {
    const { ctx } = recorder();
    const env = { v: { look, layers, cache: {} }, world: { level: {}, ship: ship() }, fx: { flashes: [], time: t }, t, quality: 1 };
    for (const phase of ['sky', 'far', 'mid', 'near', 'front']) drawFlourishes(ctx, env, phase, -160, 400);
    for (const phase of ['sky', 'mid', 'front']) drawAmbient(ctx, look, phase, { t, drift: 0, wind: 0, world: {} });
    drawShip(ctx, { ship: ship({ power: { kind: 'wingmen', left: 5 }, broadside: 3 }) }, look, t);
    drawShots(ctx, { shots }, look, t);
  }
  document.createElement = make;
  const late = made.slice(warmed).filter((c) => c.width * c.height > 10000);
  assert.deepEqual(late.map((c) => `${c.width}x${c.height}`), [], 'nothing big is painted once the fight is on');
});

test("Sunset Armada's bunkers are lashed deck cargo: a course of sandbags under a net, crates in two courses with brass at the corners, dark gaps between", () => {
  assert.equal(look.bunker.skin, 'cargo');
  const P = {};
  for (const k of ['fill', 'light', 'dark', 'edge', 'accent']) P[k] = rgb(look.bunker[k]);
  const seen = new Map();
  const rows = [];
  for (let y = 0; y < BUNKER.h; y++) {
    let dark = 0;
    for (let x = 0; x < BUNKER.w; x++) {
      const [c, k] = SKINS.cargo(x, y, BUNKER.w, BUNKER.h, P);
      assert.ok(Number.isFinite(k) && k >= -1 && k <= 1, `k at ${x},${y}`);
      const name = Object.entries(P).find(([, v]) => v === c)?.[0];
      assert.ok(name, `a colour of the look at ${x},${y}`);
      seen.set(name, (seen.get(name) ?? 0) + 1);
      if (name === 'dark') dark++;
    }
    rows.push(dark);
  }
  assert.ok(seen.get('accent') > 800, `${seen.get('accent')} px of canvas and rope`);
  assert.ok(seen.get('light') > 400, `${seen.get('light')} px of brass and worn corners`);
  assert.ok(seen.get('dark') > 700, `${seen.get('dark')} px of gaps, joints and shadow`);
  assert.ok(seen.get('fill') > BUNKER.w * BUNKER.h * 0.25, 'a good share of plain wood');
  assert.ok(rows.slice(15, 20).some((n) => n > BUNKER.w * 0.6), 'the bags end on a joint that runs the whole width');
  assert.ok(rows.slice(37, 41).some((n) => n > BUNKER.w * 0.6), 'and so do the two courses of crates');
});

test("Sunset Armada's pickup rim is a ship's wheel: eight handles turned out past the rim, each on its own turn", () => {
  const { ctx, calls } = recorder();
  FRAMES[13](ctx, '#ffd45a');
  assert.ok(calls.filter(([k]) => k === 'rotate').length >= 8, 'one turn for each handle');
  assert.ok(calls.filter(([k]) => k === 'fill').length >= 17, 'the dark middle, a handle each and a rivet between each pair');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, 'every handle puts the transform back');
});

test('the wingmen have an icon of their own in world 13: three small fighters in a V', () => {
  const { ctx, calls } = recorder();
  ICONS[13].wingmen(ctx, '#6af0a0');
  assert.equal(calls.filter(([k]) => k === 'fill').length, 3, 'a fighter each');
  assert.ok(look.power.wingmen && look.power.wingmen !== look.power.spread, 'a tint of its own');
});

test('the wingmen are drawn only while the power runs: two escorts where they fire from, fading in and out, propellers and all', () => {
  const at = (s) => {
    const { ctx, calls } = recorder();
    drawEscorts(ctx, s, look, 1, 1);
    return calls;
  };
  assert.equal(images(at(ship())).length, 0, 'no power, no escorts');
  assert.equal(images(at(ship({ power: { kind: 'shield', left: 5 } }))).length, 0, 'another power, none');
  const sprites = (calls) => images(calls).filter((c) => c[4] === 60);
  const mid = at(ship({ power: { kind: 'wingmen', left: 5 } }));
  assert.equal(sprites(mid).length, 2, 'one for each flank');
  assert.deepEqual(mid.filter(([k]) => k === 'translate').map((c) => c[1]), [880, 1040], '80 px either side of the ship');
  assert.ok(sprites(mid).every((c) => c.alpha === 1), 'solid while the power runs');
  for (const left of [9.95, 0.05]) {
    const calls = at(ship({ power: { kind: 'wingmen', left } }));
    assert.deepEqual(calls.filter(([k]) => k === 'translate').map((c) => c[1]), [880, 1040], `at ${left} s left, already where they fire from`);
    const drawn = calls.filter(([k]) => k === 'drawImage' || k === 'fillRect');
    assert.ok(drawn.length >= 6 && drawn.every((c) => c.alpha < 0.1), `at ${left} s left, faint, propeller blades too: ${drawn.map((c) => c.alpha)}`);
  }
  assert.equal(at(ship({ alive: false, power: { kind: 'wingmen', left: 5 } })).length, 0, 'a lost ship has none');
});

test("the escorts' propellers turn: the blade is a different length from one moment to the next", () => {
  const blade = (t) => {
    const { ctx, calls } = recorder();
    drawEscorts(ctx, ship({ power: { kind: 'wingmen', left: 5 } }), look, t, 1);
    return calls.filter(([k]) => k === 'fillRect').map((c) => c[3].toFixed(2)).join();
  };
  assert.notEqual(blade(1), blade(1.011));
});

test('the side guns glow while the broadside is open and dim as its six seconds run down, the barrels sliding out and in', () => {
  const glowAt = (left) => {
    const { ctx, calls } = recorder();
    ctx.globalAlpha = 1;
    drawGunPorts(ctx, ship({ broadside: left }), 2);
    return { alpha: Math.max(...images(calls).map((c) => c.alpha)), barrel: Math.max(...calls.filter(([k]) => k === 'fillRect').map((c) => c[3])) };
  };
  const [fresh, spent] = [glowAt(5.7), glowAt(1.5)];
  assert.ok(fresh.alpha > spent.alpha * 1.8, `${fresh.alpha.toFixed(2)} fresh against ${spent.alpha.toFixed(2)} spent`);
  assert.ok(spent.alpha > 0.1, 'still burning with a second and a half to go');
  assert.ok(glowAt(6).barrel < glowAt(5.5).barrel, 'run out as they open');
  assert.ok(glowAt(0.05).barrel < glowAt(1).barrel, 'and run in as they close');
});

test('the gun ports blink with the ship while it is invulnerable, and leave its alpha as they found it', () => {
  const { ctx, calls } = recorder();
  ctx.globalAlpha = 0.3;
  drawGunPorts(ctx, ship({ broadside: 5.7 }), 2);
  assert.ok(Math.max(...images(calls).map((c) => c.alpha)) <= 0.3 + 1e-9, 'nothing of them burns at full alpha');
  assert.equal(ctx.globalAlpha, 0.3);
});

test('drawShip draws the gun ports in the ship\'s own frame only while the side guns are open', () => {
  const guns = (s) => {
    const { ctx, calls } = recorder();
    drawShip(ctx, { ship: s }, look, 1);
    return calls.filter(([k, , , , h]) => k === 'fillRect' && h === 8.4).length; // the ink round a barrel is 8.4 tall
  };
  assert.equal(guns(ship()), 0);
  assert.ok(guns(ship({ broadside: 4 })) >= 2, 'a barrel on each flank');
});

test("a side shot is a cannon ball with a plume, not a streak, and the other shots keep their streaks", () => {
  const shots = [
    { pattern: 'shot', x: 700, y: 900, vx: -1800, vy: 0, r: 5, life: 1, dmg: 1, broadside: -1 },
    { pattern: 'shot', x: 1200, y: 900, vx: 1800, vy: 0, r: 5, life: 1, dmg: 1, broadside: 1 },
    { pattern: 'shot', x: 960, y: 800, vx: 0, vy: -1800, r: 5, life: 1, dmg: 1 },
  ];
  const { ctx, calls } = recorder();
  drawShots(ctx, { shots }, look, 1);
  assert.equal(calls.filter(([k]) => k === 'moveTo').length, 3, 'the three passes over the streaks carry the one straight shot and neither ball');
  const balls = images(calls).filter((c) => c[4] === 28);
  assert.equal(balls.length, 3, 'the two balls, and the one glow at the streak head');
  assert.ok(images(calls).length >= 2 * 9, 'each ball with its plume and its hot streak');
  assert.equal(ctx.lineCap, 'butt');
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
});
