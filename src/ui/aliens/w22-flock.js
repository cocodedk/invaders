// World 22's Flock (Leg 3): a mote is a small grey speck of the Hush with two flicking wings, pencilled like the kites but far smaller and plainer,
// so a wheel of a dozen reads as a swarm and not as a dozen kites. One painter, baked as the role 'mote' (bake.js) and picked by craftRole for any
// craft on the 'flock' path; every other craft keeps the role it had (the Smudge's rule, w22-smudge.js, or its own). The body, its wings and its
// shadow all lie within MOTE_REACH of the middle, inside the ALIEN_R disc the shots and the loop test against. Plain colours, as the kites.
import { path, circle, ellipse } from './kit.js';
import { tidy } from './w16-kit.js';
import { PAL } from '../wander-kit.js';
import { smudgeRole } from './w22-smudge.js';

export const MOTE_ROLES = ['mote'];
export const MOTE_SIZE = 64; // px, a sprite canvas's edge
export const MOTE_BODY = 11; // px: the speck's radius
export const MOTE_WING = { dx: 13, rx: 7, ry: 3, lift: 4 }; // px: a wing's centre out from the middle, its half width and height, how far a beat lifts it
export const MOTE_SHADOW = [6, 8]; // px: the shadow's offset, as the kites' but smaller
export const MOTE_REACH = MOTE_BODY + Math.max(...MOTE_SHADOW) + 2; // px: how far from the middle anything of it reaches, at most (a box: its half width and height)

const flap = (b, f, s) => { // one wing, up on one beat and down on the other
  ellipse(b, s * MOTE_WING.dx, (f ? -1 : 1) * MOTE_WING.lift, MOTE_WING.rx, MOTE_WING.ry);
  b.fillStyle = PAL.kiteShade;
  b.fill();
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = 1.2;
  b.stroke();
};

const mote = tidy((b, l, f) => {
  circle(b, MOTE_SHADOW[0], MOTE_SHADOW[1], MOTE_BODY);
  b.fillStyle = 'rgba(40,40,50,0.16)';
  b.fill();
  flap(b, f, -1);
  flap(b, f, 1);
  circle(b, 0, 0, MOTE_BODY);
  b.fillStyle = PAL.kite;
  b.fill();
  path(b, [[0, -MOTE_BODY], [MOTE_BODY, 0], [0, MOTE_BODY]]);
  b.fillStyle = PAL.kiteShade;
  b.fill();
  circle(b, 0, 0, MOTE_BODY);
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = 1.6;
  b.stroke();
  circle(l, -3, -3, 1.6);
  l.fillStyle = 'rgba(255,255,255,0.85)';
  l.fill();
});
mote.size = MOTE_SIZE;

export const motePainters = { mote };

// The role a craft is drawn as: a flock's mote is the mote, any other craft as w22-smudge.js says.
export const craftRole = (a) => (a.path === 'flock' ? 'mote' : smudgeRole(a));
