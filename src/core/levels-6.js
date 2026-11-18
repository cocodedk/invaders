import { w, lv } from './levels-2.js';

// Level data for world 20, in the shorthand explained in levels-2.js (levels-5.js holds world 19).
// Not yet joined to LEVELS: that happens when world 20 is listed in WORLDS.
export const PRESS = [
  // 20 Midnight Press: a printing hall at night (the twist 'echo'). Loose type (g) drifts in wide galleys,
  // ink drops (d) fall from the rollers, press heads (u) and lead slugs (a) hold the lines, and folded
  // sheets (c) carry. The carbon copy doubles the ship's fire, so the blocks run deep and the rain is thick;
  // a notch above world 19 by d.
  [
    lv(200417, [
      w('grid', 8, 'uggg', 'aimed', 1.0),
      w('rain', 8, 'gdg', 'rain', 1.0),
      w('escort', 3, 'aca', 'fan', 1.05),
      w('sway', 8, 'gagg', 'fan', 1.05),
    ]),
    lv(200863, [
      w('split', 8, 'guga', 'fan', 1.05),
      w('spiral', 8, 'dud', 'spiral', 1.1),
      w('orbit', 3, 'uca', 'ring', 1.1),
      w('dive', 8, 'dgug', 'aimed', 1.1),
    ]),
    lv(201329, [
      w('grid', 10, 'ugag', 'laser', 1.1),
      w('rain', 8, 'dgda', 'rain', 1.15),
      w('orbit', 6, 'gug', 'ring', 1.15),
      w('escort', 3, 'gcu', 'homing', 1.15),
      w('sway', 8, 'gaug', 'fan', 1.2),
    ]),
    lv(201788, [
      w('spiral', 8, 'udu', 'spiral', 1.15),
      w('split', 10, 'gagg', 'aimed', 1.2),
      w('dive', 8, 'dgad', 'fan', 1.2),
      w('rain', 10, 'gdg', 'rain', 1.2),
      w('orbit', 3, 'aca', 'ring', 1.25),
    ]),
    lv(202251),
  ],
];
