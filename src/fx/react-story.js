// World 22's story, told in captions: the few words a leg speaks while it is flown. They are the design's "The story" (docs/superpowers/specs/
// 2026-11-22-world-22-journey-design.md), approved by the owner word for word: change them only when he does. Everything else the story says is
// pictures. A caption is a pop-up held nearly still above the field, in the pale gold of the glider's lantern, bigger and longer than a score's:
//   openLeg(fx, level)   the leg's opening line, as its session starts (session.js); OPENINGS holds one for each leg, by the level's id
//   STORY.ability        the 'ability' event (course-check.js): the ability just gained names itself, by its kind (ABILITY_CAPTIONS)
// A leg or an ability with no line says nothing. The trailer's last card, "THE ROAD GOES ON.", is the trailer's (trailer/cards.js).
// Pure: no rng, no world.
import { MID_X } from '../core/kinds.js';
import { addPopup } from './fx.js';

export const OPENINGS = { 'w22-1': 'A LIGHT WAKES.', 'w22-2': 'THE WOOD REMEMBERS.' };
export const ABILITY_CAPTIONS = { seed: 'YOUR COLOUR.', line: 'YOUR LINE.' };
// Where and how a caption stands: the middle of the field's upper half (the wave clear's own row), as big as it, up long enough to outlast the quiet intro
// (session-story.test.js) and drifting so slowly that it reads as still. The colour is the lantern's flame (ui/wander-kit.js PAL.flame; react-story.test.js
// keeps the two alike), its dark rim is the pop-up's own.
export const CAPTION = { y: 420, scale: 2.2, life: 3.2, vy: -10, color: '#ffe9a8' };

const say = (fx, text) => addPopup(fx, { x: MID_X, y: CAPTION.y, text, color: CAPTION.color, scale: CAPTION.scale, life: CAPTION.life, vy: CAPTION.vy });

export function openLeg(fx, level) {
  fx.land = level.course?.land ?? null; // the look of the leg's ground, for the paint its bursts throw (react-road.js)
  if (Object.hasOwn(OPENINGS, level.id)) say(fx, OPENINGS[level.id]);
}

function ability(fx, ev) {
  if (Object.hasOwn(ABILITY_CAPTIONS, ev.kind)) say(fx, ABILITY_CAPTIONS[ev.kind]);
}

export const STORY = { ability };
