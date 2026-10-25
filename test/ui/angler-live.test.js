import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sink } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { canvases, look, def, art, HUD, PAD, f, boss, without, pass, count, sweepT } from './angler-kit.js';

// The Lantern Leviathan's live extras: cached sprites only (the opaque ones only in the boss's own pass), the lure on
// its stalk swinging, flaring in the last phase, the jaw's glints, the belly's chase, the eyes' glints and the ring of
// lamps; a destroyed part's glow gone with it; that warming leaves nothing to bake mid-fight. The jaw and the fins'
// ripple are angler-jaw.test.js; the fin, eye and belly painters angler-parts.test.js.
const { warmBoss } = await import('../../src/ui/bosses/bake.js');
const { glow, star } = await import('../../src/ui/sprites.js');
const { motion, lureAt, SWIRL } = await import('../../src/ui/bosses/angler-lure.js');
const { ROOT, TIP, STALK, BULB_R, stalk, tether, bulb, filaments, filamentGlow } = await import('../../src/ui/bosses/angler-sprites.js');
const { rays } = await import('../../src/ui/bosses/angler-sprites-2.js');
const { jawBody } = await import('../../src/ui/bosses/angler-jaw-sprite.js');
const { LIGHTS } = await import('../../src/ui/bosses/angler-belly.js');

const AQUA = '#5af0ff';
const PALE = '#9af4ff';
const WHITE = '#ffffff';
const lureSprites = () => [stalk(), bulb(), tether(), filaments(), filamentGlow(), rays(0), rays(1)];
const drawn = (calls, imgs) => imgs.reduce((n, img) => n + count(calls, img), 0);

// First, while the shared sprite caches are empty: whatever the live extras need that warming missed would be made
// during the fight.
test('warming paints everything the live extras draw: nothing is baked mid-fight', () => {
  warmBoss(look, 'angler');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) for (const own of [false, true]) sweepT(boss(phase), own, () => {});
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
});

test('live extras stay under the HUD and inside the box and its pad, in every phase and pass, with at most 72 draws', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds, calls }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${bounds.y0.toFixed(1)}`);
        assert.ok(bounds.y1 <= def.size.h / 2 + 60 && -bounds.x0 <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
        assert.ok(calls.length <= 72, `phase ${phase} own ${own}: ${calls.length} draws`);
      });
    }
  }
  assert.ok(STALK.y >= HUD + 4, 'and the stalk sprite itself lies under the HUD, with room for its sway');
});

test('nothing rises into the HUD from a fresh boss either: the phase may begin at any time, with the lure flaring', () => {
  for (const phase of [0, 1, 2]) {
    for (let t = 0; t < 60; t += 0.37) assert.ok(pass(boss(phase), t, true, t - 0.3).bounds.y0 >= HUD, `phase ${phase} at ${t}`);
  }
});

test('everything opaque is drawn only in the own pass, which leaves the context additive as it found it', () => {
  for (const phase of [0, 1, 2]) {
    const lights = pass(boss(phase), 14, false);
    assert.ok(lights.calls.every((c) => c.comp === 'lighter'), `phase ${phase}: the darkness pass draws only additive light`);
    const own = pass(boss(phase), 14, true);
    const solid = own.calls.filter((c) => c.comp === 'source-over');
    assert.equal(solid.length, 5, `phase ${phase}: the own pass adds the jaw, the stalk, the tether, the filaments and the bulb`);
    assert.ok(solid.every((c) => c.alpha === 1), 'each of them whole, whatever alpha the lights before it left');
    assert.equal(own.after, 'lighter');
    assert.equal(lights.after, 'lighter');
    assert.equal(own.calls.length, lights.calls.length + 5, 'and nothing else');
    assert.ok(own.calls.filter((c) => c.comp === 'lighter').every((c) => c.alpha >= 0 && c.alpha <= 1), 'the lights are drawn at their own strength');
  }
  const dim = tracker();
  dim.ctx.globalCompositeOperation = 'lighter';
  art.live(dim.ctx, boss(2), 14, 0.4, false, 0);
  assert.ok(dim.calls.every((c) => c.alpha <= 0.4 + 1e-9), 'light strength k scales every light');
});

test('the live pass leaves alpha, blend mode, line state and the save stack as it found them', () => {
  const stateful = () => {
    const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'lighter', filter: 'none', depth: 0 };
    const stack = [];
    return new Proxy(state, {
      get: (o, k) => (k === 'save' ? () => { stack.push({ ...o }); o.depth++; } : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => sink),
      set: (o, k, v) => ((o[k] = v), true),
    });
  };
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      const ctx = stateful();
      const before = { ...ctx };
      art.live(ctx, boss(phase), 14, 1, own, 9);
      assert.deepEqual({ ...ctx }, before, `phase ${phase} own ${own}`);
    }
  }
});

test('the lure is a big bulb that dangles in front of the face between the eyes, on a stalk from the crown that arches forward and down', () => {
  assert.ok(BULB_R >= 22 && BULB_R <= 26, `the bulb is ${BULB_R} px in radius`);
  assert.ok(TIP[0] > ROOT[0] + 30 && TIP[1] > STALK.y + 20, 'the stalk bends over the crest and comes down in front, its tip well below its apex');
  for (const phase of [0, 1, 2]) {
    const b = boss(phase);
    const xs = [];
    sweepT(b, true, ({ calls }, t) => {
      const P = lureAt(motion(b, t, phase));
      assert.ok(P.ly >= -94 && P.ly <= -74, `phase ${phase}: the lure's height ${f(P.ly)}, in front of the upper face`);
      assert.ok(P.ly - BULB_R >= HUD + 4, 'its bulb under the HUD');
      assert.ok(P.lx > 14 && P.lx < 76, `phase ${phase}: the lure's x ${f(P.lx)}, between the eyes and right of the middle`);
      assert.equal(drawn(calls, [stalk(), tether(), filaments(), bulb()]), 4, 'a stalk, its tether, the filaments and the bulb');
      xs.push(P.lx);
    });
    assert.ok(Math.max(...xs) - Math.min(...xs) > 8, `phase ${phase}: it swings (${f(Math.max(...xs) - Math.min(...xs))} px)`);
  }
});

test('the lure blazes: a wide halo that is brighter in the last phase, a slow pulse, rays and a shower of motes only then', () => {
  const halo = (calls) => calls.filter((c) => c.img === glow(AQUA) && c.args[2] > 100 && c.args[2] < 140).map((c) => c.alpha); // the lure's wide halo
  const motes = (calls) => calls.filter((c) => (c.img === glow(PALE) || c.img === glow(WHITE)) && c.args[2] <= 18.5).length;
  const quiet = [];
  const flare = [];
  for (let t = 3; t < 40; t += 0.29) {
    quiet.push(...halo(pass(boss(0), t).calls));
    flare.push(...halo(pass(boss(2), t).calls));
  }
  assert.ok(Math.min(...flare) > Math.max(...quiet), 'the halo never dims to what the first phase shows at its brightest');
  assert.ok(Math.max(...quiet) - Math.min(...quiet) > 0.05, 'and it breathes');
  for (const phase of [0, 1, 2]) {
    const calls = pass(boss(phase), 14).calls;
    assert.deepEqual([count(calls, rays(0)), count(calls, rays(1)), motes(calls)], phase === 2 ? [1, 1, 5] : [0, 0, 0], `phase ${phase}`);
  }
});

test('the ring of lamps circles the head only in the last phase, quieter than the lure, and a phase change never makes anything jump', () => {
  const near = (calls) => calls.filter((c) => {
    const [x, y] = [(c.box[0] + c.box[2]) / 2, (c.box[1] + c.box[3]) / 2];
    return Math.abs((x / 230) ** 2 + ((y + 20) / 120) ** 2 - 1) < 0.01;
  });
  assert.ok(near(pass(boss(2), 20).calls).length >= 18, 'twelve lamps and a tail on the near ones');
  assert.ok(near(pass(boss(0), 20).calls).length <= 2 && near(pass(boss(1), 20).calls).length <= 2, 'none in the first two phases');
  const ring = near(pass(boss(2), 20).calls);
  assert.ok(Math.max(...ring.map((c) => c.alpha)) < 0.6, 'quieter than the lure');
  const b = boss(0);
  let prev = null;
  const worst = { lure: 0, ang: 0, jaw: 0, flare: 0, orbit: 0, amp: 0, pulse: 0 };
  for (let i = 0; i < 780; i++) {
    const t = 3 + i / 60;
    b.phase = i < 240 ? 0 : i < 480 ? 1 : 2;
    pass(b, t, true, 3 + (i < 240 ? -1e9 : i < 480 ? 4 : 8));
    const m = motion(b, t, b.phase);
    const P = lureAt(m);
    const cur = { x: P.lx, y: P.ly, ang: m.ang, jaw: m.jaw, flare: m.flare, orbit: m.orbit, amp: m.amp, pulse: m.pulse };
    if (prev) {
      worst.lure = Math.max(worst.lure, Math.hypot(cur.x - prev.x, cur.y - prev.y));
      for (const k of ['ang', 'jaw', 'flare', 'orbit', 'amp', 'pulse']) worst[k] = Math.max(worst[k], Math.abs(cur[k] - prev[k]));
    }
    prev = cur;
    if (i === 252) assert.ok(m.jaw < 0.5, `a fifth of a second into the hover phase the jaw is only ${m.jaw.toFixed(2)} down`);
    if (i === 330) assert.ok(m.jaw > 0.9, `a second and a half on it is down: ${m.jaw.toFixed(2)}`);
    if (i === 700) assert.ok(m.orbit > 0.95 && m.flare > 0.9, 'the last phase has come up in full');
  }
  assert.ok(worst.lure < 1.6, `the lure moves ${worst.lure.toFixed(2)} px a tick at most`);
  assert.ok(worst.ang <= (SWIRL / 60) * 1.01, `the ring's angle moves ${worst.ang.toFixed(4)} a tick at most`);
  assert.ok(worst.pulse < 0.045, `the lure's breath advances ${worst.pulse.toFixed(4)} rad a tick at most, never skips`);
  assert.ok(worst.jaw < 0.06 && worst.flare < 0.03 && worst.orbit < 0.03 && worst.amp < 0.01, `eased: ${JSON.stringify(worst)}`);
  const fresh = motion(boss(2), 33, 2);
  assert.deepEqual([fresh.jaw, fresh.flare, fresh.orbit], [1, 1, 1], 'a boss first seen in the last phase is drawn finished');
});

test('a destroyed part takes what hangs on it along: crest, maw, eye, belly and fin', () => {
  const core = (calls) => calls.filter((c) => c.img === glow(WHITE) && c.args[2] > 20).length; // the lure's white-hot core
  for (const phase of [0, 1, 2]) {
    const all = pass(boss(phase), 14, true).calls;
    const bare = pass(without(boss(phase), 'crest'), 14, true).calls;
    assert.equal(drawn(bare, lureSprites()) + core(bare), 0, `phase ${phase}: no stalk, lure or glow without the crest`);
    assert.equal(core(all), 1);
    assert.ok(bare.length < all.length - 8);
    assert.equal(count(all, star(WHITE)), 2, 'a glint on each eye');
    assert.equal(count(pass(without(boss(phase), 'eyeL'), 14).calls, star(WHITE)), 1);
    assert.equal(count(pass(without(boss(phase), 'eyeL', 'eyeR'), 14).calls, star(WHITE)), 0);
    const base = pass(boss(phase), 14).calls.length;
    assert.equal(base - pass(without(boss(phase), 'maw'), 14).calls.length, phase ? 5 : 3, `phase ${phase}: the maw's swell and glints`);
    assert.equal(base - pass(without(boss(phase), 'finL'), 14).calls.length, phase ? 4 : 3, `phase ${phase}: a fin's ripple and shimmer`);
    assert.equal(base - pass(without(boss(phase), 'finL', 'finR'), 14).calls.length, phase ? 8 : 6);
    assert.ok(count(pass(without(boss(phase), 'maw', 'crest', 'finL', 'finR', 'belly'), 14, true).calls, jawBody()) === 1, 'the jaw is the hull\'s, not a part\'s: it stays');
  }
  let seen = 0;
  sweepT(boss(1), false, ({ calls }, t) => {
    const gone = pass(without(boss(1), 'belly'), t).calls.length;
    assert.ok(gone <= calls.length);
    seen += calls.length - gone;
  });
  assert.ok(seen > 20, `the belly's lamps chase in a wave (${seen} lit lamps over the sweep)`);
});

test('the belly chase runs across the lamps and faster in each phase', () => {
  const key = (c) => `${Math.round((c.box[0] + c.box[2]) / 2)},${Math.round((c.box[1] + c.box[3]) / 2)}`;
  const spots = new Set(LIGHTS.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
  const lit2 = (phase, t) => pass(boss(phase), t).calls.filter((c) => spots.has(key(c))).map(key).join('|');
  assert.notEqual(lit2(0, 3), lit2(0, 3.3), 'the wave moves');
  const reach = (phase) => new Set(Array.from({ length: 40 }, (_, i) => lit2(phase, 3 + i * 0.05))).size;
  assert.ok(reach(0) <= reach(2), 'and runs faster in the last phase');
});
