import { w, lv } from './levels-2.js';

// Level data for worlds 14-15, in the shorthand explained in levels-2.js (levels-3.js is full). Both are
// side worlds beside the main run, like worlds 9-13: their own d (difficulty.js) puts world 14 a notch
// above world 13 and world 15 a notch above world 14.
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
  // 15 Lantern Deep: the sea under a sunken kingdom, where everything makes its own light. Lantern
  // jellyfish (g) drift in deep columns, darting squid (d) shoot out of the dark, pufferfish (u) puff
  // and fire, hermit crabs in diving helmets (a) hold the line and sea turtles with lanterns (c) carry.
  // Paced like world 6, a notch harder than world 14: aimed shots, fans, rain and rings, a laser now
  // and then. Squid lead most waves, which the pearls meet as they come in, and the columns are four
  // and five rows deep, which the trident runs through. Reef-stone bunkers stand on the second and
  // fourth.
  [
    lv(150417, [
      w('dive', 6, 'dgdg', 'aimed', 1.0),
      w('sway', 8, 'gdgg', 'fan', 1.0),
      w('escort', 3, 'gcu', 'rain', 1.05),
    ]),
    lv(150884, [
      w('rain', 8, 'gdgg', 'aimed', 1.1),
      w('dive', 6, 'dugd', 'fan', 1.1),
      w('split', 8, 'ugdg', 'rain', 1.1),
      w('orbit', 3, 'ucu', 'spiral', 1.15),
    ], true),
    lv(151333, [
      w('grid', 8, 'gdgag', 'fan', 1.05),
      w('dive', 8, 'dgdg', 'aimed', 1.1),
      w('spiral', 6, 'dugd', 'aimed', 1.15),
      w('escort', 3, 'aca', 'rain', 1.2),
    ]),
    lv(151796, [
      w('rain', 8, 'dgag', 'fan', 1.2),
      w('dive', 6, 'dgdg', 'rain', 1.2),
      w('split', 8, 'gdag', 'fan', 1.2),
      w('orbit', 3, 'uca', 'aimed', 1.3),
    ], true),
    lv(152241),
  ],
];
