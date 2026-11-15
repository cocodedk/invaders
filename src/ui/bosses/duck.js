// The Dowager Duck (World 19, Rubber Regatta): a colossal rubber duck seen front-on, afloat in a ring of foam, the boss of the game's first comic
// world, in a frilly polka-dot shower cap, striped inflatable armbands on her stubby wings, a huge orange bill, long-lashed indignant eyes and orange
// feet paddling under the foam. Every piece is drawn to the hit boxes (duck-shape.js; in free flight a box rams). The hull (duck-hull.js) is the back
// of the foam ring, the wing tips, the plump body and the round head of moulded yellow rubber, the rouge and the eyes (duck-face.js) and the cap
// (duck-cap.js). The parts: the bobble, the cap's fluffy pompom (duck-bobble.js, armour, the only art that may slip under the HUD in her orbit), the
// bill (duck-bill.js), the armbands (duck-band.js, armour, painted as the left one and mirrored), the belly (duck-belly.js), the feet (duck-foot.js,
// painted as the left one and mirrored) and the squeaker underneath (duck-squeak.js). The rage layers are duck-rage.js (a coral flush as she springs
// a leak, a red glare once the valve goes). The live extras are duck-fx.js (the foam crest over her waist, the plaster on her tum from the hover on,
// bubbles, paddling, the leak's hiss, the let-go balloon's jet, and crossed eyes and stars when bonked), and the squash when bonked is the pose
// (duck-bonk.js; bosses/index.js applies it, art only). Her colours and helpers are duck-kit.js. Nothing but the bobble is drawn above y -179.
import { hull } from './duck-hull.js';
import { bobble } from './duck-bobble.js';
import { bill } from './duck-bill.js';
import { band } from './duck-band.js';
import { belly } from './duck-belly.js';
import { foot } from './duck-foot.js';
import { squeak } from './duck-squeak.js';
import { rage } from './duck-rage.js';
import { fx, warm } from './duck-fx.js';
import { pose } from './duck-bonk.js';

// Every painter leaves the context as it found it (line caps, widths, colours, alpha, blend mode).
const kept = (paint) => (b, l, ...rest) => {
  b.save();
  l.save();
  paint(b, l, ...rest);
  b.restore();
  l.restore();
};
const keptOne = (paint) => paint && ((g, S) => {
  g.save();
  paint(g, S);
  g.restore();
});

export default {
  pad: 92, // the foam hills at her sides reach x 476 (duck-shape.js EDGE), the flush round her about as far
  padY: 70, // the flush round her round bottom and the light of the jet reach y 250
  crack: '#fff0c8', // a split in the rubber shows its pale inside
  hull: kept(hull),
  parts: { bobble: kept(bobble), bill: kept(bill), band: kept(band), belly: kept(belly), foot: kept(foot), squeak: kept(squeak) },
  rage: rage.map(keptOne),
  margins: { bobble: 40, bill: 36, bandL: 26, bandR: 26, belly: 40, footL: 40, footR: 40, squeak: 32 },
  live: fx,
  warm,
  pose,
};
