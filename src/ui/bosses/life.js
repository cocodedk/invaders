// A boss's life: every boss from world 21 on bends from pivots, breathes, lags, recoils and winds up (CLAUDE.md). UI only, art only:
// it never writes the world or the boss, the hit boxes never move, and its only clock is the t it is given. A boss art module
// (bake.js) declares
//   life = { parts: { [id | base]: { pivot: [x, y], turn, stretch, sway, coil? } }, breath?: { y, amp } }
//     pivot    where the part bends from, boss coordinates; a part keyed by its base name (arms for armsL and armsR) serves its
//              right twin mirrored, as painterFor does
//     turn     its largest turn about the pivot (rad); stretch: its largest stretch along the pivot-to-centre axis (a fraction)
//     sway     how much of its turn it sways through at rest (0..1); coil: which way it winds up, +1 or -1 (mirrored for R)
//     breath   the whole drawing scaled about the line y (boss coordinates) by up to amp, slowly
// Per part one damped spring with two axes, a turn and a stretch, stepped by the time since the last call (at most LIFE_MAX_DT)
// and driven by four inputs: rest (a sway, each part out of step, LIFE_PHASE times livelier in each later phase), motion (a lean
// against the boss's horizontal speed, measured from b.x across calls, which the spring carries past and back when he stops),
// hits (a twist and a squash kicked in when the part loses hp, less while an earlier kick still bends it that way) and warns (while a warn on the part counts down it coils back and
// squashes, then lunges when the warn is spent). The transform turns the part about its pivot and stretches it along the
// pivot-to-centre axis, narrowing it across a little (rubber); the turn and stretch drawn ease toward the part's limits and never
// pass them, however hard it is kicked (the spring itself may run on past them, to LIFE_SOFT times, and is held there).
//   lifeOf(b, B, t)          { [id]: matrix } this frame's pose in boss coordinates, null for a module without life; a second call
//                            at the same t gives the same pose without stepping (bodies, lights, halos, warns, limbs share it)
//   lifeOn(ctx, b, L, id)    pushes part id's transform (save, transform) and says so; the caller restores
//   eachPart(ctx, b, B, t, draw)  draw(p) for every part of b, inside its transform when it has one
//   breathOf(life, t)        [sx, sy, py] | null, the breath (bosses/index.js applies it with mod.pose)
//   lifeFor(life, id)        a part's spec, mirrored for a right twin; lifeMatrix(pivot, centre, turn, stretch) the transform
// The state is a WeakMap keyed by the boss; a boss first seen starts at rest, its spring on its target (frozen frames, clones,
// trailer snapshots).
import { clamp } from '../../core/math.js';

export const LIFE_MAX_PX = 12; // px: the farthest any part's centre is drawn from where the core puts it, every limit at its extreme
export const LIFE_MAX_DT = 0.05; // s: the longest the spring steps at once (a stall, a seek)
export const LIFE_SUBSTEP = 1 / 120; // s: the spring's integration step
export const LIFE_HZ = 1.6; // the spring's own frequency
export const LIFE_DAMP = 0.28; // its damping ratio: low, so a kick wobbles before it settles
export const LIFE_SWAY_HZ = Object.freeze([0.31, 0.43]); // the sway at rest: the turn's and the stretch's cycles a second
export const LIFE_SWAY_STRETCH = 0.4; // how much of its stretch a part bobs through at rest
export const LIFE_STAGGER = 2.4; // rad between the sways of neighbouring parts, so no two move in step
export const LIFE_PHASE = Object.freeze([1, 1.35, 1.7]); // the sway's size in each phase: livelier as the fight goes on
export const LIFE_LEAN_SPEED = 160; // px/s of the boss at which a part leans all of LIFE_LEAN
export const LIFE_LEAN = 0.6; // the lean against his motion at full speed, of the turn
export const LIFE_ACROSS = 0.45; // a stretch narrows the part across its axis by this much of it
export const LIFE_WIND = Object.freeze([0.8, -0.7]); // a warn about to fire: [turn, stretch] at its end, of the limits
export const LIFE_RECOIL = Object.freeze([0.9, -1.1]); // a hit: [turn, stretch] kicked into the spring, of the limits
export const LIFE_LUNGE = Object.freeze([-1.4, 1.6]); // a warn spent: the lunge kicked in, [turn, stretch] of the limits
export const LIFE_SPENT = 0.75; // a warn that vanished at least this far wound up was fired (not cleared by a phase or a kill)
export const LIFE_SOFT = 2; // how far past its limits a part's spring may run, of the limits (the drawn pose eases, never passes)
export const LIFE_BREATH_HZ = 0.22; // breaths a second
export const LIFE_BREATH_X = 0.4; // the chest widens by this much of what it rises

const W = 2 * Math.PI * LIFE_HZ;
const memo = new WeakMap();

export function lifeFor(life, id) {
  if (life.parts[id]) return life.parts[id];
  const base = id.replace(/[LR]$/, '');
  const twin = base !== id && life.parts[base];
  if (!twin || id.endsWith('L')) return twin || null;
  return { ...twin, pivot: [-twin.pivot[0], twin.pivot[1]], coil: -(twin.coil ?? 1) };
}

// Turn by `turn` about the pivot, after stretching by (1 + stretch) along the pivot-to-centre axis and (1 - LIFE_ACROSS * stretch)
// across it: [a, b, c, d, e, f] for ctx.transform.
export function lifeMatrix([px, py], [cx, cy], turn, stretch) {
  const phi = Math.atan2(cy - py, cx - px);
  const [c, n, ct, st] = [Math.cos(phi), Math.sin(phi), Math.cos(turn), Math.sin(turn)];
  const [sa, sc] = [1 + stretch, 1 - LIFE_ACROSS * stretch];
  const [k11, k12, k22] = [sa * c * c + sc * n * n, (sa - sc) * c * n, sa * n * n + sc * c * c];
  const [a, b, cc, d] = [ct * k11 - st * k12, st * k11 + ct * k12, ct * k12 - st * k22, st * k12 + ct * k22];
  return [a, b, cc, d, px - a * px - cc * py, py - b * px - d * py];
}

export function breathOf(life, t) {
  if (!life?.breath) return null;
  const { y, amp } = life.breath;
  const w = amp * Math.sin(2 * Math.PI * LIFE_BREATH_HZ * t);
  return [1 + LIFE_BREATH_X * w, 1 + w, y];
}

// How far the warns on part id have wound up, 0..1 (the most wound, when two overlap).
const woundOf = (b, id) => (b.warns ?? []).reduce((e, w) => (w.part === id ? Math.max(e, clamp(1 - w.left / w.total, 0, 1)) : e), 0);

// Where the inputs pull a part's spring: rest, motion and warns (hits are kicks, below).
function target(q, b, t, vx) {
  const { spec, i, uy } = q;
  const live = LIFE_PHASE[Math.min(b.phase ?? 0, LIFE_PHASE.length - 1)];
  const coil = spec.coil ?? 1;
  const e = woundOf(b, q.id);
  const turn = spec.turn * (spec.sway * live * Math.sin(2 * Math.PI * LIFE_SWAY_HZ[0] * t + i * LIFE_STAGGER)
    + LIFE_LEAN * clamp(vx / LIFE_LEAN_SPEED, -1, 1) * uy + coil * LIFE_WIND[0] * e);
  const stretch = spec.stretch * (LIFE_SWAY_STRETCH * live * Math.sin(2 * Math.PI * LIFE_SWAY_HZ[1] * t + 2 * i * LIFE_STAGGER)
    + LIFE_WIND[1] * e);
  return [clamp(turn, -spec.turn, spec.turn), clamp(stretch, -spec.stretch, spec.stretch), e];
}

function born(b, life, t) {
  const parts = [];
  b.parts.forEach((p, i) => {
    const spec = lifeFor(life, p.id);
    if (!spec) return;
    const [dx, dy] = [p.dx - spec.pivot[0], p.dy - spec.pivot[1]];
    const q = { id: p.id, spec, i, uy: dy / (Math.hypot(dx, dy) || 1), centre: [p.dx, p.dy], va: 0, vs: 0, hp: p.hp, hits: 0 };
    [q.a, q.s, q.e] = target(q, b, t, 0);
    parts.push(q);
  });
  return { t, x: b.x, phase: b.phase, parts };
}

// The inputs that kick: a hit, and a warn spent (its part standing, the phase the same).
function kicks(q, p, b, m, [ta, ts, e]) {
  const { turn, stretch, coil = 1 } = q.spec;
  const room = (v, push, limit) => clamp(1 - Math.max(0, Math.sign(push) * v) / limit, 0, 1); // already kicked that way, it gives less
  const kick = ([kt, ks], dir) => {
    q.va += kt * turn * W * dir * room(q.a - ta, kt * dir, turn);
    q.vs += ks * stretch * W * room(q.s - ts, ks, stretch);
  };
  if (p.hp < q.hp) kick(LIFE_RECOIL, coil * (q.hits++ % 2 ? -1 : 1));
  if (e === 0 && q.e >= LIFE_SPENT && p.hp > 0 && b.phase === m.phase) kick(LIFE_LUNGE, coil);
  q.hp = p.hp;
  q.e = e;
}

function spring(q, ta, ts, dt) {
  for (let left = dt; left > 1e-9; left -= LIFE_SUBSTEP) {
    const h = Math.min(LIFE_SUBSTEP, left);
    q.va += (W * W * (ta - q.a) - 2 * LIFE_DAMP * W * q.va) * h;
    q.vs += (W * W * (ts - q.s) - 2 * LIFE_DAMP * W * q.vs) * h;
    q.a += q.va * h;
    q.s += q.vs * h;
  }
  const [turn, stretch] = [q.spec.turn * LIFE_SOFT, q.spec.stretch * LIFE_SOFT];
  if (Math.abs(q.a) > turn) [q.a, q.va] = [clamp(q.a, -turn, turn), 0];
  if (Math.abs(q.s) > stretch) [q.s, q.vs] = [clamp(q.s, -stretch, stretch), 0];
}

// The spring's value as drawn: itself while small, easing toward the limit and never past it.
const ease = (v, limit) => (limit > 0 ? limit * Math.tanh(v / limit) : 0);
const poseOf = (m) => Object.fromEntries(m.parts.map((q) => [q.id, lifeMatrix(q.spec.pivot, q.centre, ease(q.a, q.spec.turn), ease(q.s, q.spec.stretch))]));

export function lifeOf(b, B, t) {
  const life = B.mod.life;
  if (!life) return null;
  let m = memo.get(b);
  if (!m) {
    m = born(b, life, t);
    m.pose = poseOf(m);
    memo.set(b, m);
  }
  if (t === m.t) return m.pose;
  const gap = t - m.t;
  const vx = gap > 0 ? (b.x - m.x) / gap : 0;
  const dt = clamp(gap, 0, LIFE_MAX_DT);
  for (const q of m.parts) {
    const p = b.parts.find((r) => r.id === q.id);
    if (!p) continue;
    const aim = target(q, b, t, vx);
    kicks(q, p, b, m, aim);
    spring(q, aim[0], aim[1], dt);
  }
  Object.assign(m, { t, x: b.x, phase: b.phase, pose: poseOf(m) });
  return m.pose;
}

export function lifeOn(ctx, b, L, id) {
  const m = L?.[id];
  if (!m) return false;
  ctx.save();
  ctx.transform(m[0], m[1], m[2], m[3], m[4] + b.x - m[0] * b.x - m[2] * b.y, m[5] + b.y - m[1] * b.x - m[3] * b.y);
  return true;
}

export function eachPart(ctx, b, B, t, draw) {
  const L = lifeOf(b, B, t);
  for (const p of b.parts) {
    const on = lifeOn(ctx, b, L, p.id);
    draw(p);
    if (on) ctx.restore();
  }
}
