// The Dowager Duck's live extras (World 19, Rubber Regatta; duck.js runs them): bath time going on round her. In boss coordinates, cached sprites
// only (duck-sprites.js and the shared glows), nothing allocated per frame; what moves when comes from the clock and a hash of it.
//   own pass only, opaque (the boss's own pass, never the darkness pass): the plaster on her tum from the hover on (while it stands), the foam crest
//            across her waist, heaving a little, and her eyes crossed for CROSS s after a bonk (duck-bonk.js)
//   bubbles  soap bubbles rising off the foam hills at her sides and popping
//   paddle   drops kicked up off each foot's toes in turn, as it paddles (none off a foot shot away)
//   hiss     from the hover on, the leak: a fine spray out of the side of her tum
//   jet      in the orbit, the valve gone: air rushing out from under her in puffs, as from a let-go balloon
//   dizzy    after a bonk, three little stars circling her cap
// The additive light is at most the strength k; nothing is drawn above y = TOP.
import { glow, star, soft, hash } from '../sprites.js';
import { alive } from './parts.js';
import { clamp } from '../../core/math.js';
import { PART, TOP } from './duck-kit.js';
import { RING } from './duck-shape.js';
import { crest, plaster, crossed, bubble } from './duck-sprites.js';
import { bonkAge, CROSS } from './duck-bonk.js';

const CREAM = '#fff4e2';
const STAR = '#fff3a0';
const HEAVE = 1.5; // px the foam crest heaves

function put(ctx, img, x, y, r, a) {
  const rr = Math.min(r, y - TOP);
  if (rr <= 1 || a <= 0) return;
  ctx.globalAlpha = a;
  ctx.drawImage(img, x - rr, y - rr, rr * 2, rr * 2);
}

function opaque(ctx, b, t, ph, age) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (ph >= 1 && alive(b, 'belly')) {
    const p = plaster();
    ctx.drawImage(p.img, p.x, p.y);
  }
  const c = crest();
  ctx.drawImage(c.img, c.x, c.y + HEAVE * Math.sin(t * 2.2));
  if (age < CROSS) {
    const e = crossed();
    ctx.drawImage(e.img, e.x, e.y);
  }
  ctx.globalCompositeOperation = 'lighter';
}

const BUBBLES = Array.from({ length: 7 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (260 + 28 * i), q: hash(i * 11 + 5), r: 7 + 6 * hash(i * 3 + 1) }));

function bubbles(ctx, t, k) {
  for (const s of BUBBLES) {
    const u = (t * 0.22 + s.q) % 1; // rises from the foam over about 4.5 s, then pops
    const y = RING.y - 20 - 210 * u;
    put(ctx, bubble(), s.x + 14 * Math.sin(t * 1.3 + s.q * 6), y, s.r * (u > 0.94 ? 1 + (u - 0.94) * 12 : 1), k * (u > 0.94 ? (1 - u) * 14 : 0.85));
  }
}

function paddle(ctx, b, t, k) {
  for (const [id, s] of [['footL', -1], ['footR', 1]]) {
    if (!alive(b, id)) continue;
    const u = (t * 1.5 + (s > 0 ? 0.5 : 0)) % 1;
    if (u > 0.45) continue;
    const p = PART[id];
    for (let i = 0; i < 3; i++) {
      const [dx, h] = [s * (16 + 22 * i + 60 * u), hash(i + 7)];
      put(ctx, glow(CREAM), p.x + s * 40 + dx, p.y + 56 - 70 * u * (1 - u) * (1.6 + h) + 10 * u, 6 + 3 * h, k * 0.7 * (1 - u / 0.45));
    }
  }
}

function hiss(ctx, t, k) {
  const [x, y] = [PART.belly.x + 96, PART.belly.y - 26];
  for (let i = 0; i < 4; i++) {
    const u = (t * 2.4 + i / 4) % 1;
    put(ctx, soft('#ffffff'), x + 120 * u, y - 40 * u + 6 * Math.sin(t * 30 + i), 8 + 18 * u, k * 0.45 * (1 - u));
  }
}

function jet(ctx, t, k) {
  const [x, y] = [PART.squeak.x, PART.squeak.y + 40];
  for (let i = 0; i < 8; i++) {
    const u = (t * 1.8 + i / 8) % 1;
    put(ctx, soft('#ffffff'), x + 22 * Math.sin(t * 9 + i * 2), y + 110 * u, 12 + 26 * u, k * 0.42 * (1 - u));
  }
  put(ctx, glow(CREAM), x, y, 40 + 6 * Math.sin(t * 20), k * 0.5);
}

function dizzy(ctx, t, k, age) {
  const a = k * clamp(1 - age / CROSS, 0, 1);
  for (let i = 0; i < 3; i++) {
    const ang = t * 7 + (i * Math.PI * 2) / 3;
    put(ctx, star(STAR), 150 * Math.cos(ang), -136 + 16 * Math.sin(ang), 26, a);
  }
}

export function fx(ctx, b, t, k, own) {
  const ph = clamp(b.phase, 0, 2);
  const age = bonkAge(b, t);
  if (own) opaque(ctx, b, t, ph, age);
  bubbles(ctx, t, k);
  paddle(ctx, b, t, k);
  if (ph >= 1 && alive(b, 'belly')) hiss(ctx, t, k);
  if (ph >= 2) jet(ctx, t, k);
  if (age < CROSS) dizzy(ctx, t, k, age);
  ctx.globalAlpha = 1;
}

export function warm() {
  crest();
  plaster();
  crossed();
  bubble();
  glow(CREAM);
  star(STAR);
  soft('#ffffff');
}
