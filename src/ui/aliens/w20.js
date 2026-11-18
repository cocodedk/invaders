// World 20, Midnight Press: the invaders of the night printing hall are type come alive, in cream paper, ink black and one vermilion
// spot colour (palette: looks/w20.js). A fat lowercase e on ink legs (the Lowercase, w20-type.js), a tear of vermilion ink diving at the
// ship (the Ink Drop, w20-type.js), a block of wooden type with a pen nib for a gun (the Nib, w20-block.js), a heavy line of cast lead
// (the Slug, w20-block.js) and a newspaper folded into a hat over a tied bundle of sheets, the prize (the Late Edition, w20-paper.js);
// what they share (paper eyes, ink blots, set type, wet shine, the spot glowing) is w20-kit.js. The fleet keeps the press's slow beat.
// Nothing is painted per frame: every shape is baked.
import look from '../looks/w20.js';
import { tidy, PAPER } from './w20-kit.js';
import { grunt, diver } from './w20-type.js';
import { gunner, armored } from './w20-block.js';
import { carrier } from './w20-paper.js';

export default {
  rate: look.music.bpm / 60, // a beat of the press a frame
  sync: true,
  bob: 2,
  halo: 0.18,
  crack: PAPER, // a split shows the paper under the ink
  grunt: tidy(grunt),
  diver: tidy(diver),
  gunner: tidy(gunner),
  armored: tidy(armored),
  carrier: tidy(carrier),
};
