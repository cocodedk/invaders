import { w, lv } from './levels-2.js';

// Level data for worlds 9 and 10, in the shorthand explained in levels-2.js. Both are breathers beside
// the main run: their own d (difficulty.js) puts world 9 near worlds 4-5 and world 10 between worlds
// 3 and 4, so their waves are paced like those.
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
  // 10 Hollow Night: the night's guests come up the hill. Ghosts drift in on the wind, bats dive
  // from the belfry, jack-o'-lanterns spit embers, coffins march in step and cauldrons carry the
  // brew. A gentler night than the harbour, so single armored rows and slower waves. The headstones
  // (bunkers) stand on the first and third.
  [
    lv(100317, [
      w('sway', 8, 'ugg', 'aimed', 0.95),
      w('dive', 6, 'dgg', 'aimed', 0.95),
      w('escort', 3, 'gcu', 'aimed', 1.0),
    ], true),
    lv(100764, [
      w('spiral', 6, 'ugg', 'aimed', 1.0),
      w('grid', 8, 'gag', 'aimed', 1.0),
      w('dive', 6, 'dgg', 'aimed', 1.0),
      w('orbit', 3, 'ucg', 'fan', 1.05),
    ]),
    lv(101249, [
      w('split', 8, 'ugu', 'fan', 1.05),
      w('sway', 8, 'gag', 'aimed', 1.05),
      w('dive', 6, 'dgu', 'fan', 1.05),
      w('escort', 3, 'gcu', 'fan', 1.1),
    ], true),
    lv(101682, [
      w('spiral', 6, 'gug', 'aimed', 1.0),
      w('grid', 7, 'gag', 'aimed', 1.0),
      w('rain', 6, 'dgg', 'fan', 1.05),
      w('orbit', 3, 'gca', 'fan', 1.05),
    ]),
    lv(102158),
  ],
];
