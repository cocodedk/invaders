import { boss, weak, armor, atk, minion, phase } from './bosses-kit.js';

// The boss of world 19, Rubber Regatta. Like the other side-world bosses she never charges: she sways,
// hovers, then circles, resting high enough that every weak part stays below the HUD.

// The Dowager Duck, a colossal rubber duck seen front-on, afloat in a ring of foam: a frilly shower cap
// with a bobble, striped armbands on her stubby wings, a huge orange bill and orange feet paddling under
// the foam. A centre column of four (bobble, bill, belly, squeak) with the feet tucked inside the armbands.
// A ship under her eats the column from the bottom, so each phase also fires from a part play reaches late
// (the bobble, the feet). The armbands never fire: the ducklings (divers) come out from under them, three
// at a time on two lines a phase, and are the ammunition of the world's bat (bonk.js); the carrier is
// listed first and a burst is at most 3, so MINION_CAP never starves it. No fan, no laser, no homing,
// and no attack line is one of the ray's or the angler's.
const duck = boss('duck', 'The Dowager Duck', 330, { w: 780, h: 380 }, [
  armor('bobble', 0, -160, 96, 60, 8), // the cap's bobble: tops her, may slip under the HUD in the orbit
  weak('bill', 0, -80, 150, 80, 52),
  armor('bandL', -250, 6, 170, 110, 8), // the armbands: they never fire; the ducklings come out from under them
  armor('bandR', 250, 6, 170, 110, 8),
  weak('belly', 0, 34, 220, 110, 60), // a plaster on it from the hover on
  weak('footL', -180, 128, 110, 76, 30),
  weak('footR', 180, 128, 110, 76, 30),
  weak('squeak', 0, 140, 120, 66, 38), // the squeaker underneath
], [
  // Bath time: she quacks at the ship, the squeaker rings, her cap sheds a whirl of drops.
  phase(0.65, 'sway', [
    atk('aimed', 1.6, 'bill'),
    atk('ring', 3.1, 'squeak', { count: 12 }),
    atk('spiral', 3.7, 'bobble', { count: 10 }),
  ], { rate: 1.0, minions: [minion('carrier', 1, 4.5, 'bobble'), minion('diver', 3, 4.5, 'bandL'), minion('diver', 3, 5.5, 'bandR')] }),
  // Sprung a leak: the belly sprays a spiral, the cap shakes off a ring, a foot kicks up rain.
  phase(0.35, 'hover', [
    atk('aimed', 1.9, 'bill'),
    atk('spiral', 2.4, 'belly', { count: 16 }),
    atk('ring', 2.7, 'bobble', { count: 16 }),
    atk('rain', 2.6, 'footL', { count: 5, spread: 320 }),
  ], { rate: 1.1, minions: [minion('carrier', 1, 4.5, 'bobble'), minion('diver', 3, 4.5, 'bandL'), minion('diver', 3, 5.5, 'bandR')] }),
  // The valve goes and she whizzes round like a let-go balloon: both feet kick rain and the bobble whirls.
  phase(0, 'orbit', [
    atk('aimed', 1.6, 'bill'),
    atk('rain', 1.7, 'footL', { count: 6, spread: 360 }),
    atk('rain', 1.9, 'footR', { count: 6, spread: 360 }),
    atk('spiral', 2.2, 'bobble', { count: 18 }),
    atk('ring', 2.9, 'bobble', { count: 16 }),
  ], { rate: 1.6, minions: [minion('carrier', 1, 4.5, 'bobble'), minion('diver', 3, 4, 'bandL'), minion('diver', 3, 5, 'bandR')] }),
]);

export const BOSSES6 = [duck];
