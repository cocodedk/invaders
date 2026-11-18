// World 20, Midnight Press: a great printing hall at night, in cream paper, ink black and one vermilion spot colour. The back wall
// (sky-bodies-12.js presshall) is dark under an iron roof, with three tall arched windows letting in the moon, a far drying line of
// sheets and lamps on long cords; the presses stand as tall as towers, flywheels beside them (parallax-press.js presstowers); nearer,
// sheets hang drying on lines like sails over bundles of paper (presslines); in front the floor of the hall with type cases, ink rollers
// and stacks of paper, and the colophon tacked low on the right (pressfloor). Type drifts in the air and paper dust hangs in the lamplight
// (ambient-12.js). The renderer lights with 'lighter', so the hall stays dark where the fight is; the pale paper is kept low.
import { PAL } from '../press-kit.js';

export default {
  sky: [[0, '#07070c'], [0.45, '#121019'], [0.75, '#1f1a1c'], [1, '#3a2c22']],
  body: 'presshall',
  haze: '#1a1720',
  layers: [
    { kind: 'presstowers', color: '#17151d', height: 720, speed: 0.06, roughness: 0.4, rim: '#5a5262', haze: 0.18, glow: PAL.lamp },
    { kind: 'presslines', color: '#0f0e13', height: 480, speed: 0.22, roughness: 0.4, rim: '#8a7c66', haze: 0.08, glow: PAL.lamp },
    { kind: 'pressfloor', color: '#0a090d', height: 300, speed: 0.55, roughness: 0.5, rim: '#4a4048', haze: 0 },
  ],
  ambient: [
    { kind: 'presstype', phase: 'mid', n: 22, colors: [PAL.paper, PAL.paperShade, PAL.vermilion], size: [18, 34], speed: 14, alpha: 0.3 },
    { kind: 'papermotes', phase: 'front', n: 40, colors: [PAL.lamp, PAL.paper], size: [1.5, 3.5], speed: 10, alpha: 0.28, additive: true },
  ],
  flourish: [],
  palette: {
    paper: PAL.paper, ink: PAL.ink, vermilion: PAL.vermilion, // the hall's three colours, which the cast, the ship and the shots are painted in
    accent: PAL.vermilion, shot: PAL.paper, beam: '#ff8a4a', enemy: PAL.vermilion, enemyRim: PAL.ink,
    alien: { grunt: '#e8dcc0', diver: '#ff6a48', gunner: '#c8b994', armored: '#8a8090', carrier: '#f0b090' },
    boss: { hull: '#2a2632', plate: '#3c8a52', weak: PAL.vermilion },
  },
  bullet: 'orb',
  bunker: { fill: '#3a3440', light: '#c8b994', dark: '#0d0b10', edge: '#efe4c8', accent: '#e2401c', skin: 'rubble' }, // the level has none: rubble if one is ever set
  power: { spread: '#ffe14a', laser: '#7ad8ff', rapid: '#ff9a4a', shield: '#a8b8ff', homing: '#e2a2ff', slow: '#fff0c8', bomb: '#ff4a5a', life: '#9dff7a' },
  music: { mood: 'press', root: 'D', scale: 'night', bpm: 84 }, // part 5 makes the mood: a slow mechanical pulse, a press turning over
  tint: { shade: 'rgba(226,64,28,0.18)', glow: 'rgba(239,228,200,0.06)' }, // the frame in bullet time and the slow power: vermilion
};
