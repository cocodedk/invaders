import { MAX_BULLETS, addBullets } from './aliens.js';
import { emitPattern } from './patterns.js';
import { emit } from './util.js';
import { SHARD, SHARD_SPEED, SHARD_MIN_RANGE } from './course-kinds.js';

// A mirror shard (world 22, Leg 3: the Mirror Flats) throws your shot back. A ship shot that hurts a shard which still stands (course-shots.js
// calls this after hurtGround) adds one 'aimed' enemy bullet at the hit point, aimed at the ship as it is this tick and SHARD_SPEED times the
// scaled bullet speed, and says 'shardBounce' { x, y }. The breaking hit returns nothing, and neither does a hit from inside SHARD_MIN_RANGE of
// the ship (a return that close cannot be dodged); the beam, a seed burst, the bomb and a loop break a shard through hurtGround alone, with no
// return. The bullet goes through addBullets, so the field's cap holds. It draws no rng: the aimed pattern does not.
export function bounceShard(world, g, shot) {
  if (g.kind !== SHARD || !(g.hp > 0) || world.bullets.length >= MAX_BULLETS) return;
  const { ship } = world;
  if ((ship.x - shot.x) ** 2 + (ship.y - shot.y) ** 2 < SHARD_MIN_RANGE ** 2) return;
  addBullets(world, emitPattern('aimed', shot, ship, { speed: world.scale.bulletSpeed * SHARD_SPEED }, world.rng));
  emit(world, 'shardBounce', { x: shot.x, y: shot.y });
}
