// The Ten-Crowned King's hull (World 21, Golden Isle; see crowns.js): a colossal king riding a small gilded chariot-throne in the air,
// seen front-on. Behind him, ten mighty upper arms a side fan out in a halo from his shoulders to the gold-capped elbows of the arm parts;
// before them his body: a vermilion robe with gold borders and a jewelled sash (crowns-robe.js), the great gilded shoulder mantle spanning
// under the arc of his heads, and from it ten short thick necks, each with a jewelled collar, rising to the heads; layered necklaces
// over his chest. The heads, the forearms, the breastplate and the heart are painted over it. Lights: the gold, the jewels, the fire.
// For his life (crowns-life.js) the live drawing takes the hull apart (bake.js): the front layer is his body (front: the robe, the
// mantle, the necklaces and the chariot); the limbs are each side's upper arms (upperArms, moving with that side's arm fan) and each
// head's neck (neck, moving with its head), in the boxes armsBox and neckBox give; the collars ride in the head sprites (crowns-head.js).
// hull() is still the whole composite, collars and all, for the collapse.
import { path, ink, line, rgba, both, gilt, glint, PAL, PART, HEADS, skin, neckOf, neckBase } from './crowns-kit.js';
import { ELBOWS, SHOULDER } from './crowns-arms.js';
import { torso, mantle, necklaces, chariot, collar, collarDrop } from './crowns-robe.js';

export const ARM_PAD = 24; // px round an upper arm's line that its width and its armlet reach
export const NECK_PAD = 4; // px round a neck's outline that its ink reaches
export const NECK_FLARE = 0.6; // a neck's half width where it meets the mantle, of its width
export const NECK_TOP = 6; // px above the chin that a neck starts, under the head's own neck top

// An upper arm from the shoulder (sx, sy) to the elbow (ex, ey), w thick at the shoulder, an armlet round its middle.
function upperArm(b, l, sx, sy, ex, ey, w) {
  const [dx, dy] = [ex - sx, ey - sy];
  const len = Math.hypot(dx, dy);
  const [nx, ny] = [-dy / len, dx / len];
  path(b, [[sx + nx * w / 2, sy + ny * w / 2], [ex + nx * w * 0.36, ey + ny * w * 0.36], [ex - nx * w * 0.36, ey - ny * w * 0.36], [sx - nx * w / 2, sy - ny * w / 2]]);
  ink(b, skin(b, sx, sy - w, ex, ey + w), 2.6);
  path(b, [[sx + nx * w * 0.36, sy + ny * w * 0.36], [ex + nx * w * 0.26, ey + ny * w * 0.26]], true); // the light along its upper edge
  line(b, rgba(PAL.skinL, 0.7), 2);
  const [bx, by] = [sx + dx * 0.72, sy + dy * 0.72];
  path(b, [[bx + nx * w * 0.48, by + ny * w * 0.48], [bx + dx / len * 9 + nx * w * 0.46, by + dy / len * 9 + ny * w * 0.46],
    [bx + dx / len * 9 - nx * w * 0.46, by + dy / len * 9 - ny * w * 0.46], [bx - nx * w * 0.48, by - ny * w * 0.48]]);
  ink(b, gilt(b, bx - w, by - w, bx + w, by + w), 1.4);
  glint(l, bx, by, 2.4, 0.35);
}

// The i-th upper arm of side s (-1 left, 1 right): shoulder, elbow (e, from ELBOWS) and width.
const [ax, ay] = [PART.armsL.x, PART.armsL.y];
const armLine = (s, e, i) => [s * (-SHOULDER[0] - ax), SHOULDER[1] + ay + i * 5, -s * (e.x + ax), e.y + ay, 34 - i];
export const upperArms = (b, l, s) => ELBOWS.forEach((e, i) => upperArm(b, l, ...armLine(s, e, i)));

// A short thick neck from a head's chin down into the mantle, w wide.
export function neck(b, l, id) {
  const [x, y, w] = neckOf(id);
  const base = neckBase(id);
  path(b, [[x - w * 0.42, y - NECK_TOP], [x + w * 0.42, y - NECK_TOP], [x + w * NECK_FLARE, base], [x - w * NECK_FLARE, base]]);
  ink(b, skin(b, x - w, y, x + w, base), 2.6);
}

const boxOf = (pts, pad) => [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad,
  Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad].map((v, i) => (i < 2 ? Math.floor(v) : Math.ceil(v)));
export const armsBox = (s) => boxOf(ELBOWS.flatMap((e, i) => {
  const [sx, sy, ex, ey] = armLine(s, e, i);
  return [[sx, sy], [ex, ey]];
}), ARM_PAD);
export function neckBox(id) {
  const [x, y, w] = neckOf(id);
  return boxOf([[x - w * NECK_FLARE, y - NECK_TOP], [x + w * NECK_FLARE, neckBase(id)]], NECK_PAD); // the neck is widest at its base
}

export function front(b, l) {
  torso(b, l);
  mantle(b, l);
  necklaces(b, l);
  chariot(b, l);
}

export function hull(b, l) {
  ELBOWS.forEach((e, i) => both((s) => upperArm(b, l, ...armLine(s, e, i))));
  for (const id of HEADS) neck(b, l, id);
  torso(b, l);
  mantle(b, l);
  necklaces(b, l);
  for (const id of HEADS.filter((h) => h !== 'headT')) {
    const [x, y, w] = neckOf(id);
    collar(b, l, x, y + collarDrop(id), w);
  }
  chariot(b, l);
}
