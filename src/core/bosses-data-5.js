import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The bosses of world 16 on, the side-world boss of the Glass Cathedral. Like the other side-world
// bosses it never charges: it sways, hovers, then circles. It rests high enough that every part is
// below the HUD (R28), and ends no lower than the grimoire.

// The Vesper Moth, a colossal moth whose wings are stained-glass windows. The crown (its head and
// feathered antennae) tops it; the rose-window jewel of the thorax sits at its heart with the banded
// abdomen under it, and a stained-glass forewing stands out on each flank with an eyespot of the
// hindwing low beneath it, so shots from below always find a weak part. The eyespots take aim; the
// wings fan their light and drop glass scales (rain, falling); the abdomen breathes rings; the heart
// fires the laser in the last phase only, as the beam of dawn through the rose window; the wings send
// the divers. The mirror twin (world 16's power) doubles the ship's gun against it, and no maelstrom
// drinks its bolts, so it fires faster than the angler (rates 1.25, 1.25, 1.7; at 1.1, 1.1, 1.5 it was
// the easiest late boss for the bot). About the angler's weight and no lower than the grimoire:
// it rests at 260 with the crown's top at the HUD's edge (-158, where the antennae stop) and the heart
// low in the frame (top -60), so at the top of its orbit the heart and the eyespots are well clear of
// the HUD (R28). No two parts touch.
const moth = boss('moth', 'The Vesper Moth', 260, { w: 760, h: 340 }, [
  armor('crown', 0, -112, 200, 92, 8),
  weak('heart', 0, -10, 150, 100, 80),
  armor('wingL', -245, -58, 270, 156, 7),
  armor('wingR', 245, -58, 270, 156, 7),
  weak('spotL', -200, 82, 120, 106, 46),
  weak('spotR', 200, 82, 120, 106, 46),
  weak('tail', 0, 92, 130, 96, 40),
], [
  phase(0.65, 'sway', [
    atk('aimed', 4.6, 'spotL'),
    atk('aimed', 4.6, 'spotR'),
    atk('fan', 3.5, 'wingL', { count: 3, spread: 0.5 }),
    atk('fan', 3.6, 'wingR', { count: 3, spread: 0.5 }),
    atk('rain', 4.5, 'wingL', { count: 5, spread: 420 }),
  ], { rate: 1.25, minions: [minion('carrier', 1, 4.5, 'crown')] }),
  phase(0.3, 'hover', [
    atk('aimed', 4, 'spotL'),
    atk('aimed', 4, 'spotR'),
    atk('fan', 2.8, 'wingL', { count: 4, spread: 0.7 }),
    atk('fan', 2.8, 'wingR', { count: 4, spread: 0.7 }),
    atk('rain', 3.4, 'wingR', { count: 7, spread: 450 }),
    atk('ring', 5.6, 'tail', { count: 12 }),
  ], { rate: 1.25, minions: [minion('diver', 2, 10, 'wingL'), minion('carrier', 1, 4.5, 'crown')] }),
  phase(0, 'orbit', [
    atk('aimed', 4, 'spotL'),
    atk('aimed', 4, 'spotR'),
    atk('fan', 2.8, 'wingL', { count: 6, spread: 0.9 }),
    atk('fan', 3, 'wingR', { count: 5, spread: 0.8 }),
    atk('rain', 3.2, 'wingL', { count: 7, spread: 470 }),
    atk('ring', 5.2, 'tail', { count: 14 }),
    atk('laser', 6.4, 'heart'),
  ], { rate: 1.7, minions: [minion('diver', 3, 8.5, 'wingR'), minion('carrier', 1, 4.5, 'crown')] }),
]);

export const BOSSES5 = [moth];
