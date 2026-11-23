// The pickup capsule's rim in Wanderlight (pickup-skins.js FRAMES[22]): a band of parchment pencilled round the dark middle, with a
// thin line of the power's colour inside it, so the power still reads at a glance. Baked once into the 60 x 60 sprite (pickups-view.js),
// centred on the origin, nothing past a radius of 29. A frame only: the six standard powers keep their icons.
import { rgba } from './sprites.js';
import { disc, ring } from './pickup-kit.js';
import { PAL } from './wander-kit.js';

export function paper(g, color) {
  disc(g, 22);
  ring(g, 25, PAL.pencil, 8); // the band, outlined in pencil on both edges
  ring(g, 25, PAL.parchment, 5);
  ring(g, 21, rgba(color, 0.9), 2); // the power's own line inside the band
}
