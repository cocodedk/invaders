import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, stepSession } from '../../src/ui/session.js';
import { levelById } from '../../src/core/levels.js';
import { INTRO, TICK } from '../../src/core/kinds.js';
import { CAPTION } from '../../src/fx/react-story.js';

// World 22's captions, through the path the game uses (session.js): the leg's opening line is up from its first frame, and the first lantern's
// ability names itself the moment it is reached. The words themselves are react-story.test.js's.
const leg = levelById('w22-1');
const texts = (s) => s.fx.popups.map((p) => p.text);
const frames = (s, secs) => { for (let i = 0; i < Math.round(secs / TICK); i++) stepSession(s, TICK, null); };

test('a session of Leg 1 opens on its line, which holds through the intro and is gone in time', () => {
  assert.ok(CAPTION.life > INTRO, 'the line outlasts the quiet intro');
  const s = createSession(leg);
  assert.deepEqual(texts(s), ['A LIGHT WAKES.'], 'up before the first frame');
  for (let i = 0; i < 2 * INTRO / TICK && s.world.state !== 'play'; i++) stepSession(s, TICK, null);
  assert.equal(s.world.state, 'play');
  assert.deepEqual(texts(s), ['A LIGHT WAKES.'], 'still up as play begins');
  frames(s, CAPTION.life);
  assert.deepEqual(texts(s), []);
});

test('a session of another level opens with no caption', () => {
  assert.deepEqual(texts(createSession(levelById('w1-1'))), []);
  assert.deepEqual(texts(createSession(levelById('w21-5'))), []);
});

test('the first lantern says its ability\'s line as it is reached, once', () => {
  const s = createSession(leg);
  s.world.ship.lives = 999; // nothing in the way matters: the ship stands at the start and the leg runs on
  const seen = [];
  for (let i = 0; i < 60 * 60 && s.world.course.lit === 0; i++) {
    stepSession(s, TICK, null);
    for (const t of texts(s)) if (!seen.includes(t)) seen.push(t);
  }
  assert.equal(s.world.course.lit, 1, 'the first lantern was reached');
  assert.deepEqual(s.world.course.abilities, ['seed']);
  assert.deepEqual(seen, ['A LIGHT WAKES.', 'YOUR COLOUR.']);
  assert.deepEqual(texts(s), ['YOUR COLOUR.'], 'the opening line is long gone and the new one is up');
});
