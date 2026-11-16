import { w, lv } from './levels-2.js';

// Level data for world 19, in the shorthand explained in levels-2.js (levels-4.js is full).
export const REGATTA = [
  // 19 Rubber Regatta: a fleet of bath toys sails in over the foam (R71, the twist 'bonk'). Rubber
  // ducklings (g) bob in deep, close-set blocks so a batted body has neighbours to bowl through, soap bars
  // (d) squirt out, squirt frogs (u) and sponges (a) are the stoppers (both survive one bonk), and paper
  // boats (c) carry. Mid-hard, near worlds 12 and 13; w19-4's third wave is the skittle alley.
  [
    lv(190433, [
      w('grid', 8, 'uggg', 'aimed', 0.95),
      w('rain', 6, 'gdg', 'rain', 1.0),
      w('escort', 3, 'gcu', 'aimed', 1.0),
      w('sway', 8, 'ggag', 'fan', 1.0),
    ]),
    lv(190871, [
      w('split', 8, 'gugu', 'fan', 1.0),
      w('orbit', 6, 'gug', 'ring', 1.05),
      w('dive', 8, 'dgug', 'aimed', 1.05),
      w('escort', 4, 'ucu', 'fan', 1.05),
    ]),
    lv(191306, [
      w('grid', 10, 'ugga', 'aimed', 1.05),
      w('spiral', 8, 'dud', 'spiral', 1.1),
      w('dive', 8, 'dgug', 'fan', 1.1),
      w('orbit', 3, 'aca', 'ring', 1.1),
      w('rain', 8, 'gdga', 'rain', 1.15),
    ]),
    lv(191752, [
      w('sway', 8, 'ugag', 'fan', 1.05),
      w('rain', 8, 'dgd', 'rain', 1.1),
      w('grid', 10, 'gagg', 'ring', 1.1),
      w('split', 8, 'gagg', 'aimed', 1.1),
      w('orbit', 3, 'gca', 'fan', 1.15),
    ]),
    lv(192209),
  ],
];
