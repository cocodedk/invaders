// World 19's knocked-out toys (R71, the bonk rule: core/tumble.js and core/bonk.js), drawn from world.twist.bodies:
//   drawBodies(ctx, world, look, t, flying)   flying false: the dizzy bodies, drawn after the boss and before the aliens (view.js), so a
//                                             live alien is always on top of them; flying true: the batted ones, after the ship's shots
//   warmBodies(look)                          bake every sprite now (warm-bath.js), so a knock-out bakes nothing mid-fight
//   bodySprites(look)                         { dizzy: { role: { bright: [STARS], dim: [STARS] } }, flying: { role } }
// A dizzy body is its role's dizzy drawing (aliens/w19.js dizzy: the toy gone round and cross-eyed), with STAR_COUNT little stars circling over
// it, turned by its age, and a "bat me" halo under it, bright only when no live alien or boss part lies within RAM_REACH of it, so the
// invitation is never a trap; it wobbles as it tumbles. A flying body is the same toy rimmed in the look's accent with a streak behind it,
// turned to its flight. One blit a body: the halo, the toy and the stars are baked together, STARS frames a role at each brightness.
import { makeCanvas, INK, rgba, lin, rad } from './sprites.js';
import { TAU } from '../core/math.js';
import { ALIEN_R } from '../core/kinds.js';
import { SHIP_R } from '../core/ship.js';
import { WHACK_R } from '../core/bonk.js';
import { liveParts } from '../core/boss-hit.js';
import { art, ROLE_LIST } from './aliens/bake.js';
import { star5 } from './aliens/w19-kit.js';
import { BATH_WORLD } from './bath-kit.js';

export const RAM_REACH = WHACK_R + ALIEN_R + SHIP_R; // px: a live alien or part this near makes batting the body a ram
export const STAR_COUNT = 3; // stars circling a dizzy body: the pattern repeats every 1 / STAR_COUNT of a turn
export const STARS = 6; // frames of the stars' turn, over that 1 / STAR_COUNT of a turn
export const SPIN = 0.9; // turns a second the stars make
export const WOBBLE = 0.2; // rad a dizzy body rocks either way
export const WOBBLE_RATE = 3.1; // rad/s
export const DIZZY = 112; // px, a dizzy body's canvas
export const [FLY_W, FLY_H, FLY_X] = [176, 112, 120]; // px, a flying body's canvas and where the toy's centre sits in it
const SCALE = 0.8; // the knocked-out toy, a little smaller than the live one
const HALO = '#fff2b0';
const STAR = '#ffe45a';

const shelf = new Map(); // world -> bodySprites

function canvas(w, h, x, y) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.translate(x, y);
  return [c, g];
}

function toy(look, role) {
  const [c, g] = canvas(DIZZY, DIZZY, DIZZY / 2, DIZZY / 2);
  g.scale(SCALE, SCALE);
  art(look).dizzy[role](g, look.palette.alien[role]);
  return c;
}

function halo(g, bright) {
  const a = bright ? 1 : 0.28;
  g.fillStyle = rad(g, 0, 0, 0, 47, [[0, rgba(HALO, 0)], [0.55, rgba(HALO, 0.1 * a)], [0.78, rgba(HALO, 0.62 * a)], [1, rgba(HALO, 0)]]);
  g.beginPath();
  g.arc(0, 0, 47, 0, TAU);
  g.fill();
  g.setLineDash([7, 5]);
  for (const [w, c] of [[4, rgba(INK, 0.3 * a)], [2, rgba('#ffffff', 0.85 * a)]]) {
    g.beginPath();
    g.arc(0, 0, 41, 0, TAU);
    g.lineWidth = w;
    g.strokeStyle = c;
    g.stroke();
  }
  g.setLineDash([]);
}

// STAR_COUNT stars on a flat ring over the toy's head, turned k / STARS of 1 / STAR_COUNT of a turn; the near side of the ring drawn bigger.
function stars(g, k) {
  for (let j = 0; j < STAR_COUNT; j++) {
    const a = ((k / STARS + j) * TAU) / STAR_COUNT;
    const [x, y, s] = [Math.cos(a) * 22, -36 + Math.sin(a) * 6, 4.6 + Math.sin(a) * 1.3];
    star5(g, x, y, s, a);
    g.fillStyle = lin(g, x - s, y - s, x + s, y + s, [[0, '#fffbe0'], [0.5, STAR], [1, '#e8a810']]);
    g.fill();
    g.lineWidth = 1.3;
    g.strokeStyle = INK;
    g.stroke();
  }
}

function dizzyFrame(body, k, bright) {
  const [c, g] = canvas(DIZZY, DIZZY, DIZZY / 2, DIZZY / 2);
  halo(g, bright);
  g.drawImage(body, -DIZZY / 2, -DIZZY / 2);
  stars(g, k);
  return c;
}

function rim(body, color) {
  const c = makeCanvas(DIZZY, DIZZY);
  const g = c.getContext('2d');
  g.drawImage(body, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, DIZZY, DIZZY);
  return c;
}

// The batted toy, flying right: a streak behind it, a rim of the accent round it.
function flyer(body, accent) {
  const [c, g] = canvas(FLY_W, FLY_H, 0, FLY_H / 2);
  g.lineCap = 'round';
  for (const [y, w] of [[-16, 3], [0, 6], [16, 3]]) {
    const x1 = FLY_X - 30 + Math.abs(y) * 0.6;
    for (const [lw, col, a] of [[w + 3, INK, 0.22], [w, accent, 1], [w * 0.4, '#ffffff', 1]]) { // a dark ground, the accent, a white core
      g.beginPath();
      g.moveTo(10 + Math.abs(y), y);
      g.lineTo(x1, y);
      g.lineWidth = lw;
      g.strokeStyle = lin(g, 10, 0, x1, 0, [[0, rgba(col, 0)], [1, rgba(col, a)]]);
      g.stroke();
    }
  }
  const edge = rim(body, accent);
  for (let i = 0; i < 8; i++) g.drawImage(edge, FLY_X - DIZZY / 2 + Math.cos((i * TAU) / 8) * 3, -DIZZY / 2 + Math.sin((i * TAU) / 8) * 3);
  g.drawImage(body, FLY_X - DIZZY / 2, -DIZZY / 2);
  return c;
}

export function bodySprites(look) {
  let s = shelf.get(look.world);
  if (s) return s;
  s = { dizzy: {}, flying: {} };
  for (const role of ROLE_LIST) {
    const body = toy(look, role);
    s.dizzy[role] = { bright: [], dim: [] };
    for (let k = 0; k < STARS; k++) {
      s.dizzy[role].bright.push(dizzyFrame(body, k, true));
      s.dizzy[role].dim.push(dizzyFrame(body, k, false));
    }
    s.flying[role] = flyer(body, look.palette.accent);
  }
  shelf.set(look.world, s);
  return s;
}

export function warmBodies(look) {
  if (look.world === BATH_WORLD) bodySprites(look);
}

// No live alien, and no live part of the boss (its box grown by the reach), within RAM_REACH of the body.
function clear(world, parts, b) {
  const r2 = RAM_REACH ** 2;
  for (const a of world.aliens) if (a.hp > 0 && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r2) return false;
  for (const p of parts) {
    const dx = Math.max(0, Math.abs(b.x - p.x) - p.w / 2);
    const dy = Math.max(0, Math.abs(b.y - p.y) - p.h / 2);
    if (dx * dx + dy * dy <= r2) return false;
  }
  return true;
}

export function drawBodies(ctx, world, look, t, flying) {
  const list = world.twist?.bodies;
  if (!list?.length || look.world !== BATH_WORLD) return;
  const S = bodySprites(look);
  const parts = flying ? null : liveParts(world);
  ctx.globalAlpha = 1;
  for (const b of list) {
    if (b.gone || b.fly !== flying) continue;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (flying) {
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.drawImage(S.flying[b.role], -FLY_X, -FLY_H / 2);
    } else {
      const set = S.dizzy[b.role][clear(world, parts, b) ? 'bright' : 'dim'];
      ctx.rotate(Math.sin(b.t * WOBBLE_RATE + b.id) * WOBBLE);
      ctx.drawImage(set[Math.floor(b.t * SPIN * STAR_COUNT * STARS) % STARS], -DIZZY / 2, -DIZZY / 2);
    }
    ctx.restore();
  }
}
