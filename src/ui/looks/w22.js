// World 22, Wanderlight: a top-down scrolling course over a land that is only a pencil sketch on warm parchment (the owner's mockup, kept
// that simple: his "the journey is more important to me right now than the glitter"). `ground: true` is what sets it apart: view.js draws
// the course (course-view.js) where the other worlds draw their sky and layers, so the sky body, the three layers and the ambient and
// flourish lists below stand only for the registries and the tests that walk every look (the sky's top colour is the letterbox's, and
// the lobby's cards take their gradient from it). The kites are grey, so everything that hurts is violet, and what the ship shoots is warm.
import { PAL } from '../wander-kit.js';

export default {
  ground: true,
  sky: [[0, PAL.parchment], [1, PAL.rock]],
  body: 'arcade',
  haze: PAL.rock,
  layers: [
    { kind: 'ground', color: PAL.rock, height: 70, speed: 0.1, roughness: 0, line: PAL.pencil, rim: PAL.pencil, haze: 0 },
    { kind: 'ground', color: PAL.rock, height: 70, speed: 0.25, roughness: 0, line: PAL.pencil, rim: PAL.pencil, haze: 0 },
    { kind: 'ground', color: PAL.rock, height: 70, speed: 0.6, roughness: 0, line: PAL.pencil, rim: PAL.pencil, haze: 0 },
  ],
  ambient: [],
  flourish: [],
  palette: {
    accent: PAL.gold, shot: '#ffd98a', beam: PAL.goldDeep, enemy: PAL.violet, enemyRim: PAL.violetRim,
    alien: { grunt: PAL.kite, diver: '#d8d5cf', gunner: '#b4b0c4', armored: PAL.stone, carrier: PAL.gold },
    boss: { hull: PAL.stoneDark, plate: PAL.stone, weak: PAL.violet },
  },
  bullet: 'orb',
  bunker: { fill: PAL.stone, light: PAL.stoneLight, dark: PAL.stoneDark, edge: PAL.pencil, skin: 'rubble' }, // the legs have none
  power: { spread: '#e0a21f', laser: '#2f9fb0', rapid: '#d9602f', shield: '#4a6fc4', homing: '#9a5cc4', slow: '#7a8a9a', bomb: '#c4303a', life: '#4f9a3a' },
  music: { mood: 'road', root: 'D', scale: 'major', bpm: 124 }, // D major at a dance tempo: a plucked lead and a pad over a stomp and clap (music-road.js)
  tint: { shade: 'rgba(122,92,196,0.14)', glow: 'rgba(233,185,73,0.05)' }, // the frame in bullet time and the slow power: violet and gold
};
