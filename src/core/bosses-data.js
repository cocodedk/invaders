import { boss, weak, armor, hull, atk, minion, phase } from './bosses-kit.js';
import { BOSSES2 } from './bosses-data-2.js';

// The first four bosses (worlds 1-4); bosses-data-2.js holds the other four. Each is built from its
// world's look: parts are where the picture needs them, the attack mix is what the world shoots.
// Layouts keep every weak part open from below, so a ship can always get a clear column to it.

const mothership = boss('mothership', 'Mothership', 240, { w: 640, h: 220 }, [
  armor('dome', 0, -60, 240, 80, 8),
  armor('wingL', -240, 10, 150, 70, 6),
  armor('wingR', 240, 10, 150, 70, 6),
  weak('gunL', -110, 50, 80, 60, 20),
  weak('gunR', 110, 50, 80, 60, 20),
  weak('eye', 0, 70, 90, 70, 30),
], [
  phase(0.65, 'sway', [
    atk('aimed', 2.2, 'eye'),
    atk('fan', 4.2, 'gunL', { count: 3, spread: 0.6 }),
    atk('fan', 4.2, 'gunR', { count: 3, spread: 0.6 }),
  ]),
  phase(0.3, 'sway', [
    atk('fan', 3.2, 'eye', { count: 5, spread: 0.9 }),
    atk('ring', 6, 'eye', { count: 12 }),
    atk('aimed', 2.6, 'gunL'),
    atk('aimed', 2.6, 'gunR'),
  ], { rate: 1.2, minions: [minion('grunt', 3, 10, 'eye')] }),
  phase(0, 'charge', [
    atk('ring', 4.5, 'eye', { count: 16, speed: 0.8 }),
    atk('fan', 3, 'gunL', { count: 5, spread: 0.8 }),
    atk('fan', 3, 'gunR', { count: 5, spread: 0.8 }),
    atk('laser', 8, 'eye'),
  ], { rate: 1.4, minions: [minion('grunt', 3, 9, 'eye'), minion('carrier', 1, 16, 'dome')] }),
]);

const pyramid = boss('pyramid', 'Corporate pyramid', 250, { w: 560, h: 300 }, [
  weak('spire', 0, -105, 60, 60, 16),
  armor('cap', 0, -55, 170, 50, 6),
  armor('mid', 0, 0, 300, 56, 8),
  armor('base', 0, 60, 440, 56, 8),
  weak('eye', 0, 105, 80, 44, 28),
  weak('signL', -150, 100, 90, 40, 14),
  weak('signR', 150, 100, 90, 40, 14),
], [
  phase(0.6, 'hover', [
    atk('rain', 3.2, 'base', { count: 6, spread: 460 }),
    atk('fan', 3.6, 'eye', { count: 3, spread: 0.5 }),
  ]),
  phase(0.25, 'sway', [
    atk('rain', 3, 'base', { count: 8, spread: 520 }),
    atk('homing', 3.4, 'signL'),
    atk('homing', 3.4, 'signR'),
    atk('laser', 8, 'eye'),
  ], { rate: 1.1, minions: [minion('gunner', 2, 12, 'signL')] }),
  phase(0, 'orbit', [
    atk('rain', 2.6, 'base', { count: 9, spread: 560 }),
    atk('spiral', 4.8, 'spire', { count: 14 }),
    atk('fan', 3, 'eye', { count: 5, spread: 0.9 }),
    atk('laser', 7, 'signR'),
  ], { rate: 1.2, minions: [minion('gunner', 2, 10, 'signR'), minion('carrier', 1, 18, 'cap')] }),
]);

// The trench: in the last phase the core, a bare hull until then, takes full damage.
const fortress = boss('fortress', 'Star fortress', 235, { w: 760, h: 280 }, [
  armor('dish', -190, -70, 160, 120, 8),
  armor('plateL', -120, 40, 150, 110, 6),
  armor('plateR', 120, 40, 150, 110, 6),
  weak('turretL', -250, 70, 90, 60, 24),
  weak('turretR', 250, 70, 90, 60, 24),
  hull('core', 0, 60, 70, 90, 40),
], [
  phase(0.7, 'sway', [
    atk('aimed', 2.2, 'turretL'),
    atk('aimed', 2.2, 'turretR'),
    atk('fan', 5, 'dish', { count: 3, spread: 0.5 }),
  ], { rate: 0.8 }),
  phase(0.4, 'hover', [
    atk('laser', 6.5, 'dish'),
    atk('fan', 3.4, 'turretL', { count: 3, spread: 0.6 }),
    atk('fan', 3.4, 'turretR', { count: 3, spread: 0.6 }),
  ], { minions: [minion('diver', 3, 9, 'plateR')] }),
  phase(0, 'charge', [
    atk('ring', 3.8, 'core', { count: 14 }),
    atk('rain', 4.4, 'core', { count: 7, spread: 420 }),
    atk('laser', 7, 'dish'),
  ], { open: ['core'], minions: [minion('carrier', 1, 18, 'plateL')] }),
]);

const shogun = boss('shogun', 'Shogun mecha', 280, { w: 600, h: 440 }, [
  armor('helm', 0, -170, 120, 90, 6),
  armor('torso', 0, -40, 200, 150, 10),
  armor('pauldronL', -160, -70, 110, 110, 6),
  armor('pauldronR', 160, -70, 110, 110, 6),
  weak('core', 0, 70, 90, 90, 36),
  armor('legL', -130, 130, 90, 170, 6),
  armor('legR', 130, 130, 90, 170, 6),
  weak('bladeL', -270, 60, 40, 230, 18),
  weak('bladeR', 270, 60, 40, 230, 18),
], [
  phase(0.6, 'sway', [
    atk('shuriken', 2.4, 'bladeL'),
    atk('shuriken', 2.4, 'bladeR'),
    atk('shuriken', 3.6, 'helm'),
  ], { rate: 0.9 }),
  phase(0.28, 'charge', [
    atk('shuriken', 2, 'bladeL'),
    atk('shuriken', 2, 'bladeR'),
    atk('shuriken', 2.8, 'core'),
    atk('fan', 4.5, 'core', { count: 5, spread: 1 }),
  ]),
  phase(0, 'orbit', [
    atk('laser', 6, 'bladeL'),
    atk('laser', 7, 'bladeR'),
    atk('shuriken', 1.9, 'helm'),
    atk('shuriken', 2.2, 'core'),
    atk('spiral', 5, 'core', { count: 16 }),
  ], { rate: 1.15, minions: [minion('carrier', 1, 20, 'torso')] }),
]);

export const BOSS_DEFS = [mothership, pyramid, fortress, shogun, ...BOSSES2];

const BY_KIND = new Map(BOSS_DEFS.map((d) => [d.kind, d]));

// The static definition of a boss kind (the world keeps only the kind and the live part state).
export const bossDef = (kind) => BY_KIND.get(kind);
