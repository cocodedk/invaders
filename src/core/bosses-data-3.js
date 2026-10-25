import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The bosses of worlds 9 and 10, both breather bosses that never charge: they sway, hover, then circle.
// Both rest high enough that every part is below the HUD (R28), and the Count no lower than the behemoth.

// The boss of world 9: the Abyssal behemoth, a sea beast rising out of the harbour. Its maw breathes
// the laser, its gills fan out spray, its crest rains, and its claws send the divers.

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

// The boss of world 10: the Crimson Count, a vampire lord whose black cape spreads like wings. The
// collar and the head stand over the cape; the heart-amulet hangs at the centre, bottom, and the
// clawed hands at the cape's lower corners, so shots from below always find a weak part. His eyes
// shoot aimed bolts, his claws fan, his heart breathes rings and spirals, and the cape's wings loose
// homing bats and send the divers (the bat swarm of the last phase). A bit gentler than the behemoth:
// no laser, no rain, about the shogun's pace. He rests at 270, not 250, so at the top of his orbit
// the collar and face stay clear of the HUD (as the shogun's helmet does, R28).
const count = boss('count', 'Crimson Count', 270, { w: 700, h: 340 }, [
  armor('collar', 0, -120, 240, 60, 8),
  armor('head', 0, -70, 120, 100, 10),
  armor('wingL', -215, -20, 270, 240, 8),
  armor('wingR', 215, -20, 270, 240, 8),
  weak('heart', 0, 65, 100, 100, 86),
  weak('clawL', -300, 85, 80, 110, 34),
  weak('clawR', 300, 85, 80, 110, 34),
], [
  phase(0.65, 'sway', [
    atk('aimed', 2.6, 'head'),
    atk('fan', 4.2, 'clawL', { count: 3, spread: 0.5 }),
    atk('fan', 4.2, 'clawR', { count: 3, spread: 0.5 }),
  ], { rate: 0.9, minions: [minion('carrier', 1, 4.5, 'collar')] }),
  phase(0.3, 'hover', [
    atk('aimed', 2.8, 'head'),
    atk('ring', 5.4, 'heart', { count: 12 }),
    atk('homing', 4.4, 'wingL'),
    atk('fan', 3.6, 'clawR', { count: 4, spread: 0.6 }),
  ], { minions: [minion('diver', 2, 10, 'wingL'), minion('carrier', 1, 4.5, 'collar')] }),
  phase(0, 'orbit', [
    atk('aimed', 2.6, 'head'),
    atk('spiral', 5, 'heart', { count: 14 }),
    atk('homing', 3.8, 'wingR'),
    atk('fan', 3.4, 'clawL', { count: 4, spread: 0.6 }),
    atk('ring', 6, 'heart', { count: 12 }),
  ], { minions: [minion('diver', 3, 9, 'wingR'), minion('carrier', 1, 4.5, 'collar')] }),
]);

export const BOSSES3 = [behemoth, count];
