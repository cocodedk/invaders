// World 19, Rubber Regatta: a sunlit bathhouse at toy scale, the game's first comic world, bright and daylit. An invading fleet of bath
// toys sails in over mountains of foam. The wall is glazed leaf-green tile over the top two thirds, where the fight is, thinning through
// mint steam to cream and butter light at the waterline, with a plain sash window high in one corner and low sun through steamed glass
// (sky-bodies-11.js bathwall). Brass dolphin taps as tall as towers pour thin waterfalls over a coral-and-cream mosaic frieze of leaping
// fish (parallax-bath.js bathtaps); nearer, a shelf skyline of unlabelled bottles and jars in rose, amber and mint, a loofah standing like
// a cactus, a toy lighthouse and mountains of foam (bathshelf); in front the rolled rim of the tub and heaving crests of foam, the
// waterline glinting between them, and the maker's brass plate on the tub's flank (bathfoam). Soap bubbles, steam wisps and water
// glints (ambient-11.js), and flourishes (flourish-bath.js): a giant bubble that pops into a ring of droplets, a colossal drop falling
// from a tap with a crown splash, a wooden toy steamer crossing at the back, and the taps spurting while fx holds a flash tagged 'strike'.
// The value rule: the renderer lights with 'lighter', which vanishes on a pale field, so the wall is mid-value where the fight is and pale
// only below it; no wall stop in the top 70 % is brighter than luminance 0.3, and nothing pale stands behind the alien rows or the boss.
// The red nose is the accent; the enemy's soap blobs are grape with a near-black rim, the one purple in the room.
export default {
  sky: [[0, '#1f5f38'], [0.45, '#2b7d48'], [0.68, '#4fa468'], [0.86, '#eef0cf'], [1, '#ffe1a0']],
  body: 'bathwall',
  haze: '#3c8456',
  layers: [
    { kind: 'bathtaps', color: '#2a6a40', height: 700, speed: 0.06, roughness: 0.4, rim: '#c89a40', haze: 0.18, glow: '#ffe2a0' },
    { kind: 'bathshelf', color: '#1b4a30', height: 460, speed: 0.22, roughness: 0.4, rim: '#f4d2a8', haze: 0.06, glow: '#fff2b0' },
    { kind: 'bathfoam', color: '#f2efe2', height: 320, speed: 0.55, roughness: 0.5, rim: '#ffffff', haze: 0 },
  ],
  ambient: [
    { kind: 'steamwisps', phase: 'mid', n: 10, colors: ['#eef6e4', '#e2eed6'], size: [170, 300], speed: 26, alpha: 0.12 },
    { kind: 'soapbubbles', phase: 'mid', n: 26, colors: ['#ffd6f2', '#d8dcff', '#fff4b8', '#e2ffc8'], size: [7, 22], speed: 30, alpha: 0.36, maxY: 1 },
    { kind: 'waterglints', phase: 'front', n: 30, colors: ['#ffffff', '#fff4c8'], size: [2, 5], speed: 8, alpha: 0.34 },
  ],
  flourish: ['bathbubble', 'bathdrip', 'bathsteamer', 'bathspurt'],
  palette: {
    accent: '#ff3048', shot: '#f3e2c0', beam: '#ffb020', enemy: '#c77dff', enemyRim: '#1a0030',
    alien: { grunt: '#ffc928', diver: '#ff8fb8', gunner: '#b6e84a', armored: '#f08a3c', carrier: '#9cc4ee' },
    boss: { hull: '#ffcf1f', plate: '#ff7a66', weak: '#ff8a1e' },
  },
  bullet: 'orb',
  bunker: { fill: '#5f8f6c', light: '#d6e8cc', dark: '#1d3d29', edge: '#ffcf6a', accent: '#ff7a66', skin: 'rubble' }, // the level has none: rubble if one is ever set
  power: { spread: '#ffe14a', laser: '#7ad8ff', rapid: '#ff9a4a', shield: '#a8b8ff', homing: '#e2a2ff', slow: '#fff0c8', bomb: '#ff4a5a', life: '#9dff7a' },
  music: { mood: 'bath', root: 'F', scale: 'sunny', bpm: 118 }, // marimba and kalimba over a lazy two-beat bounce, F in a major with no leading tone
  tint: { shade: 'rgba(255,206,90,0.22)', glow: 'rgba(255,236,170,0.08)' }, // the frame in bullet time and the slow power: butter light
};
