import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { POWERS, POWERS_13, POWERS_15 } from '../../src/core/kinds.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { look as deepLook } from './deep-kit.js';

// R53 on screen: every pickup kind draws an icon of its own, and the HUD's power ring drains over the
// power's own time with the reserve beside it. Both against a context that records every call.
installCanvas();
const { drawIcon } = await import('../../src/ui/pickups-view.js');
const { drawHud } = await import('../../src/ui/hud.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const TOP = -Math.PI / 2; // where a ring starts draining
const LOOK15 = LOOKS[14] ?? deepLook; // Lantern Deep's look, from the registry once it is there and from its own file before

test('every pickup kind draws an icon of its own, in the default set and in every world', () => {
  for (const world of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    // the wingmen drop in world 13 alone, the pearls and the trident in world 15 alone
    const kinds = [...(world === 13 ? POWERS_13 : world === 15 ? POWERS_15 : POWERS), 'bomb', 'life'];
    const drawn = kinds.map((kind) => {
      const { ctx, calls } = recorder();
      drawIcon(ctx, kind, '#ffffff', world);
      assert.ok(calls.length > 2, `${kind} draws something`);
      return JSON.stringify(calls);
    });
    assert.equal(new Set(drawn).size, kinds.length, `world ${world}: two kinds draw the same icon`);
  }
});

// The HUD for a ship with `power` and `reserve`: the rings and texts it drew.
function hud(power, reserve, look = LOOKS[0]) {
  const world = createWorld(levelById('w1-1'));
  Object.assign(world.ship, { power, reserve });
  const { ctx, calls } = recorder();
  drawHud(ctx, world, look, {}, 0);
  return {
    calls,
    // the drained part of the ring of radius r, as a share of the full circle
    share: (r) => calls.filter(([k, , , rr, a0]) => k === 'arc' && rr === r && a0 === TOP).map((c) => (c[5] - TOP) / (2 * Math.PI)),
    texts: calls.filter(([k]) => k === 'fillText').map((c) => c[1]),
  };
}

test("the power ring drains over the power's own time: slow starts full at 6 s, the others at 10 s", () => {
  assert.deepEqual(hud({ kind: 'slow', left: 6 }, null).share(33), [1]);
  assert.deepEqual(hud({ kind: 'slow', left: 3 }, null).share(33), [0.5]);
  assert.deepEqual(hud({ kind: 'homing', left: 5 }, null).share(33), [0.5]);
  assert.deepEqual(hud({ kind: 'spread', left: 10 }, null).share(33), [1]);
});

test('the reserve is a smaller ring, drained by its own time left, with those seconds and a caption', () => {
  const none = hud({ kind: 'rapid', left: 4 }, null);
  assert.deepEqual(none.share(22), [], 'nothing waits, no ring');
  assert.ok(!none.texts.includes('NEXT'));
  const some = hud({ kind: 'rapid', left: 4 }, { kind: 'slow', left: 2.4 });
  assert.deepEqual(some.share(22), [0.4]);
  assert.deepEqual(some.share(33), [0.4], 'the running power keeps its ring');
  assert.ok(some.texts.includes('NEXT') && some.texts.includes('3s'), some.texts.join());
  assert.deepEqual(hud(null, null).share(33), [], 'no power, no ring');
});

test("in Lantern Deep the power ring and the reserve draw the pearls' and the trident's own icons, and drain over the usual 10 s", () => {
  assert.equal(LOOK15.world, 15);
  const iconCalls = (kind) => { // the icon's own calls, as one run of the HUD's
    const { ctx, calls } = recorder();
    drawIcon(ctx, kind, LOOK15.power[kind], 15);
    return JSON.stringify(calls).slice(1, -1);
  };
  for (const kind of ['pearls', 'trident']) {
    const ring = hud({ kind, left: 5 }, null, LOOK15);
    assert.deepEqual(ring.share(33), [0.5], `${kind} drains over 10 s`);
    assert.ok(JSON.stringify(ring.calls).includes(iconCalls(kind)), `the ring draws world 15's ${kind} icon`);
    const waiting = hud({ kind: 'spread', left: 4 }, { kind, left: 2.5 }, LOOK15);
    assert.deepEqual(waiting.share(22), [0.25], `the waiting ${kind} drains over 10 s too`);
    assert.ok(JSON.stringify(waiting.calls).includes(iconCalls(kind)), 'the reserve draws it too, scaled down');
  }
  assert.notEqual(iconCalls('pearls'), iconCalls('trident'), 'two icons');
});
