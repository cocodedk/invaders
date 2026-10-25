import { w, lv } from './levels-2.js';

// Level data for world 14, in the shorthand explained in levels-2.js (levels-3.js is full). It is a side
// world beside the main run, like worlds 9-13: its own d (difficulty.js) puts it a notch above world 13.
export const SIDE2 = [
  // 14 Ember Carnival: clockwork prizes from the booths, stuffed with powder. Tin drones (g) march
  // in dense blocks, firework rockets (d) dive out of the smoke, jack-in-the-box turrets (u) fire
  // from their springs, tin drummers (a) hold the line and balloon bunches (c) carry. The blocks are
  // three and four rows deep and close set, so a shell that goes up (the twist) has neighbours to
  // set off. Paced like world 6, a notch harder: aimed shots, fans, rain and rings, a laser now and
  // then. Striped booths (bunkers) stand on the second and fourth.
  [
    lv(140417, [
      w('grid', 8, 'ugg', 'aimed', 1.0),
      w('sway', 8, 'gdgg', 'fan', 1.0),
      w('escort', 3, 'gcu', 'rain', 1.05),
    ]),
    lv(140884, [
      w('split', 8, 'ugdg', 'aimed', 1.1),
      w('grid', 9, 'gag', 'fan', 1.1),
      w('rain', 8, 'gdgg', 'rain', 1.1),
      w('orbit', 3, 'ucu', 'spiral', 1.15),
    ], true),
    lv(141333, [
      w('spiral', 8, 'gudg', 'fan', 1.1),
      w('grid', 10, 'gagg', 'ring', 1.1),
      w('sway', 8, 'gdgg', 'aimed', 1.15),
      w('escort', 3, 'aca', 'rain', 1.2),
    ]),
    lv(141796, [
      w('split', 8, 'gagd', 'fan', 1.2),
      w('grid', 8, 'gagg', 'rain', 1.15),
      w('sway', 5, 'dug', 'laser', 1.25),
      w('rain', 10, 'gdgg', 'ring', 1.25),
      w('orbit', 3, 'uca', 'aimed', 1.3),
    ], true),
    lv(142241),
  ],
];
