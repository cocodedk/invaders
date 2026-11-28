import { HEIGHT, ALIEN_R } from '../../src/core/kinds.js';
import { SPAWN_Y, RESPAWN_SAFE, SHARD } from '../../src/core/course-kinds.js';
import { stopAt } from '../../src/core/course-hold.js';
import { LASSO_INK } from '../../src/core/course-lasso.js';
import { FLOCK_VY, FLOCK_R } from '../../src/core/course-flock.js';

// The data rules of the Mirror Flats (world 22, Leg 3) that course-fair-kit.js unfair() adds to the course's own. Pure, as the kit is; each
// returns what breaks the rule, each as 'rule: what'.
//   flock  no flock is still on the screen when a hold starts (the scroll stops): a flock drifts down at FLOCK_VY and is gone FLOCK_STAY s after it
//          spawns, so the last flock comes up that long before the stop, and a hold's flights are never flocks
//   shard  no shard stands within RESPAWN_SAFE s of scroll of a lantern, before it or after: a respawn puts the ship in a field that a shard
//          would throw its first shots back across
//   lone   the first FIRST_FLOCKS flocks come alone: no spawn but a lantern within LONE_GAP px of scroll of one, so a loop is the plain answer to it
//   ring   (a course that grants the lasso) no three of a hold's gates fit inside a circle of diameter LASSO_INK / PI, the widest circle a full line closes: one loop takes at most
//          two of them, so looping helps and the fight stays a fight

export const FLOCK_STAY = (HEIGHT - SPAWN_Y + FLOCK_R + ALIEN_R) / FLOCK_VY; // s from a flock's spawn until its last mote is below the screen
export const FIRST_FLOCKS = 2;
export const LONE_GAP = HEIGHT - SPAWN_Y; // a screen of scroll: what is up when a flock spawns has gone or is not yet in; the data keeps 1300 at least
export const RING_R = LASSO_INK / Math.PI / 2; // the radius of a circle of a full line

const holds = ({ spawns }) => spawns.filter((e) => e.kind === 'hold');

export function flocks(course) {
  const { speed, spawns } = course;
  const stops = holds(course).map(stopAt);
  const late = spawns.filter((e) => e.kind === 'air' && e.path === 'flock')
    .flatMap((e) => stops.filter((stop) => stop >= e.at && stop - e.at < speed * FLOCK_STAY).map((stop) => [e, stop]))
    .map(([e, stop]) => `flock: the flock at ${e.at} is still on the screen when the hold stops at ${stop}`);
  const flights = holds(course).flatMap((h) => h.flights.filter((f) => f.path === 'flock').map((f) => `flock: a flight of the hold at ${h.at} is a flock`));
  return [...late, ...flights];
}

export function shards({ speed, spawns }) {
  const lanterns = spawns.filter((e) => e.kind === 'checkpoint');
  return spawns.filter((e) => e.kind === SHARD).flatMap((s) => lanterns
    .filter((l) => Math.abs(s.at - l.at) < speed * RESPAWN_SAFE)
    .map((l) => `shard: the shard at ${s.at} is within ${RESPAWN_SAFE} s of the lantern at ${l.at}`));
}

// The radius of the smallest circle round three points: half the longest side of a right or obtuse triangle, else the circumradius.
function ringOf(p, q, r) {
  const [a, b, c] = [Math.hypot(p.x - q.x, p.y - q.y), Math.hypot(q.x - r.x, q.y - r.y), Math.hypot(r.x - p.x, r.y - p.y)].sort((u, v) => u - v);
  if (c * c >= a * a + b * b) return c / 2;
  const s = (a + b + c) / 2;
  return (a * b * c) / (4 * Math.sqrt(s * (s - a) * (s - b) * (s - c)));
}

const lassoHeld = ({ starts = [], spawns }) => starts.includes('lasso') || spawns.some((e) => e.kind === 'checkpoint' && e.grants === 'lasso');

export function ring(course) { // only a course that grants the lasso: Legs 1 and 2 have no loop to take their gates
  return holds(course).filter(() => lassoHeld(course)).flatMap((h) => {
    const gates = h.targets.map((t) => ({ x: t.x, y: -t.dy }));
    const bad = [];
    for (let i = 0; i < gates.length; i++) for (let j = i + 1; j < gates.length; j++) for (let k = j + 1; k < gates.length; k++) {
      if (ringOf(gates[i], gates[j], gates[k]) <= RING_R) bad.push(`ring: gates ${i}, ${j} and ${k} of the hold at ${h.at} fit inside one loop`);
    }
    return bad;
  });
}

export function lone({ spawns }) {
  const firsts = spawns.filter((e) => e.kind === 'air' && e.path === 'flock').sort((a, b) => a.at - b.at).slice(0, FIRST_FLOCKS);
  return firsts.flatMap((f) => spawns
    .filter((e) => e !== f && e.kind !== 'checkpoint' && Math.abs(e.at - f.at) < LONE_GAP)
    .map((e) => `lone: the ${e.kind} at ${e.at} is within ${LONE_GAP} of the flock at ${f.at}`));
}

export const flats = (course) => [...flocks(course), ...shards(course), ...lone(course), ...ring(course)];
