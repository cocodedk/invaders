import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The boss of world 9: the Abyssal behemoth, a sea beast rising out of the harbour. Its maw breathes
// the laser, its gills fan out spray, its crest rains. It never charges: it sways, hovers, then
// circles, and its claws send the divers.

const behemoth = boss('behemoth', 'Abyssal behemoth', 255, { w: 640, h: 330 }, [
  armor('crest', 0, -120, 240, 60, 8),
  armor('skull', 0, -45, 200, 110, 10),
  weak('maw', 0, 55, 120, 70, 80),
  weak('gillL', -170, 0, 80, 90, 44),
  weak('gillR', 170, 0, 80, 90, 44),
  armor('clawL', -270, 70, 100, 140, 6),
  armor('clawR', 270, 70, 100, 140, 6),
], [
  phase(0.65, 'sway', [
    atk('aimed', 2.4, 'maw'),
    atk('fan', 4, 'gillL', { count: 3, spread: 0.5 }),
    atk('fan', 4, 'gillR', { count: 3, spread: 0.5 }),
  ], { rate: 0.9, minions: [minion('carrier', 1, 4.5, 'crest')] }),
  phase(0.3, 'hover', [
    atk('rain', 3.4, 'crest', { count: 6, spread: 420 }),
    atk('laser', 7, 'maw'),
    atk('fan', 3, 'gillL', { count: 4, spread: 0.6 }),
    atk('fan', 3, 'gillR', { count: 4, spread: 0.6 }),
  ], { minions: [minion('diver', 2, 10, 'clawL'), minion('carrier', 1, 4.5, 'crest')] }),
  phase(0, 'orbit', [
    atk('ring', 4.4, 'maw', { count: 14 }),
    atk('laser', 7.5, 'maw'),
    atk('rain', 3.2, 'crest', { count: 7, spread: 480 }),
  ], { rate: 1.1, minions: [minion('diver', 3, 9, 'clawR'), minion('carrier', 1, 4.5, 'crest')] }),
]);

export const BOSSES3 = [behemoth];
