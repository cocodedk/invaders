// Per-world art direction, one data file per world (w1.js .. w8.js), plain data:
//   sky       gradient stops [[at, colour], ...] top to bottom
//   body      what is baked into the sky (sky-bodies.js); haze: colour far layers fade toward
//   layers    3 parallax bands, far to near (parallax.js; kinds in parallax-shapes/-city/-wild.js)
//   ambient   particle entries per depth (ambient.js); flourish: animated extras (flourish.js)
//   palette   accent (HUD, engine), shot, beam (laser power), enemy + enemyRim (bullets), alien
//             colours per role and boss colours (the stubs; Tasks 9/10 bring the real sprites)
//   bullet    how enemy bullets are drawn: 'orb' | 'bolt' | 'pixel' (bullets-view.js)
//   bunker    { fill, light, dark, edge }; power: tint per pickup kind; music: { mood, root, scale, bpm }
import w1 from './w1.js';
import w2 from './w2.js';
import w3 from './w3.js';
import w4 from './w4.js';
import w5 from './w5.js';
import w6 from './w6.js';
import w7 from './w7.js';
import w8 from './w8.js';

export const LOOKS = [w1, w2, w3, w4, w5, w6, w7, w8].map((look, i) => ({ world: i + 1, mist: null, ...look }));

export const lookFor = (level) => LOOKS[(level.world ?? 1) - 1] ?? LOOKS[0];
