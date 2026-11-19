import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, made, recorder, tracker, fileRules, colours, toRgb } from './aliens-bath-kit.js';

// What world 21 (Golden Isle) draws on the player's side: a golden sky chariot for the ship (ship-isle.js), golden arrows tipped in cool
// colours for its shots, turned the way they fly (shots-isle.js), and a lotus for the pickup rim (pickup-isle.js). The look is not in LOOKS
// until part 027, so it is built here as the game will.
const { default: w21 } = await import('../../src/ui/looks/w21.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { drawShip } = await import('../../src/ui/ship-view.js');
const { drawPickups } = await import('../../src/ui/pickups-view.js');
const { CHARIOT, chariotSprite } = await import('../../src/ui/ship-isle.js');
const { ARROW_W, HEAD, ARROW_HUES, arrowSprite, paintArrow } = await import('../../src/ui/shots-isle.js');
const { dartSprite } = await import('../../src/ui/ship-press.js');
const { ISLE_WORLD } = await import('../../src/ui/isle-kit.js');
const { VERMILION, GOLD, GOLD_D, GOLD_P } = await import('../../src/ui/aliens/w21-kit.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { glow } = await import('../../src/ui/sprites.js');
const { quiver } = await import('../../src/core/quiver.js');
const { SHOT_SPEED } = await import('../../src/core/ship.js');
const { HUD_BOTTOM, POWERS } = await import('../../src/core/kinds.js');

const look = { world: ISLE_WORLD, ...w21 };
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const shot = (x, extra = {}) => ({ x, y: 500, vx: 0, vy: -SHOT_SPEED, r: 4, life: 1, ...extra });
const centre = ({ box }) => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
const turns = (shots) => {
  const r = recorder();
  drawShots(r.ctx, { shots }, look, 1);
  return r.calls.filter(([k]) => k === 'rotate').map(([, a]) => a);
};
// Where the sprite's nose (straight up in the sprite) points once turned by a.
const nose = (a) => [Math.sin(a), -Math.cos(a)];

test("world 21's ship is the golden chariot: one baked sprite on the ship, no engine flames, not world 20's dart, and it blinks", () => {
  const T = tracker();
  drawShip(T.ctx, { ship: ship({ vy: -700 }) }, look, 1);
  const drawn = T.calls.filter((c) => c.img === chariotSprite());
  assert.equal(drawn.length, 1, 'the chariot, once');
  const [x, y] = centre(drawn[0]);
  assert.ok(Math.abs(x - 700) < 1 && Math.abs(y - 820) < 1, 'on the ship');
  assert.ok(!T.calls.some((c) => c.img === glow('#ffffff') || c.img === dartSprite(look.palette.accent)), 'no flames and no dart');
  const blink = tracker();
  drawShip(blink.ctx, { ship: ship({ invuln: 1 }) }, look, 0);
  assert.ok(blink.calls.every((c) => c.alpha <= 0.3 + 1e-9), 'every sprite dims while it blinks');
  const sprite = chariotSprite();
  assert.ok(made.includes(sprite), 'baked here, so it can be read back');
  const b = sprite.T.bounds;
  assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= CHARIOT && b.y1 <= CHARIOT, `inside its sprite: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  assert.ok(sprite.fills.includes(VERMILION) && sprite.fills.includes(GOLD), 'gold and vermilion on it');
  assert.ok(sprite.strokes.length > 0 && sprite.fills.length > 0, 'painted');
});

const ARROWS = () => new Set(ARROW_HUES.map((h) => arrowSprite(h)));
// The hue of an [r, g, b] colour in degrees, null for a grey.
const hueDeg = ([r, g, b]) => {
  const [mx, mn] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (mx - mn < 24) return null;
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
};

test("world 21's plain shots are golden arrows, one sprite a shot and no streak, the arrowhead at the shot", () => {
  const T = tracker();
  const shots = [shot(300), shot(400), shot(500, { vx: 400 }), shot(600)];
  drawShots(T.ctx, { shots }, look, 1);
  assert.equal(T.calls.length, shots.length, 'one blit a shot');
  assert.ok(T.calls.every((c) => ARROWS().has(c.img)), 'every one an arrow');
  assert.equal(new Set(T.calls.map((c) => c.img)).size, ARROW_HUES.length, 'shots in turn take every colour, so a volley flies in several');
  const again = tracker();
  drawShots(again.ctx, { shots }, look, 1);
  assert.deepEqual(again.calls.map((c) => c.img), T.calls.map((c) => c.img), 'a shot keeps its colour from frame to frame');
  for (const hue of ARROW_HUES) {
    const sprite = arrowSprite(hue);
    assert.ok(made.includes(sprite) && sprite.fills.includes(hue), `baked, its fletching in ${hue}`);
    assert.ok(!sprite.fills.includes(VERMILION), 'no vermilion on it');
  }
  const r = recorder();
  drawShots(r.ctx, { shots: [shot(300)] }, look, 1);
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, 0, 'no streak');
  const at = r.calls.find(([k]) => k === 'translate');
  const blit = r.calls.find(([k]) => k === 'drawImage');
  assert.deepEqual([at[1], at[2]], [300, 500], 'drawn where the shot is');
  assert.deepEqual([blit[2], blit[3]], [-ARROW_W / 2, -HEAD], 'its head there');
  const others = tracker();
  drawShots(others.ctx, { shots: [shot(300, { broadside: 1, vx: SHOT_SPEED, vy: 0 }), shot(400, { trident: true }), shot(500, { mirror: true })] }, look, 1);
  assert.ok(!others.calls.some((c) => ARROWS().has(c.img)), 'the side shots, tridents and mirror bolts keep their own');
});

test("the arrows' colours are cool, green to violet, so none is taken for the host's red fire; the rest of an arrow is its gold, white or ink", () => {
  const enemy = hueDeg(toRgb(look.palette.enemy));
  for (const hue of ARROW_HUES) {
    const h = hueDeg(toRgb(hue));
    assert.ok(h >= 90 && h <= 300, `${hue} is ${Math.round(h)} degrees, between green and violet`);
    assert.ok(Math.min(Math.abs(h - enemy), 360 - Math.abs(h - enemy)) >= 90, `${hue} sits far from the enemy's ${look.palette.enemy}`);
    const own = toRgb(hue).join();
    const shaft = new Set([GOLD, GOLD_D, GOLD_P].map((c) => toRgb(c).join()));
    for (const c of colours((b) => paintArrow(b(), hue))) {
      const rgb = toRgb(c);
      const ok = rgb.join() === own || shaft.has(rgb.join()) || Math.min(...rgb) >= 230 || Math.max(...rgb) < 60;
      assert.ok(ok, `${hue}'s arrow paints ${c}`);
    }
  }
});

test('an arrow is drawn pointing the way it flies: one flying down is turned from one flying up', () => {
  const [up, down] = turns([shot(300), shot(400, { vy: SHOT_SPEED })]);
  const [ux, uy] = nose(up);
  const [dx, dy] = nose(down);
  assert.ok(Math.abs(ux) < 1e-9 && uy < 0, 'the up arrow points up');
  assert.ok(Math.abs(dx) < 1e-9 && dy > 0, 'the down arrow points down');
  const [slant] = turns([shot(300, { vx: 500, vy: -1300 })]);
  assert.ok(Math.abs(slant - (Math.atan2(-1300, 500) + Math.PI / 2)) < 1e-9, 'a slanted one along its heading');
});

test('a returning arrow points at its quiver point, straight below or off to the side', () => {
  for (const sx of [400, 700, 1100]) {
    const world = { ship: ship({ x: sx }), shots: [shot(400, { y: HUD_BOTTOM - 1 })], events: [], tick: 0 };
    quiver(world);
    const [s] = world.shots;
    assert.ok(s.turned, 'the rule turned it');
    const [a] = turns(world.shots);
    const [nx, ny] = nose(a);
    const d = Math.hypot(sx - s.x, world.ship.y - s.y);
    assert.ok(Math.abs(nx - (sx - s.x) / d) < 1e-9 && Math.abs(ny - (world.ship.y - s.y) / d) < 1e-9, `at the ship at x ${sx}`);
  }
});

test('the pickup rim is a lotus: its own frame, inside the 60 px sprite, dressing each of the six standard powers', () => {
  assert.equal(typeof FRAMES[ISLE_WORLD], 'function');
  for (let n = 1; n < ISLE_WORLD; n++) assert.ok(FRAMES[ISLE_WORLD] !== FRAMES[n], `not world ${n}'s`);
  for (const kind of POWERS) {
    const color = look.power[kind];
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[ISLE_WORLD](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${kind}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside`);
    assert.ok(b.x1 - b.x0 > 50 && b.y1 - b.y0 > 50, 'and fills it');
    const before = made.length;
    drawPickups(tracker().ctx, { pickups: [{ kind, x: 300, y: 300 }] }, look, 0);
    const capsule = made.slice(before).find((c) => c.width === 60 && c.height === 60);
    assert.ok(capsule, `${kind}: its capsule is baked`);
    assert.ok(capsule.strokes.some(([style]) => style === color), `${kind}: with the power's own line`);
    assert.ok(capsule.strokes.some(([style]) => style === GOLD), `${kind}: round the band of gold`);
  }
});

test("no other world draws world 21's chariot or arrows", () => {
  const ours = new Set([chariotSprite(), ...ARROWS()]);
  for (const other of LOOKS.filter((l) => l.world !== ISLE_WORLD)) {
    const T = tracker();
    drawShip(T.ctx, { ship: ship() }, other, 1);
    drawShots(T.ctx, { shots: [shot(300), shot(400, { vx: 300 })], level: { world: other.world } }, other, 1);
    assert.ok(!T.calls.some((c) => ours.has(c.img)), `world ${other.world}`);
  }
});

test('the player-side files keep the sprite rules', () => {
  fileRules(assert, ['ship-isle.js', 'shots-isle.js', 'pickup-isle.js', 'isle-kit.js', 'pickup-skins.js', 'lasers-view.js', 'ship-view.js']);
});
