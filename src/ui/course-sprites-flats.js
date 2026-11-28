// The mirror shard of Leg 3's flats (world 22), drawn plain like the rest of the ground: a tall pale sliver of glass, a six-sided crystal in pencil
// outline with two bright streaks across it and a shaded lower facet, standing over its shadow. Baked once (cached) in a round object's sprite
// (course-sprites.js), its body inside GROUND_R of its centre, the reach the shots and the loop test it by.
import { PAL } from './wander-kit.js';
import { GROUND_R } from '../core/course-ground.js';
import { round, SHADOW_DX, SHADOW_DY } from './course-sprites.js';

export const SHARD_GLASS = '#cfe6ea'; // the pale glass
export const SHARD_FACET = '#9cc3cb'; // the shaded lower facet
export const SHARD_STREAK = 'rgba(255,255,255,0.85)'; // a bright streak across it
export const SHARD_OUTLINE = 2.5; // px: the pencil outline
// The crystal's corners, each a share of GROUND_R from its centre (x right, y down): a point on top, a point below, wide in the middle and slanted.
export const SHARD_POINTS = [[-0.1, -1], [0.55, -0.35], [0.45, 0.55], [0.05, 1], [-0.5, 0.4], [-0.55, -0.4]]
  .map(([x, y]) => [x * (GROUND_R - SHARD_OUTLINE), y * (GROUND_R - SHARD_OUTLINE)]);

const trace = (g, pts) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
};

export const shardSprite = () => round('wanderShard', (g) => {
  trace(g, SHARD_POINTS.map(([x, y]) => [x + SHADOW_DX, y + SHADOW_DY]));
  g.fillStyle = 'rgba(40,40,50,0.18)';
  g.fill();
  trace(g, SHARD_POINTS);
  g.fillStyle = SHARD_GLASS;
  g.fill();
  trace(g, [SHARD_POINTS[1], SHARD_POINTS[2], SHARD_POINTS[3], SHARD_POINTS[4]]);
  g.fillStyle = SHARD_FACET;
  g.fill();
  g.lineCap = 'round';
  g.strokeStyle = SHARD_STREAK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-0.3 * GROUND_R, -0.3 * GROUND_R);
  g.lineTo(-0.05 * GROUND_R, -0.65 * GROUND_R);
  g.moveTo(-0.38 * GROUND_R, 0.05 * GROUND_R);
  g.lineTo(-0.2 * GROUND_R, -0.2 * GROUND_R);
  g.stroke();
  trace(g, SHARD_POINTS);
  g.strokeStyle = PAL.stoneDark;
  g.lineWidth = SHARD_OUTLINE;
  g.lineJoin = 'round';
  g.stroke();
});
