// World 21, Golden Isle: dusk over a warm sea before an island city of gold, the last battle of a long war. The sky (sky-bodies-13.js
// isledusk) is low monsoon cloud lit gold and crimson round a great low sun, arrows of light streaking high like comets, the great
// vulture gliding and the champion leaping with a mountain held up; far off, the city of gold on its three-peaked mountain, walled
// terraces of palaces, domes and towers, some roofs burning, and the captive queen's grove (parallax-isle.js islecity); nearer, a
// causeway of great floating stones crosses the sea toward it, lit by torches, the monkey host crossing it with boulders
// (islecauseway); in front the swell of the sea, floating stones, brass lamps and lotus, the near shore where the host masses behind
// the archer, and the palm-leaf page of the maker's mark low on the right (islesea). Embers rise and marigold petals fall
// (ambient-13.js). The renderer lights with 'lighter', so the gold is kept low and the sky above the fight mid-dark.
import { PAL, MID_HEIGHT } from '../isle-kit.js';

export default {
  sky: [[0, '#100a20'], [0.3, '#24122c'], [0.5, '#3e1630'], [0.62, '#7a2a30'], [0.78, '#c4562e'], [1, '#e8a04a']],
  body: 'isledusk',
  haze: '#5a2430',
  layers: [
    { kind: 'islecity', color: '#1a0e1c', height: 830, speed: 0.06, roughness: 0.4, rim: '#c8903a', haze: 0.18, glow: PAL.gold },
    { kind: 'islecauseway', color: '#120e22', height: MID_HEIGHT, speed: 0.22, roughness: 0.4, rim: '#c87a3a', haze: 0.06, glow: PAL.ember },
    { kind: 'islesea', color: '#0c0a1a', height: 380, speed: 0.55, roughness: 0.5, rim: '#b0703a', haze: 0 },
  ],
  ambient: [
    { kind: 'marigolds', phase: 'mid', n: 18, colors: [PAL.marigold, PAL.marigoldDeep, PAL.gold], size: [10, 18], speed: 26, alpha: 0.55 },
    { kind: 'isleembers', phase: 'front', n: 40, colors: [PAL.ember, PAL.flame, PAL.gold], size: [1.2, 2.8], speed: 34, alpha: 0.4, additive: true },
  ],
  flourish: [],
  palette: {
    gold: PAL.gold, crimson: PAL.crimson, // the isle's colours, which the cast, the ship and the shots are painted in
    accent: PAL.gold, shot: PAL.goldPale, beam: '#ffb347', enemy: '#ff5a3a', enemyRim: '#2a0e14',
    alien: { grunt: '#e8b84a', diver: '#ffd27a', gunner: '#d8503a', armored: '#9a7a4a', carrier: '#f0a060' },
    boss: { hull: '#3a1a24', plate: '#2e6a4a', weak: PAL.crimson },
  },
  bullet: 'orb',
  bunker: { fill: '#3c3644', light: '#a08460', dark: '#120e22', edge: '#f2c14e', accent: '#c4303a', skin: 'rubble' }, // the levels have none: rubble if one is ever set
  power: { spread: '#ffe14a', laser: '#7ad8ff', rapid: '#ff9a4a', shield: '#a8b8ff', homing: '#e2a2ff', slow: '#fff0c8', bomb: '#ff4a5a', life: '#9dff7a' },
  music: { mood: 'isle', root: 'E', scale: 'doubleharmonic', bpm: 96 }, // part 026 makes the mood and the scale
  tint: { shade: 'rgba(196,48,58,0.18)', glow: 'rgba(242,193,78,0.06)' }, // the frame in bullet time and the slow power: crimson and gold
};
