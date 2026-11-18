// The Ten-Crowned King (World 21, Golden Isle): a colossal king enthroned in the air, seen front-on, ten crowned heads fanned over his
// shoulders, the great one roaring at the centre and one above it, twenty arms fanned out to his sides with a weapon in every hand, a
// gilded breastplate over his heart. Every piece is drawn to the hit boxes of its definition (bosses-data-8.js, read in crowns-kit.js).
// The hull (crowns-hull.js) is the throne, the body, the necks and the upper arms; the parts are the heads, each a stump once it falls
// and whole again when it grows back (crowns-head.js), the arm fans (crowns-arms.js, the left painted and mirrored) and the breastplate
// and the heart (crowns-breast.js), the heart laid bare when the last phase opens it. The rage layers: the court of war is calm; when
// the heads grow back angrier every crown burns crimson; when the heart is bare fire climbs round the throne and the heads glare.
// The rage stays inside the hull canvas (pad round the boss's size). Nothing is painted per frame: every shape is baked.
import { head, stump } from './crowns-head.js';
import { arms } from './crowns-arms.js';
import { breast, heart, heartOpen } from './crowns-breast.js';
import { hull } from './crowns-hull.js';
import { PAL, PART, HEADS, glow } from './crowns-kit.js';

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
const each = (paint) => Object.fromEntries(HEADS.map((id) => [id, kept(paint)]));

const rage = [
  null,
  (g) => { // the heads grow back angrier: every crown burns
    for (const id of HEADS) glow(g, PART[id].x, PART[id].y - PART[id].h * 0.3, PART[id].w * 0.9, PAL.red, 0.2);
    for (const s of [-1, 1]) glow(g, s * PART.armsR.x, PART.armsR.y, 120, PAL.ember, 0.12);
  },
  (g) => { // the heart is bare: fire climbs round the throne, the heads glare
    for (let i = 0; i < 9; i++) glow(g, (i - 4) * 60, 180 - Math.abs(i - 4) * 14, 90, PAL.ember, 0.18);
    for (const id of HEADS) glow(g, PART[id].x, PART[id].y, PART[id].w * 1.1, PAL.red, 0.26);
    glow(g, PART.heart.x, PART.heart.y, 150, PAL.red, 0.3);
    for (const s of [-1, 1]) glow(g, s * PART.armsR.x, PART.armsR.y, 120, PAL.red, 0.16);
  },
];

export default {
  pad: 60, // the fire under the seat reaches y 230 and the rage's glow round the outer heads as far
  crack: PAL.red, // a split shows the fire under the gold
  hull: kept(hull),
  parts: { ...each(head), arms: kept(arms), breast: kept(breast), heart: kept(heart) },
  fallen: each(stump),
  opened: { heart: kept(heartOpen) },
  rage: rage.map(keptOne),
  margins: { ...Object.fromEntries(HEADS.map((id) => [id, 30])), headT: 34, head: 44, armsL: 120, armsR: 120, breast: 20, heart: 28 },
};
