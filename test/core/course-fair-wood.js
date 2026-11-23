import { HEIGHT, PATTERNS } from '../../src/core/kinds.js';
import { FREE_ZONE, SHIP_R } from '../../src/core/ship.js';
import { scaled } from '../../src/core/difficulty.js';
import { CURTAIN_W, CURTAIN_SPEED } from '../../src/core/patterns.js';
import { HANG_Y, HANG_ARRIVE, HANG_SECS, CURTAIN_WIND, CURTAIN_COOL } from '../../src/core/course-air.js';
import { stopAt } from '../../src/core/course-hold.js';
import { bandAt } from '../../src/core/course-terrain.js';
import { GROUND_HP } from '../../src/core/course-ground.js';
import { SPAWN_Y, BAND_MIN, SHOT_SECS, THORN_SLACK } from '../../src/core/course-kinds.js';
import { rowsOf, blocksOf, widestGap } from './course-fair-rows.js';

// The data rules of the Pencil Wood (world 22, Leg 2) that course-fair-kit.js unfair() adds to the course's own: what its Hush and its thorns
// ask of the data. Pure, as the kit is; each returns what breaks the rule, each as 'rule: what'.
//   curtain  a Smudge (an air craft that hangs and fires the curtain, course-air.js) comes with the line or with room to go round:
//            before the ability 'line' is held (the level starts with it, or its `at` is no later than the lantern that grants it), every
//            row on the screen from the Smudge's spawn until its last curtain has fallen off the bottom leaves at least BAND_MIN beside the
//            curtain on the side with more room, against the walls (so it can be flown round); after it nothing is asked, since one stroke
//            of the line covers a curtain (CURTAIN_W is at most LINE_INK, the pattern's own test). A curtain is fired only by a hang craft:
//            the rule sees no other.
//   thorn    a thorn piece (course-ground.js) has a width and a height, its height at most -2 * SPAWN_Y so that it comes up whole (the pillar's rule, R19),
//            and a width of at least 2 * SHIP_R + THORN_SLACK, so the gap one broken piece leaves lets the ship through
//   shoot    a hedge is the thorn pieces that share an `at`. One that leaves a gap of BAND_MIN at every row it covers is a way round and the band rule
//            counts its pieces as it counts a pillar's (openThorns); one that leaves none at some row closes the band (closingHedges, found from
//            its pieces, not flagged in the data) and has to be shot through: its weakest piece, whose hp is the entry's or GROUND_HP.thorn, breaks
//            under the base gun (hp shots, SHOT_SECS apart) before the hedge scrolls from the top of the screen to the top of the free zone.
//            A hedge whose pieces sit on different rows is several hedges: if each leaves a way round and together they leave none, the band rule fails

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

const pieces = ({ spawns }) => spawns.filter((e) => e.kind === 'thorn');
const thornRule = (course) => pieces(course).flatMap((p) => {
  const ok = p.w >= 2 * SHIP_R + THORN_SLACK && p.h > 0 && p.h <= -2 * SPAWN_Y;
  return ok ? [] : [`thorn: at ${p.at}: w ${p.w}, h ${p.h}, w at least ${2 * SHIP_R + THORN_SLACK} and h at most ${-2 * SPAWN_Y}`];
});

// The hedges, each the array of its pieces, in order of their first appearance (a piece with no box is the thorn rule's, and takes no part).
function hedgesOf(course) {
  const rows = [];
  for (const p of pieces(course).filter((q) => q.w > 0 && q.h > 0)) {
    const hedge = rows.find((h) => h[0].at === p.at);
    if (hedge) hedge.push(p);
    else rows.push([p]);
  }
  return rows;
}
const closes = (course, hedge) => { // is there a row the hedge covers at which its pieces leave under BAND_MIN?
  const blocks = blocksOf(hedge);
  const rows = rowsOf(Math.ceil(Math.min(...blocks.map((b) => b.top))), Math.floor(Math.max(...blocks.map((b) => b.bottom))));
  return rows.some((at) => widestGap(course, blocks, at) < BAND_MIN);
};
export const closingHedges = (course) => hedgesOf(course).filter((h) => closes(course, h));
export const openThorns = (course) => hedgesOf(course).filter((h) => !closes(course, h)).flat();

function shoot(course) {
  const window = FREE_ZONE.y0 / course.speed; // s a hedge takes to scroll from the top of the screen to the top of the free zone
  return closingHedges(course).flatMap((hedge) => {
    const hp = Math.min(...hedge.map((p) => p.hp ?? GROUND_HP.thorn));
    const secs = hp * SHOT_SECS;
    return secs <= window ? [] : [`shoot: the hedge at ${hedge[0].at} closes the band and its weakest piece (hp ${hp}) takes ${secs.toFixed(2)} s to break, over the ${window.toFixed(2)} s it takes to scroll to the free zone`];
  });
}

export const hedges = (course) => [...thornRule(course), ...shoot(course)];
