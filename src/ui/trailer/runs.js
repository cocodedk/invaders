// The best run per level, as Cinema keeps it. DOM-free (storage is passed in).
//   saveBestRun(store, outcome) -> 'saved' | 'unsaved' (storage refused: full or blocked) | 'skip'
//     only a cleared level played for real (not the demo), untainted (outcome.run is null when a
//     ?debug hook touched it), whose score beat the level's best: only the best run is kept.
//     A refusal never throws and never touches the best score; storage keeps the run in memory, so
//     this session can still watch it.
//   cinemaReels(store) -> [{ level, run }]   every level with a playable saved run, in level order;
//     a corrupted, cut-off, old-version or mislabelled run is skipped (decodeRun says null).
import { LEVELS } from '../../core/levels.js';
import { decodeRun } from '../../core/replay.js';

export function saveBestRun(store, o) {
  if (!o.run || o.mode !== 'play' || !o.cleared || !o.newBest) return 'skip';
  return store.setBestRun(o.level.id, o.run) ? 'saved' : 'unsaved';
}

export function cinemaReels(store) {
  const out = [];
  for (const level of LEVELS) {
    const run = decodeRun(store.bestRun(level.id));
    if (run && run.level === level.id) out.push({ level, run });
  }
  return out;
}
