// The sprites of the things that stand on a course's ground (world 22; course-objects.js places them): the mockup's standing stone (a grey egg
// with a lit patch and one eye, shut while it sleeps), the stone with its eye open (a turret), a grey cage round a prize (a crate), a pillar
// (a pale slatted box, the mockup's bridge), a stone ring round an eye (a gate), and the lantern post (dull until reached, brass once lit).
// Every one is baked once. A round object reaches GROUND_R from its centre (the core's reach for the seeds' bursts and the shots, course-ground.js),
// so the stone is the mockup's scaled to reach it, and a pillar is exactly its w x h, which is the box that rams. Only the pupil and the lantern's
// glow are drawn live (by course-objects.js), each a cached sprite scaled. Plain shapes, no gradients but the glow's, no shadow blur.
import { cached, rgba } from './sprites.js';
import { TAU } from '../core/math.js';
import { GROUND_R } from '../core/course-ground.js';
import { PAL } from './wander-kit.js';

export const MOCK_STONE_REACH = 30; // px from its centre the mockup's stone reaches: its 28 half height and a px of outline
export const OBJECT_SCALE = GROUND_R / MOCK_STONE_REACH; // a round thing reaches GROUND_R here, the mockup's stone scaled to it
export const SHADOW_DX = 10; // px: the shadow lies this far to the right of the thing and
export const SHADOW_DY = 14; // this far below it, so it is in the air above its shadow
export const ROUND_HALF = GROUND_R + SHADOW_DX + 2; // px: half the edge of a round thing's sprite: its body and its shadow lie in it
export const PILLAR_PAD = 4; // px round a pillar's box in its sprite (its outline), besides the shadow on two sides
export const SLAT = 20; // px between a pillar's slats, the mockup's
export const LANTERN_SCALE = 1.4; // the lantern stands this much bigger than its mockup, so that a checkpoint is seen from afar
export const LANTERN = { w: 40, h: 100, ox: 20, oy: 84 }; // px, a lantern sprite and where its foot is in it
export const PUPIL = { mid: 4, swell: 1 }; // an awake eye's pupil in the mockup's px: its radius breathes by swell about mid (the mockup's is 4 + sin t)
export const PUPIL_PX = Math.ceil((PUPIL.mid + PUPIL.swell) * OBJECT_SCALE * 2); // px, the baked pupil's edge: as big as it swells to
const SHADOW = 'rgba(40,40,50,0.18)';

export const round = (key, paint) => cached(key, ROUND_HALF * 2, ROUND_HALF * 2, (g) => {
  g.translate(ROUND_HALF, ROUND_HALF);
  paint(g);
});

function disc(g, x, y, rx, ry, fill, line = null, width = 2) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = fill;
  g.fill();
  if (!line) return;
  g.lineWidth = width;
  g.strokeStyle = line;
  g.stroke();
}

// The standing stone, in the mockup's px: its shadow, its body in pencil, its lit patch.
function stoneBody(g) {
  g.scale(OBJECT_SCALE, OBJECT_SCALE);
  disc(g, SHADOW_DX, 16, 22, 12, SHADOW);
  disc(g, 0, 0, 20, 28, PAL.stone, PAL.stoneDark);
  disc(g, -6, -8, 7, 11, PAL.stoneLight);
}

export function shutEye(g) { // the sleeping eye: a lid, drawn as the mockup's smile
  g.beginPath();
  g.arc(0, -3, 9, 0.3, Math.PI - 0.3);
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = 2;
  g.stroke();
}

export const openEye = (g) => disc(g, 0, 0, 11, 6, PAL.lid); // the awake eye's white; its violet pupil is the live part

export const stoneSprite = () => round('wanderStone', (g) => { stoneBody(g); shutEye(g); });
export const turretSprite = () => round('wanderTurret', (g) => { stoneBody(g); openEye(g); });

export const RING = 18; // px of stone in a gate's ring: its outside is the reach, GROUND_R

export const gateSprite = (awake) => round(awake ? 'wanderGateAwake' : 'wanderGateAsleep', (g) => {
  disc(g, SHADOW_DX, SHADOW_DY, GROUND_R, GROUND_R * 0.6, SHADOW);
  g.beginPath();
  g.arc(0, 0, GROUND_R - RING / 2, 0, TAU);
  for (const [width, colour] of [[RING, PAL.stoneDark], [RING - 5, PAL.stone]]) {
    g.lineWidth = width;
    g.strokeStyle = colour;
    g.stroke();
  }
  g.scale(OBJECT_SCALE, OBJECT_SCALE); // the eye is the stone's
  if (awake) openEye(g);
  else shutEye(g);
});

export const crateSprite = () => round('wanderCrate', (g) => {
  const h = GROUND_R * 0.65;
  g.fillStyle = SHADOW;
  g.fillRect(-h + SHADOW_DX, -h + SHADOW_DY, h * 2, h * 2);
  g.fillStyle = PAL.kite;
  g.fillRect(-h, -h, h * 2, h * 2);
  g.fillStyle = rgba(PAL.gold, 0.85); // the prize, seen through the bars
  g.fillRect(-h * 0.3, -h * 0.3, h * 0.6, h * 0.6);
  g.strokeStyle = PAL.kiteLine;
  g.lineWidth = 2.5;
  g.strokeRect(-h, -h, h * 2, h * 2);
  g.lineWidth = 2;
  g.beginPath();
  for (const x of [-h / 2, 0, h / 2]) {
    g.moveTo(x, -h);
    g.lineTo(x, h);
  }
  g.stroke();
});

// A pillar w x h: its box is exactly that, centred at (PILLAR_PAD + w / 2, PILLAR_PAD + h / 2) in a sprite that holds its outline and its shadow.
export const pillarSprite = (w, h) => cached(`wanderPillar${w}x${h}`, w + 2 * PILLAR_PAD + SHADOW_DX, h + 2 * PILLAR_PAD + SHADOW_DY, (g) => {
  g.translate(PILLAR_PAD + w / 2, PILLAR_PAD + h / 2);
  g.fillStyle = SHADOW;
  g.fillRect(-w / 2 + SHADOW_DX, -h / 2 + SHADOW_DY, w, h);
  g.fillStyle = PAL.bridge;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.strokeStyle = PAL.bridgeLine;
  g.lineWidth = 2;
  g.strokeRect(-w / 2, -h / 2, w, h);
  g.beginPath();
  for (let x = -w / 2 + SLAT; x < w / 2; x += SLAT) {
    g.moveTo(x, -h / 2);
    g.lineTo(x, h / 2);
  }
  g.stroke();
});

// The lantern post and its lamp, the foot at (LANTERN.ox, LANTERN.oy): in the mockup's px scaled by LANTERN_SCALE.
export const lanternSprite = (lit) => cached(lit ? 'wanderLanternLit' : 'wanderLanternDull', LANTERN.w, LANTERN.h, (g) => {
  g.translate(LANTERN.ox, LANTERN.oy);
  g.scale(LANTERN_SCALE, LANTERN_SCALE);
  g.fillStyle = PAL.post;
  g.fillRect(-7, -30, 14, 40);
  g.fillStyle = lit ? PAL.brass : PAL.kiteShade;
  g.fillRect(-13, -56, 26, 26);
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = 2;
  g.strokeRect(-7, -30, 14, 40);
  g.strokeRect(-13, -56, 26, 26);
  g.fillStyle = lit ? PAL.flame : PAL.stoneLight;
  g.fillRect(-7, -50, 14, 14);
});

// The violet pupil, a disc as big as it swells to, scaled down as it breathes.
export const pupilSprite = () => cached('wanderPupil', PUPIL_PX, PUPIL_PX, (g) => {
  g.beginPath();
  g.arc(PUPIL_PX / 2, PUPIL_PX / 2, PUPIL_PX / 2, 0, TAU);
  g.fillStyle = PAL.violet;
  g.fill();
});
