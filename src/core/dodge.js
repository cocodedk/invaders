import { posAt } from './predict.js';
import { laserSegment } from './patterns.js';
import { SHIP_R, ZONE } from './ship.js';
import { isSwooping } from './aliens.js';
import { ALIEN_R } from './kinds.js';
import { segDist2, segSegDist2, clamp } from './math.js';
import { HAND } from './hand.js';

// Staying alive. Everything that can hurt the ship is followed for N samples DT apart: bullets in
// a straight line, divers along their swoop, a laser as a fixed segment that burns from `warn` to
// the end of its life. Then a few places the ship could fly to are tried, each flown as the ship moves
// under a pointer carried at the speed of a hand (hand.js, R68: the pointer puts the ship where it points,
// so the hand is the only limit), and the cheapest wins: a predicted hit costs far more than any detour.

const N = 24;
const DT = 2 / 60; // s between samples: two ticks
const SPAN = 480; // px: threats that cannot come within this (plus their size) of the ship are not followed
const MARGIN = 10; // px of room on top of the hit radii
const HIT = 1000; // what a predicted hit costs, in px of wandering; a dead-centre one costs 40 % more
const BEAM = 1500; // what a laser costs: it cannot be shot away, so it counts for more
const STEP_X = 36; // px between the places tried, either side of the ship
const STEPS = 10; // how many steps either way
const ROWS = [0, -90, 50]; // the rows tried, as offsets from the row it wants: its own, higher (more time), lower
const PULL_X = 0.5; // what a px of sideways detour from the wanted spot costs (a hit costs HIT)
const PULL_Y = 0.3; // and a px of vertical detour

// The box around samples `from` to N of a path (xs, ys).
function boxOf(xs, ys, from) {
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (let k = from; k <= N; k++) {
    box.x0 = Math.min(box.x0, xs[k]);
    box.x1 = Math.max(box.x1, xs[k]);
    box.y0 = Math.min(box.y0, ys[k]);
    box.y1 = Math.max(box.y1, ys[k]);
  }
  return box;
}

// A threat's place now (sample 0) and at each of the N samples after it, and the box around them all.
const sampled = (r, at) => {
  const xs = new Float64Array(N + 1);
  const ys = new Float64Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const p = at(k * DT);
    xs[k] = p.x;
    ys[k] = p.y;
  }
  return { r, r2: r * r, xs, ys, box: boxOf(xs, ys, 0) };
};

function threatsOf(world) {
  const s = world.ship;
  const bodies = [];
  const beams = [];
  const span = N * DT;
  for (const b of world.bullets) {
    if (b.life <= 0) continue;
    if (b.pattern === 'laser') {
      beams.push({ seg: laserSegment(b), warn: b.warn, life: b.life, reach: b.r + SHIP_R + MARGIN });
      continue;
    }
    const r = b.r + SHIP_R + MARGIN;
    if (segDist2(b.x, b.y, b.x + b.vx * span, b.y + b.vy * span, s.x, s.y) > (SPAN + r) ** 2) continue;
    bodies.push(sampled(r, (t) => ({ x: b.x + b.vx * t, y: b.y + b.vy * t })));
  }
  for (const a of world.aliens) {
    if (a.hp > 0 && isSwooping(a)) {
      bodies.push(sampled(ALIEN_R + SHIP_R + MARGIN, (t) => posAt(world, a, t)));
    }
  }
  return { bodies, beams };
}

// Fly the ship toward `to` for N samples, the pointer carried no faster than a hand carries it, writing
// where the ship is now (sample 0) and at each sample after. Each step is handToward's, and the ship then
// stands on that target held inside the zone, as moveShip puts it: the same sums in the same order, inlined.
function fly(ship, to, path) {
  let x = ship.x;
  let y = ship.y;
  path.xs[0] = x;
  path.ys[0] = y;
  for (let k = 1; k <= N; k++) {
    const dx = to.x - x;
    const dy = to.y - y;
    const f = Math.min(1, (HAND * DT) / (Math.hypot(dx, dy) || 1));
    x = clamp(x + dx * f, ZONE.x0, ZONE.x1);
    y = clamp(y + dy * f, ZONE.y0, ZONE.y1);
    path.xs[k] = x;
    path.ys[k] = y;
  }
}

// What flying `path` would cost in hits, counting from sample `from` on (before that the ship is
// blinking or shielded and nothing lands). Between two samples the ship can cover a hand's reach, more
// than a threat is wide, so each stretch is tested as the real collisions do (collide.js, R68): as the
// gap between the ship's stretch and the threat's, or the ship's stretch against the beam. A threat whose
// box lies farther from the box of the ship's samples than its reach (2 px spare for the float dust) cannot
// come that close on any stretch, and costs nothing: it is passed without measuring.
function hazard(path, threats, from) {
  let h = 0;
  const box = boxOf(path.xs, path.ys, from);
  for (const t of threats.bodies) {
    const gx = Math.max(t.box.x0 - box.x1, box.x0 - t.box.x1, 0);
    const gy = Math.max(t.box.y0 - box.y1, box.y0 - t.box.y1, 0);
    if (gx * gx + gy * gy > (t.r + 2) ** 2) continue;
    let best = Infinity;
    for (let k = from + 1; k <= N; k++) {
      const x0 = path.xs[k - 1] - t.xs[k - 1];
      const y0 = path.ys[k - 1] - t.ys[k - 1];
      best = Math.min(best, segDist2(x0, y0, path.xs[k] - t.xs[k], path.ys[k] - t.ys[k], 0, 0));
    }
    if (best < t.r2) h += HIT * (1.4 - 0.4 * Math.sqrt(best / t.r2));
  }
  for (const b of threats.beams) {
    for (let k = from + 1; k <= N; k++) {
      const t = k * DT;
      if (t < b.warn - DT || t > b.life + DT) continue;
      const { x1, y1, x2, y2 } = b.seg;
      if (segSegDist2(x1, y1, x2, y2, path.xs[k - 1], path.ys[k - 1], path.xs[k], path.ys[k]) < b.reach ** 2) {
        h += BEAM;
        break;
      }
    }
  }
  return h;
}

// Where to fly to: `want` if that is safe, else the cheapest place near it.
export function steer(world, want) {
  const s = world.ship;
  const immune = Math.max(s.invuln, s.power?.kind === 'shield' ? s.power.left : 0);
  const from = Math.min(N, Math.ceil(immune / DT));
  if (from >= N) return want;
  const threats = threatsOf(world);
  if (!threats.bodies.length && !threats.beams.length) return want;
  const path = { xs: new Float64Array(N + 1), ys: new Float64Array(N + 1) };
  // what flying to c costs: its hazard h plus the detour from `want` (h = 0: the detour alone)
  const costOf = (c, h = 0) => h + PULL_X * Math.abs(c.x - want.x) + PULL_Y * Math.abs(c.y - want.y);
  const price = (c) => {
    fly(s, c, path);
    const h = hazard(path, threats, from);
    return { h, cost: costOf(c, h) };
  };
  const first = price(want);
  if (first.h === 0) return want;
  let best = want;
  let bestCost = first.cost;
  const rows = ROWS.map((d) => clamp(want.y + d, ZONE.y0, ZONE.y1));
  const tries = [{ x: s.x, y: s.y }];
  for (let k = -STEPS; k <= STEPS; k++) for (const y of rows) tries.push({ x: clamp(s.x + STEP_X * k, ZONE.x0, ZONE.x1), y });
  for (const c of tries) {
    // a hazard only adds, so a detour that alone reaches bestCost cannot win: skip the flight
    if (costOf(c) >= bestCost) continue;
    const v = price(c);
    if (v.cost < bestCost) {
      best = c;
      bestCost = v.cost;
    }
  }
  return best;
}
