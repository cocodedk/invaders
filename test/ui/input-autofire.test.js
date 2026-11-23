import { test } from 'node:test';
import assert from 'node:assert/strict';

// The keydown handler createInput registers, driven by hand: stand-ins for the page's listeners, document
// and canvas, installed before the module under test is imported.
const listeners = {};
globalThis.addEventListener = (type, fn) => (listeners[type] ??= []).push(fn);
globalThis.document = { addEventListener() {}, pointerLockElement: null };
const { createInput, readInput, resetInput, AUTOFIRE_KEY } = await import('../../src/ui/input.js');
const { quantizeInput } = await import('../../src/core/input-codec.js');

const canvas = { addEventListener() {}, requestPointerLock() {}, getBoundingClientRect: () => ({}) };

// A fresh input whose ship is flown (playing) or not, and a key press into its own keydown handler.
function inputIn(playing) {
  const input = createInput(canvas);
  const keydown = listeners.keydown.at(-1);
  input.playing = playing === null ? null : () => playing;
  const press = (code, extra = {}) => keydown({
    code, repeat: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, ...extra,
  });
  return { input, press };
}

test('a tap of the auto-fire key switches auto-fire on, and another tap off, while the ship is flown', () => {
  const { input, press } = inputIn(true);
  assert.equal(input.autofire, false, 'off to begin with');
  press(AUTOFIRE_KEY);
  assert.equal(input.autofire, true);
  press(AUTOFIRE_KEY);
  assert.equal(input.autofire, false);
});

test('outside play the key does nothing: not on a menu, a pause, the watch, nor before the game says what is flown', () => {
  for (const playing of [false, null]) {
    const { input, press } = inputIn(playing);
    press(AUTOFIRE_KEY);
    assert.equal(input.autofire, false, `playing = ${playing}`);
  }
});

test('a held key (repeat) does not flip it again, and neither does the key with Alt, Ctrl or Meta', () => {
  const { input, press } = inputIn(true);
  press(AUTOFIRE_KEY);
  press(AUTOFIRE_KEY, { repeat: true });
  press(AUTOFIRE_KEY, { repeat: true });
  assert.equal(input.autofire, true, 'one tap, however long the key is held');
  for (const mod of ['altKey', 'ctrlKey', 'metaKey']) {
    press(AUTOFIRE_KEY, { [mod]: true });
    assert.equal(input.autofire, true, mod);
  }
});

test('other keys leave it alone', () => {
  const { input, press } = inputIn(true);
  for (const code of ['Space', 'KeyB', 'KeyM', 'KeyP', 'ArrowLeft']) press(code);
  assert.equal(input.autofire, false);
});

test('readInput fires while auto-fire is on, with no key down, and not while it is off or missing', () => {
  const { input } = inputIn(true);
  const read = () => readInput(input, {}).fire;
  assert.equal(read(), false);
  input.autofire = true;
  assert.equal(read(), true);
  assert.equal(quantizeInput({ fire: read() }).fire, true, 'a quantized input a replay re-simulates');
  input.autofire = false;
  assert.equal(read(), false);
  delete input.autofire; // a fixture that never heard of it
  assert.equal(read(), false, 'a strict boolean, not undefined');
});

test('resetInput (a level, a pause, a blur) leaves it on: it is a choice for the session, not a held key', () => {
  const { input, press } = inputIn(true);
  press(AUTOFIRE_KEY);
  resetInput(input);
  assert.equal(input.autofire, true);
});
