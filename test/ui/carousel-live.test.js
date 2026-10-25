import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvases, look, def, HUD, PAD, f, boss, without, pass, count, sweepT } from './carousel-kit.js';

// The Grand Carousel's live extras: cached sprites only (the opaque ones only in the boss's own pass), the canopy
// turning under the crown and the horses, bulbs chasing, pennants, riders, steam and sparks, a destroyed part's
// glow gone with it, and that warming leaves nothing to bake mid-fight.
const { warmBoss } = await import('../../src/ui/bosses/bake.js');
const { pennant, farHorse, liveCanopy } = await import('../../src/ui/bosses/carousel-sprites.js');
const { FRAMES } = await import('../../src/ui/bosses/carousel-canopy.js');
const { BULBS } = await import('../../src/ui/bosses/carousel-valance.js');
const { soft, glow } = await import('../../src/ui/sprites.js');

// First, while the shared sprite caches are empty: whatever the live extras need that warming missed would be
// made during the fight.
test('warming paints everything the live extras draw: nothing is baked mid-fight', () => {
  warmBoss(look, 'carousel');
  const before = canvases.length;
  for (const phase of [0, 1, 2]) for (const own of [false, true]) sweepT(boss(phase), own, () => {});
  assert.equal(canvases.length - before, 0, 'no canvas was made during the fight');
});

test('live extras stay under the HUD and inside the box and its pad, in every phase and pass', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${f(bounds.y0)}`);
        assert.ok(bounds.y1 <= def.size.h / 2 + 60 && Math.abs(bounds.x0) <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
      });
    }
  }
});

test('everything opaque is drawn only in the own pass, which leaves the context additive as it found it', () => {
  for (const phase of [0, 1, 2]) {
    const lights = pass(boss(phase), 14, false);
    assert.ok(lights.calls.every((c) => c.comp === 'lighter'), `phase ${phase}: the darkness pass draws only additive light`);
    const own = pass(boss(phase), 14, true);
    assert.ok(own.calls.some((c) => c.comp === 'source-over'), `phase ${phase}: the own pass draws the canopy, pennants and riders`);
    assert.equal(own.after, 'lighter');
    assert.equal(lights.after, 'lighter');
    const glints = own.calls.filter((c) => c.img === glow('#ffe9a0') || c.img === glow('#ff9ad0'));
    assert.ok(glints.length >= 2 && glints.every((c) => c.comp === 'lighter'), `phase ${phase}: the own pass adds its chasing bulbs back as light`);
  }
});

test('the canopy turns: a frame of the baked set for the clock, faster in each phase, and the frames are cut round the parts', () => {
  const frame = (phase, t) => FRAMES > 0 && pass(boss(phase), t, true).calls.find((c) => c.args.length === 2 && c.args[0] === -352)?.img;
  assert.equal(frame(0, 0), liveCanopy(0));
  assert.notEqual(frame(0, 0), frame(0, 0.4), 'it has turned a little');
  const index = (phase, t) => [...Array(FRAMES).keys()].find((i) => frame(phase, t) === liveCanopy(i));
  const speed = (phase) => (index(phase, 0.2) + FRAMES - index(phase, 0.1)) % FRAMES;
  assert.ok(speed(0) < speed(1) && speed(1) < speed(2), `frames in a tenth of a second: ${[0, 1, 2].map(speed)}`);
  const sheet = canvases.filter((c) => c.width === 704 && c.height === 78); // the canopy's frames and the cut-out
  const cut = sheet.filter((c) => c.T.calls.some((d) => d.comp === 'destination-out'));
  assert.equal(cut.length, FRAMES, 'every turning frame is cut by the same mask');
  const mask = cut[0].T.calls.find((d) => d.comp === 'destination-out').img;
  assert.ok(mask.T.bounds.x0 < 40 && mask.T.bounds.x1 > 664, 'the mask holds the crown and both horses, from flank to flank');
});

test('the canopy speeds up at a phase change without jumping: a frame later it is at most one frame on', () => {
  const b = boss(0);
  const at = (t) => {
    const img = pass(b, t, true).calls.find((c) => c.args.length === 2 && c.args[0] === -352)?.img;
    return [...Array(FRAMES).keys()].find((i) => img === liveCanopy(i));
  };
  for (const [from, to] of [[0, 1], [1, 2]]) {
    b.phase = from;
    const before = at(10 * to);
    b.phase = to;
    const step = (at(10 * to + 1 / 60) - before + FRAMES) % FRAMES;
    assert.ok(step <= 1, `phase ${from} to ${to}: ${step} frames in one tick`);
  }
});

test('the pennants ripple on the crown and both poles, the riders bob in turn, the steam comes with the second phase', () => {
  const own = (b, t = 14) => pass(b, t, true).calls;
  const flags = (calls) => [0, 1, 2, 3, 4, 5, 6, 7].reduce((n, k) => n + count(calls, pennant(k)), 0);
  const [all, noCrown, noHorse] = [boss(0), without(boss(0), 'crown'), without(boss(0), 'horseL')].map((b) => own(b));
  assert.equal(flags(all), 3, 'the finial and the two poles');
  assert.equal(flags(noCrown), 2);
  assert.equal(flags(noHorse), 2);
  const rider = (t) => own(boss(1), t).filter((c) => c.img === farHorse()).map((c) => c.box[1]);
  for (const t of [3, 5.5, 9]) {
    const [l, r] = rider(t);
    assert.ok(Math.abs(l + r + 120) < 1e-6, `at ${t} s the riders mirror each other's height about -22: ${l}, ${r}`);
  }
  assert.notEqual(rider(3)[0], rider(3.4)[0], 'bobbing');
  const steam = (phase) => count(own(boss(phase)), soft('#ffd8f0'));
  assert.deepEqual([0, 1, 2].map(steam), [0, 9, 9]);
  assert.equal(steam(1) - count(own(without(boss(1), 'organ')), soft('#ffd8f0')), 9, 'a destroyed organ breathes none');
  const sparks = (phase) => ['#4be08a', '#c8a8ff'].reduce((n, c) => n + count(pass(boss(phase), 14).calls, glow(c)), 0);
  assert.deepEqual([sparks(0), sparks(1) > 0, sparks(2) > 0], [0, false, true], 'sparks of every colour fall from the valance in the last phase only');
});

test('the rim bulbs chase round, faster in each phase, and the drum chases its own two rings; a destroyed drum stops', () => {
  const lit2 = (phase, t) => pass(boss(phase), t).calls.filter((c) => c.img === glow('#ffe9a0') || c.img === glow('#ff9ad0')).map((c) => c.box[0].toFixed(1)).join();
  assert.notEqual(lit2(0, 3), lit2(0, 3.3), 'the comet moves');
  const reach = (phase) => new Set(Array.from({ length: 30 }, (_, i) => lit2(phase, 3 + i * 0.05))).size;
  assert.ok(reach(0) <= reach(2), 'and runs further in the last phase');
  assert.ok(BULBS.length >= 15, 'a bulb every few px along the moulding');
  const [all, noDrum] = [boss(2), without(boss(2), 'drum')].map((b) => pass(b, 14).calls.length);
  assert.ok(noDrum < all);
});

test('a destroyed part leaves no glow behind in the live extras', () => {
  for (const id of ['crown', 'organ', 'horseL', 'lampL', 'drum']) {
    for (const phase of [0, 2]) {
      assert.ok(pass(without(boss(phase), id), 14, true).calls.length < pass(boss(phase), 14, true).calls.length, `${id} in phase ${phase}`);
      assert.ok(pass(without(boss(phase), id), 14).calls.length < pass(boss(phase), 14).calls.length, `${id}'s lights in phase ${phase}`);
    }
  }
});
