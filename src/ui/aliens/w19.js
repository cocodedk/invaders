// World 19, Rubber Regatta: the invaders of a sunlit bathhouse at toy scale are bath toys, moulded rubber, soap, sea sponge and folded
// paper (palette: looks/w19.js). A rubber duckling (the Squeakling, w19-duck.js), a bar of pink soap squirting out as if squeezed (the
// Slipper, w19-soap.js), a lime rubber squirt frog that puffs its cheeks (the Squirt Frog, w19-frog.js), a fat sea sponge (the Sponge,
// w19-sponge.js) and a boat folded from ruled paper with the prize crate on deck (the Paper Boat, w19-boat.js); what they share (glossy
// rubber, cartoon eyes, suds, bubbles, beads of water) is w19-kit.js. The whole fleet bobs in step with the music's beat. Each role also
// has its knocked-out drawing in dizzy (w19-*-dizzy.js): one context, the colour, the toy gone round and cross-eyed, baked by
// bodies-view.js into the dizzy and flying bodies of the bonk rule. Nothing is painted per frame: every shape is baked.
import look from '../looks/w19.js';
import { tidy } from './w19-kit.js';
import { grunt } from './w19-duck.js';
import { diver as slipper, SIZE } from './w19-soap.js';
import { gunner } from './w19-frog.js';
import { armored } from './w19-sponge.js';
import { carrier } from './w19-boat.js';
import { dizzyDuck } from './w19-duck-dizzy.js';
import { dizzySoap } from './w19-soap-dizzy.js';
import { dizzyFrog } from './w19-frog-dizzy.js';
import { dizzySponge } from './w19-sponge-dizzy.js';
import { dizzyBoat } from './w19-boat-dizzy.js';

const diver = tidy(slipper);
diver.size = SIZE;
const keep = (paint) => (g, c) => {
  g.save();
  paint(g, c);
  g.restore();
};

export default {
  rate: look.music.bpm / 60, // a beat of the music a frame: the fleet bobs, squeaks and puffs in time
  sync: true,
  bob: 3,
  halo: 0.2,
  crack: '#fff1c4', // a tear in rubber or sponge shows the pale foam inside
  grunt: tidy(grunt),
  diver,
  gunner: tidy(gunner),
  armored: tidy(armored),
  carrier: tidy(carrier),
  dizzy: { grunt: keep(dizzyDuck), diver: keep(dizzySoap), gunner: keep(dizzyFrog), armored: keep(dizzySponge), carrier: keep(dizzyBoat) },
};
