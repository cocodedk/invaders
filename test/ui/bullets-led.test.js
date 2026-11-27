import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

installCanvas();
const { ledColour, LED_RATE } = await import('../../src/ui/bullets-view.js');
const { CURTAIN_GAP } = await import('../../src/core/patterns.js');

const bullet = (x) => ({ pattern: 'curtain', x, y: 300, vx: 0, vy: 120, r: 8, life: 6 });

test('the curtain blinks like an LED strip: neighbours differ and one bullet changes with time', () => {
  assert.notEqual(ledColour(bullet(500), 1), ledColour(bullet(500 + CURTAIN_GAP), 1));
  assert.notEqual(ledColour(bullet(500), 1), ledColour(bullet(500), 1 + 1 / LED_RATE));
});
