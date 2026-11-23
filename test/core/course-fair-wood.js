import { HEIGHT, PATTERNS } from '../../src/core/kinds.js';
import { scaled } from '../../src/core/difficulty.js';
import { CURTAIN_W, CURTAIN_SPEED } from '../../src/core/patterns.js';
import { HANG_Y, HANG_ARRIVE, HANG_SECS, CURTAIN_WIND, CURTAIN_COOL } from '../../src/core/course-air.js';
import { stopAt } from '../../src/core/course-hold.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { SPAWN_Y, BAND_MIN } from '../../src/core/course-kinds.js';

// The data rules of the Pencil Wood (world 22, Leg 2) that course-fair-kit.js unfair() adds to the course's own: what its Hush and its thorns
// ask of the data. Pure, as the kit is; each returns what breaks the rule, each as 'rule: what'.
//   curtain  a Smudge (an air craft that hangs and fires the curtain, course-air.js) comes with the line or with room to go round:
//            before the ability 'line' is held (the level starts with it, or its `at` is no later than the lantern that grants it), every
//            row on the screen from the Smudge's spawn until its last curtain has fallen off the bottom leaves at least BAND_MIN beside the
//            curtain on the side with more room, against the walls (so it can be flown round); after it nothing is asked, since one stroke
//            of the line covers a curtain (CURTAIN_W is at most LINE_INK, the pattern's own test). A curtain is fired only by a hang craft:
//            the rule sees no other.

export const CURTAIN = 'curtain'; // the pattern name: an air entry may fire it though it is not one of the wave patterns (PATTERNS)
export const AIR_PATTERNS = [...PATTERNS, CURTAIN]; // the patterns an air entry may name

const LAST = Math.floor((HANG_SECS - CURTAIN_WIND) / CURTAIN_COOL); // the index of a hang's last curtain
const spell = (d) => // s from a Smudge spawning until its last curtain has fallen to the bottom edge
  HANG_ARRIVE + CURTAIN_WIND + LAST * CURTAIN_COOL + (HEIGHT - HANG_Y) / (scaled(d).bulletSpeed * CURTAIN_SPEED);

// Where the line comes in: -Infinity when the leg starts with it, the `at` of the lantern that grants it, Infinity when it never does.
const lineFrom = ({ starts = [], spawns }) =>
  starts.includes('line') ? -Infinity : (spawns.find((e) => e.kind === 'checkpoint' && e.grants === 'line')?.at ?? Infinity);

// The craft that fire a curtain, each [entry, the dist it comes up at, its name]: a hold's flights come at the stop (the scroll stands still while it holds).
const shooters = ({ spawns }) => spawns.flatMap((e, i) => {
  if (e.kind === 'air') return e.pattern === CURTAIN ? [[e, e.at, `air #${i}`]] : [];
  return e.kind === 'hold' ? e.flights.filter((f) => f.pattern === CURTAIN).map((f, j) => [f, stopAt(e), `hold #${i} flight ${j}`]) : [];
});

// The first row of the stretch, as the free px beside the curtain at it, that is under BAND_MIN: [row, room], or null.
function tightRow(course, d, x, at) {
  const [lo, hi] = [at + SPAWN_Y - HEIGHT, at + course.speed * spell(d) + SPAWN_Y]; // the rows on screen from the spawn to the last curtain's fall
  for (let row = Math.floor(lo); row <= Math.ceil(hi); row++) {
    const { left, right } = bandAt(course, row);
    const room = Math.max(x - CURTAIN_W / 2 - left, right - (x + CURTAIN_W / 2));
    if (room < BAND_MIN) return [row, room];
  }
  return null;
}

export function curtains(level) {
  const { course } = level;
  const from = lineFrom(course);
  return shooters(course).flatMap(([e, at, name]) => {
    if (e.path !== 'hang') return [`curtain: ${name} fires a curtain but does not hang, and the rule sees only a Smudge's`];
    if (at > from) return [];
    const tight = tightRow(course, level.d, e.x, at);
    return tight ? [`curtain: ${name} (x ${e.x}) leaves ${tight[1].toFixed(0)} px beside its curtain at row ${tight[0]} before the line, under ${BAND_MIN}`] : [];
  });
}
