import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES } from '../../src/core/kinds.js';
import { bossDef } from '../../src/core/bosses-data.js';
import { ofType } from './world-kit.js';
import { botFight } from './boss-kit.js';

// The bar every boss has to clear: a bot that stands under the nearest weak part and never stops
// firing, with a ship that cannot be hurt, wins inside 120 simulated seconds. Task 6's autopilot
// builds on the same promise.
for (const kind of BOSSES) {
  test(`the ${bossDef(kind).name} loses to a bot that just stands under it and fires`, () => {
    const { world, log } = botFight(kind);
    assert.equal(world.state, 'cleared', `${kind} still standing at ${world.t.toFixed(1)} s, hp ${world.boss.hp}`);
    assert.ok(world.t < 120, `took ${world.t.toFixed(1)} s`);
    const phases = ofType(log, 'bossPhase').map((e) => e.phase);
    assert.deepEqual(phases, bossDef(kind).phases.slice(1).map((_, i) => i + 1), 'every phase, once, in order');
    assert.equal(ofType(log, 'bossDeath').length, 1);
    assert.equal(ofType(log, 'cleared').length, 1);
    const last = log.findIndex((e) => e.type === 'bossDeath');
    assert.ok(log.slice(last).some((e) => e.type === 'explode' && e.size === 3), 'the finale');
    assert.ok(world.score >= 10000);
  });
}
