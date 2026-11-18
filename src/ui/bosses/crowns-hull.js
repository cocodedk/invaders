// The Ten-Crowned King's hull (World 21, Golden Isle; see crowns.js): a colossal king riding a small gilded chariot-throne in the air,
// seen front-on. Behind him, ten mighty upper arms a side fan out in a halo from his shoulders to the gold-capped elbows of the arm parts;
// before them his body: a vermilion robe with gold borders and a jewelled sash (crowns-robe.js), the great gilded shoulder mantle spanning
// under the arc of his heads, and from it ten short thick necks, each with a jewelled collar, rising to the heads; layered necklaces
// over his chest. The heads, the forearms, the breastplate and the heart are painted over it. Lights: the gold, the jewels, the fire.
import { path, ink, line, rgba, both, gilt, glint, PAL, PART, HEADS, skin, neckOf } from './crowns-kit.js';
import { ELBOWS, SHOULDER } from './crowns-arms.js';
import { torso, mantle, necklaces, chariot, collar } from './crowns-robe.js';

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

// A short thick neck from a head's chin down into the mantle, w wide.
function neck(b, l, id) {
  const [x, y, w] = neckOf(id);
  const base = y + (id === 'headT' ? 80 : 34);
  path(b, [[x - w * 0.42, y - 6], [x + w * 0.42, y - 6], [x + w * 0.6, base], [x - w * 0.6, base]]);
  ink(b, skin(b, x - w, y, x + w, base), 2.6);
}

export function hull(b, l) {
  const [ax, ay] = [PART.armsL.x, PART.armsL.y];
  ELBOWS.forEach((e, i) => both((s) => upperArm(b, l, s * (-SHOULDER[0] - ax), SHOULDER[1] + ay + i * 5, -s * (e.x + ax), e.y + ay, 34 - i)));
  for (const id of HEADS) neck(b, l, id);
  torso(b, l);
  mantle(b, l);
  necklaces(b, l);
  for (const id of HEADS.filter((h) => h !== 'headT')) {
    const [x, y, w] = neckOf(id);
    collar(b, l, x, y + (id === 'head' ? 26 : 20), w);
  }
  chariot(b, l);
}
