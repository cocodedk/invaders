// The Dowager Duck's rage layers (World 19, Rubber Regatta; duck.js hands them to the boss cache): extra hull lights that fade in with a phase, art
// only (the core sends the attacks). Hull-sized, additive, drawn under the parts (the system skips them below quality 1), origin at her centre.
// The light is laid round her outline, where it stands on the green wall (on her bright rubber, light only pales it). HOVER, sprung a leak: a
// coral flush all round her, warmest at the tum where the leak is, and the steam of her temper rising off the cap. ORBIT, the valve gone: a hot red
// glare round her, her cheeks burning, and the rush of air out from under her lit pale. Nothing above y = TOP + 2. Bake-time only.
import { PAL, PART, bloom } from './duck-kit.js';
import { PIECES } from './duck-shape.js';

const RIM = ['cap', 'head', 'body', 'bandL', 'bandR', 'wingL', 'wingR'].flatMap((id) => PIECES[id].filter((_, i) => i % 6 === 0));
const RED = '#ff3048'; // the look's accent, her temper

function aura(g, c, r, a) {
  for (const [x, y] of RIM) bloom(g, x, y, r, c, a);
}

function steam(g, k) {
  for (const s of [-1, 1]) {
    bloom(g, s * 200, -120, 50, '#ffffff', 0.16 * k);
    bloom(g, s * 228, -150, 34, '#ffffff', 0.12 * k);
  }
}

export const rage = [
  null,
  (g) => {
    aura(g, PAL.coral, 44, 0.07);
    bloom(g, PART.belly.x + 40, PART.belly.y, 100, PAL.coral, 0.22);
    steam(g, 1);
  },
  (g) => {
    aura(g, RED, 60, 0.1);
    aura(g, PAL.orange, 30, 0.08);
    for (const s of [-1, 1]) bloom(g, s * 138, -54, 46, RED, 0.34);
    bloom(g, PART.squeak.x, PART.squeak.y + 20, 90, '#fff4e2', 0.34);
    bloom(g, PART.belly.x + 40, PART.belly.y, 100, PAL.coral, 0.3);
    steam(g, 1.6);
  },
];
