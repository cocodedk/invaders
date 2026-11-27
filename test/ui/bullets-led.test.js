import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

installCanvas();
const { ledColour, ledLit, LED_RATE, LED_DARK_EVERY } = await import('../../src/ui/bullets-view.js');
const { CURTAIN_GAP } = await import('../../src/core/patterns.js');

const bullet = (x) => ({ pattern: 'curtain', x, y: 300, vx: 0, vy: 120, r: 8, life: 6 });

test('the curtain blinks like an LED strip: neighbours differ and one bullet changes with time', () => {
  assert.notEqual(ledColour(bullet(500), 1), ledColour(bullet(500 + CURTAIN_GAP), 1));
  assert.notEqual(ledColour(bullet(500), 1), ledColour(bullet(500), 1 + 1 / LED_RATE));
});

test('a bulb goes dark with time, and one of every LED_DARK_EVERY neighbours is dark', () => {
  const row = (t) => Array.from({ length: LED_DARK_EVERY }, (_, i) => ledLit(bullet(500 + i * CURTAIN_GAP), t));
  assert.equal(row(1).filter((lit) => !lit).length, 1);
  const states = new Set(Array.from({ length: LED_DARK_EVERY }, (_, i) => ledLit(bullet(500), 1 + i / LED_RATE)));
  assert.equal(states.size, 2);
});
