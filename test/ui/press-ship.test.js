import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, made, recorder, tracker, toRgb, fileRules } from './aliens-bath-kit.js';

// What world 20 (Midnight Press) draws on the player's side: a folded paper dart for the ship (ship-press.js), ink strokes for its shots
// (shots-press.js), a paper band for the pickup rim (pickup-press.js), and the echo's carbon copy and its shots in blue. The look is not
// in LOOKS until part 6, so it is built here as the game will.
const { default: w20 } = await import('../../src/ui/looks/w20.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { DART, COPY_ALPHA, dartSprite, carbonSprite } = await import('../../src/ui/ship-press.js');
const { STROKE_W, HEAD, inkSprite, carbonShotSprite } = await import('../../src/ui/shots-press.js');
const { planeSprite } = await import('../../src/ui/ship-bath.js');
const { CARBON, PRESS_WORLD } = await import('../../src/ui/press-kit.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { glow } = await import('../../src/ui/sprites.js');

const look = { world: PRESS_WORLD, ...w20 };
const accent = look.palette.accent;
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const shot = (x, extra = {}) => ({ x, y: 500, vx: 0, vy: -1400, r: 4, ...extra });
const centre = ({ box }) => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
const OURS = () => new Set([dartSprite(accent), carbonSprite(), inkSprite(), carbonShotSprite()]);

test("world 20's ship is the paper dart: one baked sprite on the ship, no engine flames, not world 19's plane, and it blinks", () => {
  const T = tracker();
  drawShip(T.ctx, { ship: ship({ vy: -700 }) }, look, 1);
  const dart = T.calls.filter((c) => c.img === dartSprite(accent));
  assert.equal(dart.length, 1, 'the dart, once');
  const [x, y] = centre(dart[0]);
  assert.ok(Math.abs(x - 700) < 1 && Math.abs(y - 820) < 1, 'on the ship');
  assert.ok(!T.calls.some((c) => c.img === glow('#ffffff') || c.img === planeSprite(accent)), 'no flames and no toy plane');
  const blink = tracker();
  drawShip(blink.ctx, { ship: ship({ invuln: 1 }) }, look, 0);
  assert.ok(blink.calls.every((c) => c.alpha <= 0.3 + 1e-9), 'every sprite dims while it blinks');
  const sprite = dartSprite(accent);
  assert.ok(made.includes(sprite), 'baked here, so it can be read back');
  const b = sprite.T.bounds;
  assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= DART && b.y1 <= DART, `inside its sprite: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(sprite.fills.includes(look.palette.paper) && sprite.fills.includes(look.palette.ink), 'cream paper and an inked nib');
  assert.ok(sprite.strokes.some(([style]) => style === look.palette.vermilion), 'a vermilion rule');
});

test("world 20's plain shots are ink strokes, one sprite a shot and no streak, turned along a slanted flight", () => {
  const T = tracker();
  drawShots(T.ctx, { shots: [shot(300), shot(400), shot(500, { vx: 400 })] }, look, 1);
  assert.equal(T.calls.length, 3, 'one blit a shot');
  assert.ok(T.calls.every((c) => c.img === inkSprite()), 'every one an ink stroke');
  const [x0, y0, x1] = T.calls[0].box;
  assert.ok(Math.abs(x0 - (300 - STROKE_W / 2)) < 1e-9 && x1 > 300 && Math.abs(y0 - (500 - HEAD)) < 1e-9, 'its head at the shot');
  const r = recorder();
  drawShots(r.ctx, { shots: [shot(300, { vx: 500, vy: -1300 })] }, look, 1);
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, 0, 'no streak');
  const turn = r.calls.find(([k]) => k === 'rotate');
  assert.ok(turn && Math.abs(turn[1] - (Math.atan2(-1300, 500) + Math.PI / 2)) < 1e-9, 'turned to its heading');
  const others = tracker();
  drawShots(others.ctx, { shots: [shot(300, { broadside: 1, vx: 1400, vy: 0 }), shot(400, { trident: true }), shot(500, { mirror: true })] }, look, 1);
  assert.ok(!others.calls.some((c) => c.img === inkSprite()), 'the side shots, tridents and mirror bolts keep their own');
});

test('the pickup rim is a paper band: its own frame, inside the 60 px sprite for every colour a power wears', () => {
  assert.equal(typeof FRAMES[PRESS_WORLD], 'function');
  for (let n = 1; n < PRESS_WORLD; n++) assert.ok(FRAMES[PRESS_WORLD] !== FRAMES[n], `not world ${n}'s`);
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[PRESS_WORLD](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside`);
    assert.ok(b.x1 - b.x0 > 50 && b.y1 - b.y0 > 50, 'and fills it');
  }
});

test("no other world draws world 20's dart, strokes or copy", () => {
  const ours = OURS();
  for (const other of LOOKS.filter((l) => l.world !== look.world)) {
    const T = tracker();
    drawShip(T.ctx, { ship: ship() }, other, 1);
    drawShots(T.ctx, { shots: [shot(300), shot(400, { vx: 300 })], level: { world: other.world } }, other, 1);
    assert.ok(!T.calls.some((c) => ours.has(c.img) || c.img === dartSprite(other.palette.accent)), `world ${other.world}`);
  }
});

test("the carbon copy is the dart traced in faint blue at the echo's copy, even while the ship is down; with no copy nothing is drawn", () => {
  const copy = { x: 400, y: 900 };
  for (const alive of [true, false]) {
    const T = tracker();
    drawShip(T.ctx, { ship: ship({ alive }), twist: { path: [], copy } }, look, 1);
    const drawn = T.calls.filter((c) => c.img === carbonSprite());
    assert.equal(drawn.length, 1, `the copy, once (ship alive: ${alive})`);
    const [x, y] = centre(drawn[0]);
    assert.ok(Math.abs(x - copy.x) < 1e-9 && Math.abs(y - copy.y) < 1e-9, 'where the copy stands');
    assert.equal(drawn[0].alpha, COPY_ALPHA, 'faint');
  }
  const [d, c] = [dartSprite(accent), carbonSprite()];
  assert.deepEqual(c.T.bounds, d.T.bounds, "the ship's shape");
  assert.ok(c.strokes.length > 0 && c.strokes.every(([style]) => style === CARBON || style.startsWith('rgba(')), 'traced in carbon');
  const [r, g, b] = toRgb(CARBON);
  assert.ok(b > r && b > g, 'and carbon is blue');
  for (const twist of [{ path: [], copy: null }, undefined]) {
    const T = tracker();
    drawShip(T.ctx, { ship: ship(), twist }, look, 1);
    assert.ok(!T.calls.some((x) => x.img === carbonSprite()), 'no copy, nothing drawn for it');
  }
});

test("a copy's shot is the stroke in blue, the ship's own vermilion", () => {
  const T = tracker();
  drawShots(T.ctx, { shots: [shot(300, { echo: true }), shot(400)] }, look, 1);
  assert.deepEqual(T.calls.map((c) => c.img), [carbonShotSprite(), inkSprite()]);
  assert.notEqual(carbonShotSprite(), inkSprite());
});

test('the player-side files keep the sprite rules', () => {
  fileRules(assert, ['ship-press.js', 'shots-press.js', 'pickup-press.js', 'press-kit.js', 'pickup-skins.js', 'lasers-view.js', 'ship-view.js', 'sound-data.js', 'sound-styles-2.js']);
});
