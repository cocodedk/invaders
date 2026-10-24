import { w, lv } from './levels-2.js';

// Level data for world 9, in the shorthand explained in levels-2.js. World 9 is a breather beside
// the main run: its own d (difficulty.js) puts it near worlds 4-5, so its waves are paced like theirs.
export const SIDE = [
  // 9 Tidal Siege: the beast's brood comes in off the sea: crabs sway along the quay, rays dive
  // out of the spray, jellyfish drift in escort. The piers (bunkers) stand on the first and third.
  [
    lv(90213, [
      w('sway', 8, 'ugg', 'aimed', 1.0),
      w('dive', 6, 'dgg', 'fan', 1.0),
      w('escort', 3, 'gcu', 'aimed', 1.05),
    ], true),
    lv(90658, [
      w('rain', 8, 'ugg', 'rain', 1.05),
      w('split', 8, 'dga', 'fan', 1.05),
      w('grid', 7, 'gag', 'aimed', 1.1),
      w('orbit', 3, 'uca', 'fan', 1.1),
    ]),
    lv(91127, [
      w('dive', 8, 'dgu', 'fan', 1.1),
      w('spiral', 6, 'uag', 'aimed', 1.1),
      w('rain', 8, 'gug', 'rain', 1.1),
      w('escort', 3, 'aca', 'fan', 1.15),
    ], true),
    lv(91584, [
      w('split', 8, 'gud', 'fan', 1.1),
      w('orbit', 6, 'gag', 'fan', 1.1),
      w('dive', 6, 'dgu', 'aimed', 1.15),
      w('escort', 3, 'uca', 'fan', 1.15),
    ]),
    lv(92046),
  ],
];
