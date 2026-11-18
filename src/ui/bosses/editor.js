// The Night Editor (World 20, Midnight Press): a colossal ink octopus seen front-on, a green celluloid eyeshade over two great eyes, the ink
// siphon under them, two thick arms curling out to its sides and a red pencil gripped low in each, its back arms hanging between them
// with smaller pencils of their own. Every piece is drawn to the hit boxes of its definition (bosses-data-7.js, read in editor-kit.js). The hull
// (editor-hull.js) is the mantle, the sockets, the eyeshade's strap and the back arms; the parts are the shade, the eyes and the siphon
// (editor-face.js) and the arms and the pencils (editor-limbs.js), the twins painted as the left one and mirrored. The rage layers:
// proofreading is calm; at the deadline ink bleeds out round it; to stop the press its eyes and pencils glare vermilion.
// The rage stays inside the hull canvas (pad round the boss's size). Nothing is painted per frame: every shape is baked.
import { shade, eye, siphon, SHADE_GLOW, SIPHON_GLOW } from './editor-face.js';
import { arm, pencil } from './editor-limbs.js';
import { hull } from './editor-hull.js';
import { PAL, PART, glow } from './editor-kit.js';

// Every painter leaves the context as it found it.
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

const RIM = [[0, -170], [150, -150], [200, -60], [190, 40], [120, 100], [0, 110], [-120, 100], [-190, 40], [-200, -60], [-150, -150]];

const rage = [
  null,
  (g) => { // the deadline: ink bleeding out all round it
    for (const [x, y] of RIM) glow(g, x, y, 70, PAL.skinL, 0.14);
    glow(g, PART.siphon.x, PART.siphon.y + 40, 110, PAL.red, 0.16);
  },
  (g) => { // stop the press: the eyes and the pencils glare
    for (const [x, y] of RIM) glow(g, x, y, 70, PAL.red, 0.12);
    for (const id of ['eyeL', 'eyeR', 'pencilL', 'pencilR']) glow(g, PART[id].x, PART[id].y, 90, PAL.red, 0.3);
    glow(g, PART.shade.x, PART.shade.y, 70, PAL.greenL, 0.14);
  },
];

export default {
  pad: 70, // the back arms' drips reach y 214, the rage's glare round the arms as far
  crack: PAL.paper, // a split shows the paper under the ink
  hull: kept(hull),
  parts: { shade: kept(shade), eye: kept(eye), siphon: kept(siphon), arm: kept(arm), pencil: kept(pencil) },
  rage: rage.map(keptOne),
  margins: { shade: SHADE_GLOW, eyeL: 30, eyeR: 30, armL: 40, armR: 40, siphon: SIPHON_GLOW, pencilL: 40, pencilR: 40 },
};
