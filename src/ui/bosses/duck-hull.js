// The Dowager Duck's hull (World 19, Rubber Regatta; see duck.js): everything of her that is not a part. On the body layer, back to front: the
// back of the ring of foam (duck-foam.js), heaped into hills at her sides; the tips of her stubby wings, poking out of the armbands; the plump
// yellow body and, on it, the round head, both moulded rubber with an INK outline, beaded with bathwater (DROPS); the rouge (duck-face.js), the
// shower cap (duck-cap.js), framing her face like a bonnet, and the eyes under its ruffle. The lights layer is the rubber's sheen: a broad soft gloss on the head and the body, lit from the upper left, a rim of light the
// foam throws up under her, and the cap's. The parts (the bobble, the bill, the armbands, the belly, the feet and the squeaker) are painted over
// this by the boss cache. Boss coordinates; nothing above y = TOP (the cap's crown is held under it).
import { PAL, rubber, shine, drop, rgba, path, line, inked } from './duck-kit.js';
import { HEAD, BODY, WING, FOAM_BACK, supPts } from './duck-shape.js';
import { foam } from './duck-foam.js';
import { eyes, cheeks } from './duck-face.js';
import { cap } from './duck-cap.js';

const DROPS = [[-124, -30, 6], [-150, -42, 4], [-136, -14, 3], [134, -26, 5.4], [156, -44, 3.6], [-92, 130, 5], [98, 142, 4]]; // bathwater beading on her

// A wing's tip: a yellow stub with three feathers notched into its outer end (the left; the right mirrored).
function wing(b, s) {
  b.save();
  b.scale(s, 1);
  const pts = supPts(WING, 48);
  rubber(b, pts, PAL.yellow, { lw: 4.5, lx: 0.2 });
  for (const dy of [-16, 16]) {
    path(b, [[WING.x - WING.a + 2, WING.y + dy], [WING.x - WING.a + 22, WING.y + dy * 0.7]], true);
    line(b, PAL.yellowDD, 3.4);
  }
  b.restore();
}

export function hull(b, l) {
  b.save();
  foam(b, FOAM_BACK, 7);
  wing(b, 1);
  wing(b, -1);
  rubber(b, supPts(BODY), PAL.yellow, { lw: 5, dark: PAL.yellowDD });
  rubber(b, supPts(HEAD), PAL.yellow, { lw: 5, dark: PAL.yellowD });
  path(b, supPts(HEAD).filter(([, y]) => y > HEAD.y + 40), true); // the chin's soft shade on the chest
  line(b, rgba(PAL.yellowDD, 0.35), 9);
  path(b, supPts(HEAD).filter(([, y]) => y > HEAD.y + 40), true);
  inked(b, 5);
  cheeks(b);
  for (const [x, y, r] of DROPS) drop(b, x, y, r, PAL.yellow);
  b.restore();
  cap(b, l);
  eyes(b); // over the cap's ruffle: the lashes sweep out across it
  shine(l, -70, -120, 70, 30, 0.42, -0.3);
  shine(l, -120, -6, 90, 46, 0.36, -0.5);
  shine(l, 150, 70, 34, 60, 0.16, 0.4);
  shine(l, 0, 166, 150, 10, 0.22);
}
