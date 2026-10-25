import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The stream of bubbles that falls into the maelstrom of Lantern Deep (flourish-maelstrom.js flowAt): each on its own
// lap and lag, a pure function of time. The rest of the maelstrom is maelstrom.test.js.
installCanvas(64);
const { FLOW, flowAt } = await import('../../src/ui/flourish-maelstrom.js');
const { WELL } = await import('../../src/core/kinds.js');
const { LIP } = await import('../../src/fx/react-maelstrom.js');
const { TAU } = await import('../../src/core/math.js');

// Bubble b at the moment its lap is u (0..1).
const at = (b, u, c = WELL) => flowAt(b, ((((u - b.phase) % 1) + 1) % 1) * b.period, c);

test('every bubble starts its lap at the rim, unseen, and falls to the lip clockwise, quickening, shrinking, brightening, and is gone as it reaches it', () => {
  assert.ok(new Set(FLOW.map((b) => b.phase.toFixed(3))).size === FLOW.length, 'each starts at a different point of its lap');
  assert.ok(new Set(FLOW.map((b) => b.period.toFixed(2))).size > FLOW.length / 2, 'and on its own lag');
  for (const b of FLOW) {
    const first = { ...at(b, 0.01) };
    const last = { ...at(b, 0.999) };
    assert.ok(first.r > 225 && first.r <= 232 && first.alpha < 0.1, `rim, unseen: ${first.r.toFixed(0)}, ${first.alpha.toFixed(2)}`);
    assert.ok(last.r >= LIP && last.r < LIP + 1 && last.alpha < 0.05, `the lip, gone: ${last.r.toFixed(1)}, ${last.alpha.toFixed(3)}`);
    assert.ok(last.d < first.d * 0.45, 'smaller');
    assert.ok(at(b, 0.9).alpha > at(b, 0.5).alpha && at(b, 0.5).alpha > at(b, 0.2).alpha, 'brighter as it nears the lip');
    const [r0, r1, r2, r3] = [0, 1 / 3, 2 / 3, 1].map((u) => at(b, Math.min(0.9999, u)).r);
    assert.ok(r0 - r1 < r2 - r3, 'it gains speed');
    let prev = null;
    for (let u = 0.01; u < 1; u += 0.01) {
      const w = { ...at(b, u) };
      assert.ok(w.r >= LIP - 1e-9 && w.r <= 232 && Number.isFinite(w.x) && Number.isFinite(w.y), 'on the whirl');
      if (prev) {
        assert.ok(w.r <= prev.r && w.d <= prev.d, 'it only falls and shrinks');
        const da = Math.atan2(w.y - WELL.y, w.x - WELL.x) - Math.atan2(prev.y - WELL.y, prev.x - WELL.x);
        assert.ok(da - Math.round(da / TAU) * TAU >= 0, 'and turns clockwise (y is down)');
      }
      prev = w;
    }
  }
});
