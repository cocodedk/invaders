// The trailer's words: three title cards per world in that world's voice, filled from the run's
// stats, and the final card (the world as a film title, stars as the critics', the score as box
// office). DOM-free. Every line is original, and every placeholder has a form for zero, so a card
// still reads like a trailer when a stat is 0 ("NO NEAR MISSES", "NO COMBO NEEDED", "AN INSTANT").
//   statsOf(events, ticks) -> { kills, near, combo, time (s), bombs, stars, hits }
//   cardsFor(world, stats) -> [[line, ...] x 3]       fillLine(template, stats) -> line
//   finalCard({ level, stats, stars, score, newBest }) -> { kicker, title, stars, label, score, value, record, billing }
import { WORLDS } from '../../core/levels.js';
import { TICK } from '../../core/kinds.js';

const fmt = (n) => Math.round(n).toLocaleString('en-US');

// n of a thing: "NOT ONE INVADER" / "ONE INVADER" / "47 INVADERS"
const count = (none, one, many) => (n) => (n <= 0 ? none : n === 1 ? one : `${fmt(n)} ${many}`);

function time(secs) {
  const s = Math.round(secs);
  if (secs < 1 || s < 1) return 'AN INSTANT';
  if (s === 1) return 'ONE SECOND';
  if (s < 90) return `${s} SECONDS`;
  return `${Math.round(s / 60)} MINUTES`;
}

const PHRASE = {
  kills: count('NOT ONE INVADER', 'ONE INVADER', 'INVADERS'),
  near: count('NO NEAR MISSES', 'ONE NEAR MISS', 'NEAR MISSES'),
  combo: (n) => (n >= 2 ? `A ×${n} COMBO` : 'NO COMBO NEEDED'),
  time,
  bombs: count('NO BOMBS', 'ONE BOMB', 'BOMBS'),
  stars: count('NO STARS', 'ONE STAR', 'STARS'),
};

export const KEYS = Object.keys(PHRASE);

// Per world, in world order: the opening line, then two cards that speak from the stats.
export const VOICES = [
  [ // Arcade Origin: earnest, coin-op
    ['IT BEGAN', 'WITH A SINGLE COIN.'],
    ['{kills}.', '{near}.', 'ONE PILOT.'],
    ['{combo}.', 'NO CONTINUES.'],
  ],
  [ // Neon Rain: noir
    ['IN A CITY', 'OF ENDLESS RAIN…'],
    ['{kills} WENT DARK.', '{near} IN THE NEON.'],
    ['{combo}.', 'NO WITNESSES.'],
  ],
  [ // Twin Suns: desert epic
    ['ON A WORLD', 'OF SAND AND TWIN FIRE…'],
    ['{kills}', 'BURIED IN SAND.'],
    ['{time}', 'UNDER TWO SUNS.'],
  ],
  [ // Ronin Moon: terse, a brushstroke
    ['BENEATH A RED MOON,', 'ONE BLADE WAITS.'],
    ['{kills}.', 'ONE BLADE.'],
    ['{near}.', 'NOT ONE WASTED STEP.'],
  ],
  [ // Hive: dread
    ['DEEP IN THE CAVERNS,', 'SOMETHING IS WAKING.'],
    ['{kills}.', '{near}.', 'THE NEST REMEMBERS.'],
    ['{bombs}.', 'NO WAY BACK UP.'],
  ],
  [ // Code Rain: a terminal log
    ['EVERY STAR', 'IS A LINE OF CODE.'],
    ['{kills} DELETED.', '{near} LOGGED.'],
    ['{time} OF UPTIME.', 'ZERO ERRORS.'],
  ],
  [ // Iron Dawn: heavy metal
    ['THE WAR NEVER ENDED.', 'IT WAITED.'],
    ['{kills} SCRAPPED.', '{bombs} DROPPED.'],
    ['{combo}.', 'NO SURRENDER.'],
  ],
  [ // Event Horizon: time bends
    ['AT THE EDGE OF THE DARK,', 'TIME BENDS.'],
    ['{time} AT THE EDGE.', 'YEARS EVERYWHERE ELSE.'],
    ['{kills}.', '{near}.', 'ONE WAY HOME.'],
  ],
];

export const fillLine = (template, stats) => template.replace(/\{(\w+)\}/g, (_, k) => PHRASE[k](stats[k] ?? 0));

export const cardsFor = (world, stats) => VOICES[(world - 1) % VOICES.length].map((card) => card.map((l) => fillLine(l, stats)));

export function statsOf(events, ticks) {
  const s = { kills: 0, near: 0, combo: 0, time: Math.max(0, ticks) * TICK, bombs: 0, stars: 0, hits: 0 };
  for (const e of events) {
    if (e.type === 'kill') {
      s.kills += 1;
      if (e.scored) s.combo = Math.max(s.combo, e.mult);
    } else if (e.type === 'nearMiss') s.near += 1;
    else if (e.type === 'bomb') s.bombs += 1;
    else if (e.type === 'shipHit') s.hits += 1;
    else if (e.type === 'cleared') s.stars = e.stars;
  }
  return s;
}

const runningTime = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function finalCard({ level, stats, stars, score, newBest }) {
  const reel = level.boss ? 'FINALE' : `REEL ${level.index}`;
  return {
    kicker: `WORLD ${level.world} · ${reel}`,
    title: WORLDS[level.world - 1].name.toUpperCase(),
    stars: Math.max(0, Math.min(3, stars | 0)),
    label: newBest ? 'RECORD BOX OFFICE' : 'BOX OFFICE',
    score: fmt(Math.max(0, score)),
    value: Math.max(0, score),
    record: Boolean(newBest),
    billing: `STARRING YOU · RUNNING TIME ${runningTime(stats.time)} · NOW SHOWING`,
  };
}
