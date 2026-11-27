// World 22's Smudge (Leg 2): the hang craft that lets a curtain fall, a grey charcoal blob smeared on the parchment with one eye. The eye is
// shut while it rests and open (a pale lid, a violet pupil) from CURTAIN_WIND before each curtain until it falls, so the player sees it
// look. Two painters, 'smudge' and 'smudgeOpen', baked as roles (bake.js) and picked per craft by smudgeRole. Plain colours, as the kites.
import { path, circle, ellipse } from './kit.js';
import { tidy } from './w16-kit.js';
import { PAL } from '../wander-kit.js';
import { HANG_ARRIVE, CURTAIN_WIND } from '../../core/course-air.js';

export const SMUDGE_ROLES = ['smudge', 'smudgeOpen'];
const SIZE = 128; // px, a sprite canvas's edge
const BLOB = { r: 36, lumps: 9, lump: 6, drips: 3, drip: 16 }; // px: the blob's radius, the lumps round it, how far a lump pushes out, its drips and their length
const SHADOW = [18, 22]; // px: the shadow's offset, like the kites'
const CHARCOAL = '#6a6762';
const WOBBLE = 3; // px: how far the second frame moves each lump

// The blob's rim: lumps in and out round the middle, the second frame shifting them; the lower part is stretched into drips.
function rim(f) {
  const pts = [];
  for (let i = 0; i < BLOB.lumps * 2; i++) {
    const a = (i / (BLOB.lumps * 2)) * Math.PI * 2;
    const r = BLOB.r + (i % 2 ? BLOB.lump : 0) + (f && i % 2 ? WOBBLE : 0);
    const down = Math.max(0, Math.sin(a)); // 1 at the bottom
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.85 + (i % 4 === 1 ? down * BLOB.drip : 0)]);
  }
  return pts;
}

function eye(b, l, open) {
  if (!open) { // shut: a lid drawn as a smile, like the stones'
    b.beginPath();
    b.arc(0, -2, 10, 0.3, Math.PI - 0.3);
    b.strokeStyle = PAL.kiteLine;
    b.lineWidth = 2.4;
    b.stroke();
    return;
  }
  ellipse(b, 0, 0, 13, 8);
  b.fillStyle = PAL.lid;
  b.fill();
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = 1.6;
  b.stroke();
  circle(b, 0, 0, 5);
  b.fillStyle = PAL.violet;
  b.fill();
  circle(l, -1.5, -1.5, 1.6);
  l.fillStyle = 'rgba(255,255,255,0.9)';
  l.fill();
}

const smudge = (open) => {
  const paint = tidy((b, l, f) => {
    path(b, rim(f).map(([x, y]) => [x + SHADOW[0], y + SHADOW[1]]));
    b.fillStyle = 'rgba(40,40,50,0.16)';
    b.fill();
    path(b, rim(f));
    b.fillStyle = CHARCOAL;
    b.fill();
    b.strokeStyle = PAL.stoneDark;
    b.lineWidth = 2.4;
    b.lineJoin = 'round';
    b.stroke();
    ellipse(b, -12, -14, 10, 7);
    b.fillStyle = PAL.stone;
    b.fill();
    eye(b, l, open);
  });
  paint.size = SIZE;
  return paint;
};

export const smudgePainters = { smudge: smudge(false), smudgeOpen: smudge(true) };

// The role a craft is drawn as: a hang craft is the Smudge, open-eyed from CURTAIN_WIND before its curtain (a.cool counts down while it hangs),
// any other craft its own role.
export const smudgeRole = (a) => (a.path !== 'hang' ? a.role : a.t >= HANG_ARRIVE && a.cool <= CURTAIN_WIND ? 'smudgeOpen' : 'smudge');
