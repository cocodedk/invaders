import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, sink } from './dom-kit.js';
import { POWERS } from '../../src/core/kinds.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';

// R53 on screen: every pickup kind draws an icon of its own, and the HUD's power ring drains over the
// power's own time with the reserve beside it. Both against a context that records every call.
installCanvas();
const { drawIcon } = await import('../../src/ui/pickups-view.js');
const { drawHud } = await import('../../src/ui/hud.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

const TOP = -Math.PI / 2; // where a ring starts draining

function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : (...args) => { calls.push([k, ...args]); return sink; }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, calls };
}

test('every pickup kind draws an icon of its own, in the default set and in every world', () => {
  const kinds = [...POWERS, 'bomb', 'life'];
  for (const world of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
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
function hud(power, reserve) {
  const world = createWorld(levelById('w1-1'));
  Object.assign(world.ship, { power, reserve });
  const { ctx, calls } = recorder();
  drawHud(ctx, world, LOOKS[0], {}, 0);
  return {
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
