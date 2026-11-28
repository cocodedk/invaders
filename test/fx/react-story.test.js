import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MID_X } from '../../src/core/kinds.js';
import { LEVELS, levelById } from '../../src/core/levels.js';
import { createFx } from '../../src/fx/fx.js';
import { REACTS } from '../../src/fx/react.js';
import { ABILITY_CAPTIONS, CAPTION, OPENINGS, openLeg } from '../../src/fx/react-story.js';
import { POPUP_MIN_Y } from '../../src/ui/fx-view.js';
import { PAL } from '../../src/ui/wander-kit.js';
import { react, run } from './fx-kit.js';

// World 22's story is three lines a leg, the owner's words (the design's "The story"): the opening line as a leg starts, the ability's line
// as it is gained, and the trailer's last card (trailer-cards-22.test.js). Here are the two that play shows, as pop-ups held above the field.
const leg = levelById('w22-1');
const wood = levelById('w22-2');
const flats = levelById('w22-3');
const placed = (p) => [p.x, p.y, p.scale, p.life, p.vy, p.color];
const CAPTION_AT = [MID_X, CAPTION.y, CAPTION.scale, CAPTION.life, CAPTION.vy, CAPTION.color];

test('a gained ability names itself in the story\'s words: one caption and nothing else', () => {
  assert.ok(REACTS.includes('ability'));
  const fx = react({ type: 'ability', kind: 'seed' });
  assert.deepEqual(fx.popups.map((p) => p.text), ['YOUR COLOUR.']);
  assert.deepEqual(placed(fx.popups[0]), CAPTION_AT);
  assert.equal(fx.particles.length + fx.flashes.length + fx.rings.length, 0, 'words only');
});

test('an ability with no line says nothing, whatever its name looks like', () => {
  for (const kind of ['spread', 'constructor', 'toString', '__proto__', undefined]) {
    assert.equal(react({ type: 'ability', kind }).popups.length, 0, String(kind));
  }
  assert.deepEqual(Object.keys(ABILITY_CAPTIONS), ['seed', 'line', 'lasso'], 'Leg 1 grants the seed, Leg 2 the line, Leg 3 the lasso');
});

test('Leg 1 opens on its line, as the story has it, in the same place and look', () => {
  const fx = createFx();
  openLeg(fx, leg);
  assert.deepEqual(fx.popups.map((p) => p.text), ['A LIGHT WAKES.']);
  assert.deepEqual(placed(fx.popups[0]), CAPTION_AT);
  assert.deepEqual(Object.keys(OPENINGS), [leg.id, wood.id, flats.id]);
});

test('Leg 2, the Pencil Wood, opens on its card, and the line it grants names itself in the story\'s words', () => {
  const fx = createFx();
  openLeg(fx, wood);
  assert.deepEqual(fx.popups.map((p) => p.text), ['THE WOOD REMEMBERS.']);
  assert.deepEqual(placed(fx.popups[0]), CAPTION_AT);
  assert.deepEqual(react({ type: 'ability', kind: 'line' }).popups.map((p) => p.text), ['YOUR LINE.']);
});

test('Leg 3, the Mirror Flats, opens on its card, and the lasso it grants names itself in the story\'s words', () => {
  const fx = createFx();
  openLeg(fx, flats);
  assert.deepEqual(fx.popups.map((p) => p.text), ['THE SKY LIES DOWN.']);
  assert.deepEqual(placed(fx.popups[0]), CAPTION_AT);
  assert.deepEqual(react({ type: 'ability', kind: 'lasso' }).popups.map((p) => p.text), ['YOUR CIRCLE.']);
});

test('every other level opens silent', () => {
  for (const level of LEVELS.filter((l) => l !== leg && l !== wood && l !== flats)) {
    const fx = createFx();
    openLeg(fx, level);
    assert.equal(fx.popups.length, 0, level.id);
  }
  for (const id of ['constructor', '__proto__']) {
    const fx = createFx();
    openLeg(fx, { id });
    assert.equal(fx.popups.length, 0, id);
  }
});

test('a caption stands in the lantern\'s light, clear of the HUD, and stays up for its whole life', () => {
  assert.equal(CAPTION.color, PAL.flame);
  assert.ok(CAPTION.y >= POPUP_MIN_Y, 'below the HUD line, so it keeps its own height');
  const fx = react({ type: 'ability', kind: 'seed' });
  const [p] = fx.popups;
  run(fx, CAPTION.life - 0.1);
  assert.equal(fx.popups.length, 1);
  assert.ok(Math.abs(p.y - CAPTION.y) < Math.abs(CAPTION.vy) * CAPTION.life + 1e-6, 'it drifts by its own slow speed and no more');
  run(fx, 0.2);
  assert.equal(fx.popups.length, 0);
});
