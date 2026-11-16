// World 19's diver knocked out (see w19-soap.js and bodies-view.js), drawn into a single context: the Slipper worn round into a pebble
// of soap, lying tipped, its stamp half rubbed away, cross-eyed, its mouth a wobble with a bubble blown out of it.
import { ink, lin, rgba, shade, mix, line, ellipse, INK, crossEyes, bubble } from './w19-kit.js';

export function dizzySoap(g, c) {
  g.save();
  g.rotate(-0.25);
  ellipse(g, 4, 6, 27, 19); // its side
  ink(g, lin(g, 0, -10, 0, 25, [[0, mix(c, '#7a1030', 0.35)], [1, mix(c, '#4a0818', 0.6)]]), 2.6);
  ellipse(g, 0, 0, 27, 19);
  ink(g, lin(g, -26, -18, 26, 18, [[0, shade(c, 0.5)], [0.4, shade(c, 0.1)], [1, mix(c, '#a01848', 0.3)]]), 2.6);
  ellipse(g, 0, 0, 22, 14.5); // the bevel
  line(g, rgba('#fff0f6', 0.6), 1.3);
  ellipse(g, 0.8, 1, 22, 14.5);
  line(g, rgba('#8a1840', 0.3), 1);
  g.beginPath(); // the stamp, half rubbed away
  g.ellipse(-2, -9, 9, 4, 0, 3.4, 6.2);
  line(g, rgba('#7a1030', 0.4), 1.1);
  g.restore();
  crossEyes(g, -2, -3, 15, 5.4);
  g.beginPath(); // the wobble of a mouth
  g.moveTo(-10, 9);
  for (let i = 1; i <= 6; i++) g.lineTo(-10 + i * 3.4, 9 + (i % 2 ? 2.4 : -0.6));
  line(g, INK, 1.8);
  bubble(g, null, 15, 15, 6, 4);
  bubble(g, null, 24, 7, 3.4, 6);
  bubble(g, null, -24, 14, 2.6, 2);
}
