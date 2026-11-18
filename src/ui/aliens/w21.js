// World 21, Golden Isle: the invaders are the demon king's host, painted like a masked dance-drama in gold leaf, vermilion, deep green
// and black (palette: looks/w21.js). A masked foot soldier under a tiered crown with a spear (the Masked Soldier, w21-host.js), a
// shimmering golden deer of illusion leaping at the ship (the Golden Deer, w21-deer.js), a fanged archer with a curved bow (the Demon
// Archer, w21-host.js), a towering mace-bearing giant in gilded plate (the Gilded Giant, w21-giant.js) and a small flying chariot of the
// host with a lamp burning inside, the prize (the Chariot, w21-giant.js); what they share (masks, crowns, gold leaf, petals, woven
// borders) is w21-kit.js. The host moves to the drums. Nothing is painted per frame: every shape is baked.
import look from '../looks/w21.js';
import { tidy, GOLD } from './w21-kit.js';
import { grunt, gunner } from './w21-host.js';
import { diver } from './w21-deer.js';
import { armored, carrier } from './w21-giant.js';

export default {
  rate: look.music.bpm / 60, // a frame a beat of the drums
  sync: true,
  bob: 3,
  halo: 0.22,
  crack: GOLD, // a split shows the gold under the lacquer
  grunt: tidy(grunt),
  diver: tidy(diver),
  gunner: tidy(gunner),
  armored: tidy(armored),
  carrier: tidy(carrier),
};
