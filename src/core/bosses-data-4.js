import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The boss of world 13, the side-world boss of the Sunset Armada. Like the other side-world bosses it
// never charges: it sways, hovers, then circles. It rests high enough that every part is below the
// HUD (R28), and ends no lower than the grimoire.

// The Thunder Galleon, a dreadnought airship of brass and patched sail. The mast (mainmast and
// crow's nest) stands over the deck; the lit bridge sits at the centre and the furnace-keel hangs
// under it, with a gun deck low at each side, so shots from below always find a weak part. A
// propeller pod stands out on each flank. The bridge shoots aimed bolts and, in the last phase, the
// laser; the gun decks fire fans; the mast drops rain (shells); the keel breathes rings; the pods
// send the divers (the gliders of the armada). About the Agent core's weight: it rests at 260 with
// the bridge's glass low in the frame (top -55), so at the top of its orbit the face is well clear
// of the HUD (R28), and the gun decks and the keel end no lower than the grimoire's quills.
const galleon = boss('galleon', 'Thunder Galleon', 260, { w: 700, h: 340 }, [
  armor('mast', 0, -114, 90, 92, 8),
  weak('bridge', 0, -20, 160, 90, 84),
  armor('propL', -265, -45, 120, 130, 7),
  armor('propR', 265, -45, 120, 130, 7),
  weak('gunL', -190, 85, 110, 80, 46),
  weak('gunR', 190, 85, 110, 80, 46),
  weak('keel', 0, 95, 140, 90, 38),
], [
  phase(0.65, 'sway', [
    atk('aimed', 2.2, 'bridge'),
    atk('fan', 3.4, 'gunL', { count: 3, spread: 0.5 }),
    atk('fan', 3.4, 'gunR', { count: 3, spread: 0.5 }),
    atk('rain', 4.4, 'mast', { count: 5, spread: 400 }),
  ], { rate: 1, minions: [minion('carrier', 1, 4.5, 'mast')] }),
  phase(0.3, 'hover', [
    atk('aimed', 2, 'bridge'),
    atk('fan', 3, 'gunL', { count: 3, spread: 0.6 }),
    atk('fan', 3, 'gunR', { count: 3, spread: 0.6 }),
    atk('rain', 3.6, 'mast', { count: 6, spread: 440 }),
    atk('ring', 5.6, 'keel', { count: 12 }),
  ], { rate: 1, minions: [minion('diver', 2, 10, 'propL'), minion('carrier', 1, 4.5, 'mast')] }),
  phase(0, 'orbit', [
    atk('aimed', 2, 'bridge'),
    atk('fan', 3, 'gunL', { count: 5, spread: 0.8 }),
    atk('fan', 3.4, 'gunR', { count: 4, spread: 0.7 }),
    atk('rain', 3.4, 'mast', { count: 6, spread: 460 }),
    atk('ring', 5.2, 'keel', { count: 14 }),
    atk('laser', 6.4, 'bridge'),
  ], { rate: 1.15, minions: [minion('diver', 3, 8.5, 'propR'), minion('carrier', 1, 4.5, 'mast')] }),
]);

export const BOSSES4 = [galleon];
