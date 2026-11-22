import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, made, recorder, tracker, fileRules, toRgb } from './aliens-bath-kit.js';
import { sink } from './dom-kit.js';

// What world 22 (Wanderlight) draws on the player's side: the mockup's paper glider with its ribbon for the ship (ship-wander.js, branched in
// ship-view.js on WANDER_WORLD), warm white bolts for its shots (shots-wander.js, branched in lasers-view.js), and a shield that reads on the
// parchment. Enemy fire stays violet (the look's own). Every sprite is baked once.
const { drawShip } = await import('../../src/ui/ship-view.js');
const { drawShots } = await import('../../src/ui/lasers-view.js');
const { WANDER_WORLD, PAL } = await import('../../src/ui/wander-kit.js');
const W = await import('../../src/ui/ship-wander.js');
const { boltSprite, BOLT_W, BOLT_H, HEAD } = await import('../../src/ui/shots-wander.js');
const { dartSprite } = await import('../../src/ui/ship-press.js');
const { chariotSprite } = await import('../../src/ui/ship-isle.js');
const { SHIP_R, SHOT_SPEED } = await import('../../src/core/ship.js');
const { glow } = await import('../../src/ui/sprites.js');

const look = LOOKS.find((l) => l.world === WANDER_WORLD);
const others = LOOKS.filter((l) => l !== look);
const ship = (extra = {}) => ({ alive: true, lives: 3, invuln: 0, x: 700, y: 820, vx: 0, vy: 0, power: null, broadside: 0, ...extra });
const ribbons = () => Array.from({ length: W.RIBBON_FRAMES }, (_, k) => W.ribbonSprite(k));
const shot = (x, extra = {}) => ({ x, y: 500, vx: 0, vy: -SHOT_SPEED, r: 4, life: 1, ...extra });
const draw = (l, s, t = 1) => {
  const T = tracker();
  drawShip(T.ctx, { ship: s }, l, t);
  return T;
};

test("world 22's ship is the paper glider and no other world's is: its body and the ribbon's phase, on the ship, no engine flames", () => {
  assert.equal(look.world, 22);
  const T = draw(look, ship({ vy: -700 }));
  const imgs = T.calls.map((c) => c.img);
  const body = T.calls.find((c) => c.img === W.gliderSprite());
  const ribbon = T.calls.find((c) => c.img === W.ribbonSprite(W.ribbonPhase(1)));
  assert.ok(body && ribbon, 'the glider and its ribbon are drawn');
  assert.deepEqual(body.box.map(Math.round), [700 - W.GLIDER_W / 2, 820 - W.GLIDER_H / 2, 700 + W.GLIDER_W / 2, 820 + W.GLIDER_H / 2], 'the body centred on the ship');
  assert.deepEqual([ribbon.box[0], ribbon.box[1]], [700 - W.RIBBON_X, 820], 'the ribbon starts under it');
  assert.ok(imgs.indexOf(ribbon.img) < imgs.indexOf(body.img), 'and is drawn under it');
  assert.ok(T.calls.some((c) => c.img === glow(PAL.lamp) && c.comp === 'lighter'), 'the nose glows, added to the ground');
  assert.ok(!T.calls.some((c) => c.args.length === 4 && c.args[3] > 40 && c.args[2] === 20), 'no engine flames');
  for (const other of others) {
    const own = new Set([W.gliderSprite(), ...ribbons()]);
    assert.ok(!draw(other, ship()).calls.some((c) => own.has(c.img)), `world ${other.world}'s ship is its own`);
  }
  for (const n of [20, 21]) {
    const l = LOOKS.find((p) => p.world === n);
    const sprite = n === 20 ? dartSprite(l.palette.accent) : chariotSprite();
    assert.ok(draw(l, ship()).calls.some((c) => c.img === sprite), `world ${n} keeps its ship`);
    assert.ok(!imgs.includes(sprite), 'and world 22 does not draw it');
  }
});

test('the glider blinks while the ship is invulnerable: the body, the ribbon and the nose all dim', () => {
  const T = draw(look, ship({ invuln: 1 }), 0);
  assert.ok(T.calls.length >= 3 && T.calls.every((c) => c.alpha <= 0.3 + 1e-9), T.calls.map((c) => c.alpha).join());
  const clear = draw(look, ship(), 0);
  assert.ok(clear.calls.some((c) => c.alpha > 0.5), 'and not otherwise');
  const g = tracker();
  g.ctx.globalAlpha = 0.3;
  W.drawGlider(g.ctx, 1, 0.3);
  assert.equal(g.ctx.globalAlpha, 0.3, 'and the glow leaves the blink as it found it');
});

test('the shield reads on the parchment: a ring in its own colour laid on, where the other worlds add light', () => {
  const rings = (l) => {
    const seen = [];
    const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { if (k === 'stroke') seen.push([o.globalCompositeOperation, o.strokeStyle]); return sink; }), set: (o, k, v) => ((o[k] = v), true) });
    drawShip(ctx, { ship: ship({ power: { kind: 'shield', left: 5 } }) }, l, 1);
    return seen.filter(([, style]) => style.includes(toRgb(l.power.shield).join(',')));
  };
  assert.ok(rings(look).length > 0 && rings(look).every(([comp]) => comp === 'source-over'), "world 22's ring is laid over the ground");
  for (const other of others) assert.ok(rings(other).every(([comp]) => comp === 'lighter'), `world ${other.world} adds light`);
});

test('the glider is as big as it is hit, its ribbon is a ring of phases of one wave, and every one of them lies in its sprite', () => {
  assert.ok(Math.abs(W.BODY_RY * W.GLIDER_SCALE - SHIP_R) < 1e-9, "the brass body is the hit disc's size");
  for (const sprite of [W.gliderSprite(), ...ribbons()]) {
    assert.ok(made.includes(sprite), 'baked here, so it can be read back');
    const b = sprite.T.bounds;
    const [w, h] = sprite === W.gliderSprite() ? [W.GLIDER_W, W.GLIDER_H] : [W.RIBBON_W, W.RIBBON_H];
    assert.ok(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= w && b.y1 <= h, `inside its sprite: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  assert.ok(new Set(ribbons().map((s) => [s.T.bounds.x0, s.T.bounds.x1].map((v) => v.toFixed(3)).join())).size > W.RIBBON_FRAMES / 2, 'the phases are not one picture');
  const period = (2 * Math.PI) / W.RIBBON_RATE;
  const seen = new Set();
  for (let i = 0; i < W.RIBBON_FRAMES * 4; i++) {
    const t = ((i + 0.5) * period) / (W.RIBBON_FRAMES * 4); // the middle of a step, clear of the edge between two phases
    seen.add(W.ribbonPhase(t));
    assert.equal(W.ribbonPhase(t + period), W.ribbonPhase(t), 'the wave repeats every period');
  }
  assert.equal(seen.size, W.RIBBON_FRAMES, 'and runs through every phase');
});

test("world 22's plain shots are warm white bolts, one blit a shot, turned to their flight; the side shots keep their own and no streak is drawn", () => {
  const shots = [shot(300), shot(400, { vx: 500, vy: -1300 }), shot(500, { broadside: 1 }), shot(600, { trident: true }), shot(700, { mirror: true })];
  const T = tracker();
  drawShots(T.ctx, { shots }, look, 1);
  assert.equal(T.calls.filter((c) => c.img === boltSprite()).length, 2, 'the two plain shots are bolts');
  const r = recorder();
  drawShots(r.ctx, { shots: shots.slice(0, 2) }, look, 1);
  assert.equal(r.calls.filter(([k]) => k === 'stroke').length, 0, 'no streak');
  assert.deepEqual(r.calls.filter(([k]) => k === 'translate').map(([, x, y]) => [x, y]), [[300, 500], [400, 500]], 'drawn where the shots are');
  assert.deepEqual(r.calls.filter(([k]) => k === 'drawImage').map(([, , x, y]) => [x, y]), [[-BOLT_W / 2, -HEAD], [-BOLT_W / 2, -HEAD]], 'their heads there');
  const [up, slant] = r.calls.filter(([k]) => k === 'rotate').map(([, a]) => a);
  assert.ok(Math.abs(up) < 1e-9 && Math.abs(slant - (Math.atan2(-1300, 500) + Math.PI / 2)) < 1e-9, 'straight up, and along a slanted heading');
  for (const other of others) {
    const O = tracker();
    drawShots(O.ctx, { shots: [shot(300), shot(400, { vx: 300 })], level: { world: other.world } }, other, 1);
    assert.ok(!O.calls.some((c) => c.img === boltSprite()), `world ${other.world} keeps its own`);
  }
  const bolt = boltSprite();
  assert.ok(made.includes(bolt) && bolt.width === BOLT_W && bolt.height === BOLT_H);
  const warm = bolt.fills.filter((c) => typeof c === 'string' && c.startsWith('#')).map(toRgb);
  assert.ok(warm.some(([rr, g, b]) => rr >= 230 && g >= 230 && b >= 200 && rr > b), 'a warm white');
  assert.ok(bolt.fills.every((c) => typeof c !== 'string' || !c.startsWith('#') || toRgb(c)[2] <= toRgb(c)[0] + 8), 'and nothing cool on it');
  assert.equal(look.palette.enemy, PAL.violet, 'the enemy fire stays violet');
});

test('the ship and its shots are baked once: a second sweep of the whole wave bakes nothing', () => {
  const sweep = () => {
    for (let i = 0; i < W.RIBBON_FRAMES * 3; i++) {
      draw(look, ship(), i / 7);
      drawShots(tracker().ctx, { shots: [shot(300)] }, look, i / 7);
    }
  };
  sweep();
  const n = made.length;
  sweep();
  assert.equal(made.length, n);
});

test('the player-side files keep the sprite rules', () => {
  fileRules(assert, ['ship-wander.js', 'shots-wander.js', 'ship-view.js', 'lasers-view.js', 'wander-kit.js']);
});
