// The things of Leg 2's wood (world 22) that stand on the ground, drawn plain like the rest: a piece of a thorn hedge is a grey bramble box,
// exactly its w x h (the box that rams, as a pillar's is), a tangle of two stems and a row of small dark thorns pointing in from its top and
// bottom edges. Baked once per size (cached), in a sprite that holds its outline and its shadow as a pillar's does (course-sprites.js).
import { cached } from './sprites.js';
import { PAL } from './wander-kit.js';
import { PILLAR_PAD, SHADOW_DX, SHADOW_DY } from './course-sprites.js';

export const THORN_STEP = 18; // px between one thorn and the next along an edge
export const THORN_LEN = 9; // px a thorn points in from its edge
export const THORN_BASE = 5; // px: half the width of a thorn at its edge
export const STEM_SWAY = 0.18; // of the box's height: how far a stem swings from the middle, up and down
const SHADOW = 'rgba(40,40,50,0.18)';

function stems(g, w, h) { // two stems crossing the box, one swaying each way
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.bezierCurveTo(-w / 6, s * h * STEM_SWAY * 2, w / 6, -s * h * STEM_SWAY * 2, w / 2, 0);
    g.stroke();
  }
}

function thorns(g, w, h) { // small dark triangles pointing in from the top edge (down) and the bottom edge (up)
  g.fillStyle = PAL.stoneDark;
  g.beginPath();
  for (let x = -w / 2 + THORN_STEP / 2; x < w / 2 - THORN_BASE; x += THORN_STEP) {
    for (const s of [-1, 1]) {
      const y = s * (h / 2);
      g.moveTo(x - THORN_BASE, y);
      g.lineTo(x + THORN_BASE, y);
      g.lineTo(x, y - s * THORN_LEN);
    }
  }
  g.fill();
}

// A thorn piece w x h: its box is exactly that, centred at (PILLAR_PAD + w / 2, PILLAR_PAD + h / 2) in a sprite the size of a pillar's.
export const thornSprite = (w, h) => cached(`wanderThorn${w}x${h}`, w + 2 * PILLAR_PAD + SHADOW_DX, h + 2 * PILLAR_PAD + SHADOW_DY, (g) => {
  g.translate(PILLAR_PAD + w / 2, PILLAR_PAD + h / 2);
  g.fillStyle = SHADOW;
  g.fillRect(-w / 2 + SHADOW_DX, -h / 2 + SHADOW_DY, w, h);
  g.fillStyle = PAL.kiteShade;
  g.fillRect(-w / 2, -h / 2, w, h);
  stems(g, w, h);
  thorns(g, w, h);
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = 2;
  g.strokeRect(-w / 2, -h / 2, w, h);
});
