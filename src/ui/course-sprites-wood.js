// The things of Leg 2's wood (world 22) that stand on the ground, drawn plain like the rest: a piece of a thorn hedge is a grey bramble box,
// exactly its w x h (the box that rams, as a pillar's is), a tangle of two stems and a row of small dark thorns pointing in from its top and
// bottom edges. Baked once per size (cached), in a sprite that holds its outline and its shadow as a pillar's does (course-sprites.js).
import { cached } from './sprites.js';
import { PAL } from './wander-kit.js';
import { PILLAR_PAD, SHADOW_DX, SHADOW_DY, OBJECT_SCALE, round, openEye, shutEye } from './course-sprites.js';
import { GROUND_R } from '../core/course-ground.js';

export const THORN_STEP = 18; // px between one thorn and the next along an edge
export const THORN_LEN = 9; // px a thorn points in from its edge
export const THORN_BASE = 5; // px: half the width of a thorn at its edge
export const STEM_SWAY = 0.18; // of the box's height: how far a stem swings from the middle, up and down
export const STEM_WIDTH = 3; // px: a stem's, and a gate ring's stem's, stroke
export const BOX_OUTLINE = 2; // px: a bramble box's outline
export const GATE_SHADOW_FLAT = 0.6; // a gate's ground shadow: its height as a share of its width
const SHADOW = 'rgba(40,40,50,0.18)';
const TAU = Math.PI * 2;
export const THICKET_THORNS = 14; // thorns round a bramble gate's ring, pointing out
export const THICKET_THORN_LEN = 12; // px a gate's thorn points out from its ring: its tip is at GROUND_R
export const THICKET_OUTER = GROUND_R - THICKET_THORN_LEN; // the ring's outside
export const THICKET_RING = 10; // px of bramble in a gate's ring, thinner than a stone ring so the dark clearing shows round the eye
export const THICKET_PATCH = { rx: 12, ry: 8 }; // the pale patch under a sleeping gate's lid, in the eye's own (scaled) units
export const THICKET_CENTRE = '#33302a'; // the dark clearing in the middle of a gate

function stems(g, w, h) { // two stems crossing the box, one swaying each way
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = STEM_WIDTH;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(-w / 2, 0);
    g.bezierCurveTo(-w / 6, s * h * STEM_SWAY * 2, w / 6, -s * h * STEM_SWAY * 2, w / 2, 0);
    g.stroke();
  }
}

// One of a gate's thorns, at angle a: its base chord lies on the ring's outside, so no corner dips in, and its tip is at GROUND_R. -> [[x, y], [x, y], [x, y]]
export function thicketThorn(a) {
  const half = THORN_BASE / THICKET_OUTER;
  const base = THICKET_OUTER / Math.cos(half);
  return [[Math.cos(a - half) * base, Math.sin(a - half) * base], [Math.cos(a + half) * base, Math.sin(a + half) * base], [Math.cos(a) * GROUND_R, Math.sin(a) * GROUND_R]];
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
  g.lineWidth = BOX_OUTLINE;
  g.strokeRect(-w / 2, -h / 2, w, h);
});

// A bramble gate: the gate's square and eye, its ring a tangle of bramble with thorns pointing out (the tips at GROUND_R) round a dark centre.
export const thicketGateSprite = (awake) => round(awake ? 'wanderThicketAwake' : 'wanderThicketAsleep', (g) => {
  const outer = THICKET_OUTER;
  g.fillStyle = SHADOW;
  g.beginPath();
  g.ellipse(SHADOW_DX, SHADOW_DY, GROUND_R, GROUND_R * GATE_SHADOW_FLAT, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.arc(0, 0, outer - THICKET_RING / 2, 0, TAU);
  g.fillStyle = THICKET_CENTRE;
  g.fill();
  g.lineWidth = THICKET_RING;
  g.strokeStyle = PAL.kiteShade;
  g.stroke();
  g.lineWidth = STEM_WIDTH;
  g.strokeStyle = PAL.stoneDark;
  for (const r of [outer - 3, outer - THICKET_RING + 3]) { // two stems round the ring
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
  }
  g.fillStyle = PAL.stoneDark;
  g.beginPath();
  for (let i = 0; i < THICKET_THORNS; i++) {
    const a = (i / THICKET_THORNS) * TAU;
    const [p, q, tip] = thicketThorn(a);
    g.moveTo(...p);
    g.lineTo(...q);
    g.lineTo(...tip);
  }
  g.fill();
  g.scale(OBJECT_SCALE, OBJECT_SCALE); // the eye is the stone's
  if (awake) openEye(g);
  else { g.fillStyle = PAL.kite; g.beginPath(); g.ellipse(0, 0, THICKET_PATCH.rx, THICKET_PATCH.ry, 0, 0, TAU); g.fill(); shutEye(g); } // a pale patch to read the lid on
});
