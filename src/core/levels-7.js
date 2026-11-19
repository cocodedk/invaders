import { w, lv } from './levels-2.js';

// Level data for world 21, in the shorthand explained in levels-2.js (levels-6.js holds world 20).
export const ISLE = [
  // 21 Golden Isle: the last battle at dusk before an island city of gold (the twist 'quiver'). Foot soldiers (g)
  // march in wide ranks, winged demons (d) stoop from the towers, archers (u) and shield bearers (a) hold the
  // lines, and war chariots (c) carry. The returning arrow gives every shot a second pass, so the ranks run deep;
  // a notch above world 20 by d. The boss level is the Ten-Crowned King (crowns).
  [
    lv(210433, [
      w('grid', 8, 'ugga', 'aimed', 1.0),
      w('escort', 3, 'aca', 'fan', 1.0),
      w('dive', 8, 'dgd', 'aimed', 1.05),
      w('sway', 10, 'guag', 'fan', 1.05),
    ]),
    lv(210877, [
      w('split', 8, 'gaug', 'fan', 1.05),
      w('rain', 8, 'dgd', 'rain', 1.1),
      w('orbit', 3, 'uca', 'ring', 1.1),
      w('grid', 10, 'agug', 'laser', 1.1),
    ]),
    lv(211342, [
      w('spiral', 8, 'dud', 'spiral', 1.1),
      w('sway', 10, 'gaug', 'aimed', 1.15),
      w('escort', 3, 'gcu', 'homing', 1.15),
      w('dive', 8, 'dagd', 'fan', 1.15),
      w('orbit', 6, 'gug', 'ring', 1.2),
    ]),
    lv(211806, [
      w('grid', 10, 'uaga', 'laser', 1.15),
      w('split', 10, 'gdag', 'aimed', 1.2),
      w('spiral', 8, 'udu', 'spiral', 1.2),
      w('rain', 10, 'dgd', 'rain', 1.2),
      w('escort', 3, 'aca', 'ring', 1.25),
    ]),
    lv(212279),
  ],
];
