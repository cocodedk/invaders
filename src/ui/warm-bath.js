// Everything Rubber Regatta (world 19) draws from a sprite it bakes on first use that is not the backdrop's or the boss's, baked when the
// level's view is created (view.js createView) so no frame of the fight pays for one: the dizzy and flying bodies of every role
// (bodies-view.js), the toy seaplane (ship-bath.js) and its corks (shots-bath.js). (The aliens are baked by warmAliens.) A poster,
// which draws one frame, does not call it.
import { BATH_WORLD } from './bath-kit.js';
import { warmBodies } from './bodies-view.js';
import { planeSprite } from './ship-bath.js';
import { warmCorks } from './shots-bath.js';

export function warmBath(look) {
  if (look.world !== BATH_WORLD) return;
  warmBodies(look);
  planeSprite(look.palette.accent);
  warmCorks();
}
