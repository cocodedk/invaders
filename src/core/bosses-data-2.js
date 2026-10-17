import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The bosses of worlds 5-8: the Hive queen, the Agent core, the Endoskeleton titan, the Singularity.

const queen = boss('queen', 'Hive queen', 255, { w: 660, h: 360 }, [
  armor('crown', 0, -130, 200, 80, 6),
  armor('thorax', 0, -40, 260, 110, 8),
  weak('head', 0, 80, 130, 110, 34),
  weak('sacL', -200, 20, 110, 100, 18),
  weak('sacR', 200, 20, 110, 100, 18),
  armor('clawL', -290, 80, 70, 150, 6),
  armor('clawR', 290, 80, 70, 150, 6),
], [
  phase(0.65, 'hover', [
    atk('homing', 3, 'head'),
    atk('spiral', 5, 'sacL', { count: 12 }),
    atk('spiral', 5, 'sacR', { count: 12 }),
  ], { minions: [minion('diver', 2, 11, 'sacL')] }),
  phase(0.3, 'sway', [
    atk('ring', 5, 'head', { count: 14 }),
    atk('homing', 2.4, 'head'),
    atk('homing', 4, 'sacL'),
    atk('homing', 4, 'sacR'),
  ], { rate: 1.2, minions: [minion('diver', 3, 8, 'sacR')] }),
  phase(0, 'charge', [
    atk('spiral', 4.2, 'head', { count: 20 }),
    atk('rain', 3.2, 'crown', { count: 8, spread: 520 }),
    atk('homing', 2.2, 'head'),
  ], { rate: 1.4, minions: [minion('diver', 4, 6.5, 'sacL'), minion('carrier', 1, 18, 'crown')] }),
]);

const agent = boss('agent', 'Agent core', 250, { w: 560, h: 340 }, [
  armor('halo', 0, -120, 400, 40, 6),
  armor('nodeL', -220, -40, 80, 80, 6),
  armor('nodeR', 220, -40, 80, 80, 6),
  weak('core', 0, 10, 130, 130, 32),
  weak('lensL', -140, 80, 70, 60, 16),
  weak('lensR', 140, 80, 70, 60, 16),
], [
  phase(0.6, 'hover', [
    atk('fan', 1.9, 'core', { count: 3, spread: 0.2 }),
    atk('rain', 3.6, 'halo', { count: 7, spread: 520 }),
  ]),
  phase(0.3, 'orbit', [
    atk('fan', 1.7, 'core', { count: 3, spread: 0.25 }),
    atk('laser', 6.5, 'lensL'),
    atk('laser', 7.5, 'lensR'),
    atk('rain', 3.2, 'halo', { count: 9, spread: 560 }),
  ], { rate: 1.1, minions: [minion('gunner', 2, 11, 'nodeL')] }),
  phase(0, 'sway', [
    atk('ring', 3.6, 'core', { count: 16 }),
    atk('fan', 1.6, 'core', { count: 5, spread: 0.3 }),
    atk('rain', 2.8, 'halo', { count: 10, spread: 600 }),
    atk('laser', 6, 'lensL'),
  ], { rate: 1.5, minions: [minion('gunner', 2, 9, 'nodeR'), minion('carrier', 1, 18, 'halo')] }),
]);

const titan = boss('titan', 'Endoskeleton titan', 275, { w: 620, h: 460 }, [
  armor('shoulders', 0, -150, 560, 60, 8),
  weak('skull', 0, -50, 120, 110, 34),
  armor('ribL', -100, 40, 60, 150, 6),
  armor('ribR', 100, 40, 60, 150, 6),
  armor('armL', -230, 20, 70, 280, 8),
  armor('armR', 230, 20, 70, 280, 8),
  weak('cannonL', -230, 175, 90, 60, 18),
  weak('cannonR', 230, 175, 90, 60, 18),
], [
  phase(0.65, 'sway', [
    atk('fan', 2.4, 'cannonL', { count: 2, spread: 0.3 }),
    atk('fan', 2.4, 'cannonR', { count: 2, spread: 0.3 }),
    atk('aimed', 2, 'skull'),
  ], { rate: 0.9 }),
  phase(0.3, 'hover', [
    atk('homing', 2.8, 'skull'),
    atk('spiral', 5, 'skull', { count: 16 }),
    atk('laser', 7, 'skull'),
    atk('fan', 3, 'cannonL', { count: 4, spread: 0.7 }),
    atk('fan', 3, 'cannonR', { count: 4, spread: 0.7 }),
  ], { minions: [minion('gunner', 2, 12, 'shoulders')] }),
  phase(0, 'charge', [
    atk('ring', 3.8, 'skull', { count: 18 }),
    atk('rain', 3, 'shoulders', { count: 9, spread: 540 }),
    atk('laser', 6, 'cannonL'),
    atk('laser', 6.8, 'cannonR'),
    atk('fan', 2.6, 'skull', { count: 5, spread: 0.9 }),
  ], { rate: 1.3, minions: [minion('gunner', 3, 10, 'shoulders'), minion('carrier', 1, 18, 'shoulders')] }),
]);

// The well of this world's twist sits at (960, 300), just under the boss's resting place.
const singularity = boss('singularity', 'The Singularity', 235, { w: 700, h: 380 }, [
  armor('jetN', 0, -130, 50, 110, 6),
  weak('core', 0, 10, 120, 120, 56),
  armor('diskL', -190, 20, 230, 34, 8),
  armor('diskR', 190, 20, 230, 34, 8),
  weak('jet', 0, 120, 50, 110, 26),
  weak('moonL', -290, 70, 70, 70, 16),
  weak('moonR', 290, 70, 70, 70, 16),
], [
  phase(0.66, 'hover', [
    atk('spiral', 4.6, 'moonL', { count: 12 }),
    atk('spiral', 4.6, 'moonR', { count: 12 }),
    atk('aimed', 2, 'jet'),
  ]),
  phase(0.33, 'orbit', [
    atk('laser', 6.5, 'moonL'),
    atk('laser', 7.5, 'moonR'),
    atk('fan', 2.6, 'jet', { count: 5, spread: 0.7 }),
    atk('ring', 5, 'diskL', { count: 14 }),
    atk('ring', 5.4, 'diskR', { count: 14 }),
  ], { rate: 1.1, minions: [minion('diver', 2, 10, 'diskL')] }),
  phase(0, 'charge', [
    atk('rain', 2.8, 'diskL', { count: 8, spread: 400 }),
    atk('rain', 2.8, 'diskR', { count: 8, spread: 400 }),
    atk('spiral', 4, 'jet', { count: 20 }),
    atk('homing', 2.4, 'jet'),
    atk('laser', 6, 'moonL'),
  ], { rate: 1.4, minions: [minion('diver', 3, 8, 'diskR'), minion('carrier', 1, 18, 'diskL')] }),
]);

export const BOSSES2 = [queen, agent, titan, singularity];
