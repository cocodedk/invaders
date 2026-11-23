// World 22's ship (ship-view.js draws it in place of the chrome hull, in the ship's own banked frame): the mockup's PAPER GLIDER seen from
// above, nose up: a cream paper wing folded along its spine, a brass body with a pale flame at its nose, and a ribbon in the glider's gold
// and turquoise trailing behind it. It has no engine, so no flames. The body is baked once; the ribbon is baked in RIBBON_FRAMES phases of
// its wave (the kites flip between two frames in the same way) and a frame blits the phase t is at; only the nose's glow is drawn live, as one
// cached 'lighter' sprite, no shadow blur. It is drawn at GLIDER_SCALE of the mockup, so that its brass body is as big as the hit disc
// (SHIP_R) and the wings stay inside the shield's ring (ship-view.js). The mockup's numbers below are in its own px, the scale applies on baking.
import { cached, glow, addGlow } from './sprites.js';
import { TAU } from '../core/math.js';
import { SHIP_R } from '../core/ship.js';
import { PAL } from './wander-kit.js';

export const BODY_RY = 18; // the brass body's half height in the mockup, which SHIP_R is as big as in the game
export const GLIDER_SCALE = SHIP_R / BODY_RY;
export const RIBBON_FRAMES = 24; // phases of the wave a ribbon is baked in
export const RIBBON_RATE = 3; // rad/s: how fast the wave runs down the ribbon (the mockup's)
export const RIBBON_KNOTS = 24; // points of the ribbon's line
// The art's reach in the mockup's px, which the sprites' canvases are cut to (so a different GLIDER_SCALE needs no other change): the glider's
// shadow, the furthest thing from its centre, and the ribbon's strands, measured over every phase from where it starts under the glider's tail.
const REACH = { x: 86, y: 44, left: 81, right: 12, down: 223, pad: 2 };
export const GLIDER_W = 2 * (Math.ceil(REACH.x * GLIDER_SCALE) + REACH.pad); // px, the baked glider's canvas: its centre is the ship's
export const GLIDER_H = 2 * (Math.ceil(REACH.y * GLIDER_SCALE) + REACH.pad);
export const RIBBON_X = Math.ceil(REACH.left * GLIDER_SCALE); // px, a baked ribbon's canvas: its start is this far from the left and at the top
export const RIBBON_W = RIBBON_X + Math.ceil(REACH.right * GLIDER_SCALE);
export const RIBBON_H = Math.ceil(REACH.down * GLIDER_SCALE);
const NOSE = -30; // the flame's place in the mockup, up the glider's nose
const FLAME_R = 46; // the glow's radius in the mockup, and how far it swells
const FLAME_SWELL = 4;
const STRANDS = [[PAL.gold, 9, 0], [PAL.teal, 5, 4]]; // colour, width and shift of the ribbon's two strands

const poly = (g, pts) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
};

function paintBody(g) {
  g.scale(GLIDER_SCALE, GLIDER_SCALE);
  g.lineJoin = 'round';
  poly(g, [[26, -6], [86, 44], [26, 26], [-34, 44]]); // its shadow on the ground, off to one side: the glider is in the air
  g.fillStyle = 'rgba(40,40,50,0.2)';
  g.fill();
  const wing = [[0, -34], [62, 20], [0, 6], [-62, 20]];
  poly(g, wing);
  g.fillStyle = PAL.paper;
  g.fill();
  g.strokeStyle = PAL.paperLine;
  g.lineWidth = 2;
  g.stroke();
  g.beginPath(); // the fold
  g.moveTo(0, -34);
  g.lineTo(0, 6);
  g.stroke();
  g.beginPath();
  g.ellipse(0, -4, 7, BODY_RY, 0, 0, TAU);
  g.fillStyle = PAL.glider;
  g.fill();
  g.beginPath();
  g.arc(0, NOSE, 5, 0, TAU);
  g.fillStyle = PAL.spark;
  g.fill();
}

// The ribbon's wave at phase k of RIBBON_FRAMES: two strands from under the tail, each a line that drifts back and sways wider the further it goes.
function paintRibbon(g, k) {
  g.translate(RIBBON_X, 0);
  g.scale(GLIDER_SCALE, GLIDER_SCALE);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [colour, width, shift] of STRANDS) {
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(shift - 2, 26);
    for (let i = 1; i <= RIBBON_KNOTS; i++) g.lineTo(shift - i * 2 + Math.sin((k * TAU) / RIBBON_FRAMES - i * 0.45) * (6 + i * 0.9), 26 + i * 8);
    g.stroke();
  }
}

export const gliderSprite = () => cached('wanderGlider', GLIDER_W, GLIDER_H, (g) => {
  g.translate(GLIDER_W / 2, GLIDER_H / 2);
  paintBody(g);
});

export const ribbonSprite = (k) => cached(`wanderRibbon${k}`, RIBBON_W, RIBBON_H, (g) => paintRibbon(g, k));

// The phase of the ribbon's wave at time t.
export const ribbonPhase = (t) => Math.floor((((t * RIBBON_RATE) / TAU) % 1) * RIBBON_FRAMES + RIBBON_FRAMES) % RIBBON_FRAMES;

// The glider in the ship's frame (centre at the origin), `alpha` being the ship's own (0.3 while it blinks); the ribbon goes under the body.
// It answers [1, 1] as the other ships' painters answer their wings' share of the hull's width, which nothing reads: it has no wing lights.
export function drawGlider(ctx, t, alpha) {
  ctx.drawImage(ribbonSprite(ribbonPhase(t)), -RIBBON_X, 0);
  ctx.drawImage(gliderSprite(), -GLIDER_W / 2, -GLIDER_H / 2);
  const swell = (FLAME_R + Math.sin(t * 9) * FLAME_SWELL) * GLIDER_SCALE;
  addGlow(ctx, glow(PAL.lamp), 0, NOSE * GLIDER_SCALE, swell, 0.75 * alpha);
  ctx.globalAlpha = alpha; // addGlow leaves it at 1
  return [1, 1];
}
