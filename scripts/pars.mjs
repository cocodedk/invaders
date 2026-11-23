// Writes src/core/pars.js: each level's par time (R66), twice the seconds of play the autopilot takes to
// clear it from the level's own seed when it is never hit, rounded up to 5 s. Run it again whenever a
// level, a rule or the autopilot changes how long the clears take (test/core/pars.test.js says so). A course level (world 22) is
// skipped: the autopilot cannot fly one, and src/core/pars.js computes its par from its data.
//
//   node scripts/pars.mjs [--check]     --check prints the pars that would change, and writes nothing
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LEVELS } from '../src/core/levels.js';
import { createWorld, stepWorld } from '../src/core/world.js';
import { autopilot } from '../src/core/autopilot.js';
import { TICK, INTRO } from '../src/core/kinds.js';
import { PARS } from '../src/core/pars.js';

const MEASURED = LEVELS.filter((l) => !l.course); // the levels the autopilot flies, and so the table's keys

const LIMIT = 600; // s: a level the autopilot cannot clear in this long is an error, not a par

export function parFor(level) {
  const w = createWorld(level, level.seed);
  w.ship.invuln = Infinity;
  for (let i = 0; i < LIMIT / TICK && w.state !== 'cleared'; i++) {
    stepWorld(w, TICK, autopilot(w));
    w.events.length = 0;
  }
  if (w.state !== 'cleared') throw new Error(`${level.id}: the autopilot did not clear it in ${LIMIT} s`);
  return Math.ceil((2 * (w.t - INTRO)) / 5) * 5;
}

// The table as it would be written, and the levels whose par in src/core/pars.js differs from it.
export function currentPars() {
  const table = Object.fromEntries(MEASURED.map((l) => [l.id, parFor(l)]));
  const changed = MEASURED.filter((l) => PARS[l.id] !== table[l.id]).map((l) => `${l.id} ${PARS[l.id] ?? '-'} -> ${table[l.id]}`);
  return { table, changed };
}

function write(table) {
  const rows = [];
  for (let i = 0; i < MEASURED.length; i += 5) {
    rows.push('  ' + MEASURED.slice(i, i + 5).map((l) => `'${l.id}': ${table[l.id]}`).join(', ') + ',');
  }
  writeFileSync(new URL('../src/core/pars.js', import.meta.url), `// Each level's par time in seconds (R66): twice what the autopilot takes to clear it when it is never
// hit, rounded up to 5 s. The round's speed multiplier is measured against it (scoring.js speedOf).
// scripts/pars.mjs writes this table; test/core/pars.test.js checks that it is current. A course level (world 22) has no entry:
// the autopilot cannot fly one, so its par is computed from its data (parOf).
import { HOLD_PAR } from './course-kinds.js';

export const PARS = {
${rows.join('\n')}
};
export const DEFAULT_PAR = 60; // s, for a level with no entry (the tests' own levels)

const ceilTo5 = (s) => Math.ceil(s / 5) * 5;
// A course's par: the seconds its scroll takes plus HOLD_PAR for each hold, rounded up to 5 s.
const courseParOf = ({ speed, length, spawns }) => ceilTo5(length / speed + HOLD_PAR * spawns.filter((e) => e.kind === 'hold').length);
export const parOf = (level) => (level.course ? courseParOf(level.course) : PARS[level.id] ?? DEFAULT_PAR);
`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { table, changed } = currentPars();
  if (process.argv.includes('--check')) console.log(changed.length ? changed.join('\n') : 'every par is current');
  else {
    write(table);
    console.log(`wrote ${MEASURED.length} pars, ${changed.length} changed`);
  }
}
