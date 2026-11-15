// World 19's foam (Rubber Regatta), drawn from the 'suds' particles that fx/react-bath.js makes: an opaque round puff with an ink rim
// and a bright fleck, or (star: true) a little five-point star turning as it flies. Opaque and inked so it reads on the green wall and
// on the pale waterline alike: no glow sprite, no shadowBlur, no additive pass. fx-view.js calls this with globalAlpha already set
// (opaque for the first two thirds of a particle's life, then fading). Pure reads of the particle; nothing is changed.
import { INK } from './sprites.js';
import { TAU } from '../core/math.js';

export const RIM = 2.2; // px: the ink line round a puff or a star
export const SPIN = 5; // rad/s a star turns, from its age
export const SPIN_VX = 0.004; // rad more per px/s of its sideways speed, so a pair thrown together do not turn in step
export const TIP = 1.7; // a star's outer radius, in particle sizes
export const WAIST = 0.7; // and its inner one
export const POINTS = 5;
export const FLECK = { from: 4, at: 0.36, r: 0.24, color: '#ffffff' }; // the light on a puff: shown from `from` px up, up and to the left by `at` sizes, `r` sizes wide

function starPath(ctx, p) {
  const a0 = (p.max - p.life) * SPIN + p.vx * SPIN_VX - Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < POINTS * 2; i++) {
    const a = a0 + (i * Math.PI) / POINTS;
    const r = p.size * (i % 2 ? WAIST : TIP);
    if (i) ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    else ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function drawSuds(ctx, p) {
  const s = p.size;
  ctx.fillStyle = p.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = RIM;
  ctx.lineJoin = 'round';
  if (p.star) {
    starPath(ctx, p);
  } else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, TAU);
  }
  ctx.fill();
  ctx.stroke();
  ctx.lineJoin = 'miter';
  if (p.star || s < FLECK.from) return;
  ctx.fillStyle = FLECK.color;
  ctx.beginPath();
  ctx.arc(p.x - s * FLECK.at, p.y - s * FLECK.at, s * FLECK.r, 0, TAU);
  ctx.fill();
}
