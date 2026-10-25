import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';

// The frame effects of the glitch twist: bullet time's wash and the glitch slices, Code Rain's green ones and
// Starlit Archive's warm, gilded ones. A stand-in context keeps what each call painted with.
installCanvas(64);
const { drawScreenFx, drawSlices } = await import('../../src/ui/screen-view.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

function stub() {
  const calls = [];
  const ctx = {
    fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillRect(...a) { calls.push(['fillRect', this.fillStyle, this.globalCompositeOperation, this.globalAlpha, ...a]); },
    drawImage(...a) { calls.push(['drawImage', this.globalAlpha, ...a]); },
    getTransform: () => 'm', setTransform() {}, createLinearGradient: () => ({ addColorStop() {} }),
  };
  return { ctx, calls };
}
const wash = (look, fx) => {
  const { ctx, calls } = stub();
  drawScreenFx(ctx, { flashes: [], bulletTime: false, slowPower: false, ...fx }, look);
  return calls.map(([, style, mode]) => [style, mode]);
};

test("bullet time and the slow power wash the frame green, as they always did, in every world but Starlit Archive", () => {
  const green = [['rgba(0,30,12,0.28)', 'source-over'], ['rgba(40,255,120,0.06)', 'lighter']];
  for (const look of [LOOKS[5], LOOKS[10], undefined]) {
    assert.deepEqual(wash(look, { bulletTime: true }), green, `world ${look?.world}`);
    assert.deepEqual(wash(look, { slowPower: true }), green);
  }
  assert.deepEqual(wash(LOOKS[5], {}), [], 'and nothing when time runs as it should');
});

test("in Starlit Archive they wash it warm sepia-gold instead: a brown shade, then a little gold light", () => {
  const { tint } = LOOKS[11];
  assert.deepEqual(wash(LOOKS[11], { bulletTime: true }), [[tint.shade, 'source-over'], [tint.glow, 'lighter']]);
  assert.deepEqual(wash(LOOKS[11], { slowPower: true }), [[tint.shade, 'source-over'], [tint.glow, 'lighter']]);
  assert.match(tint.shade, /^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
  const [r, g, b] = tint.shade.match(/\d+(?=,)/g).map(Number);
  assert.ok(r > g && g > b, 'brown, not green');
});

const frame = { width: 1920, height: 1080 };
const fit = { s: 1, ox: 0, oy: 0 };
const slice = { x: 600, y: 200, w: 100, h: 400, dx: 60, color: '#ffc850', life: 0.4, max: 0.4 };

test("Code Rain's glitch slice is one shifted copy of its band and a green wash, still; an ink slice is a smear of copies with a gilt wash and a bright fold", () => {
  const plain = stub();
  drawSlices(plain.ctx, frame, fit, { slices: [{ ...slice, h: 6, color: '#5dff9a' }] });
  const copies = plain.calls.filter(([k]) => k === 'drawImage');
  assert.equal(copies.length, 1);
  assert.deepEqual(copies[0].slice(2), [frame, 600, 200, 100, 6, 660, 200, 100, 6]);
  assert.equal(plain.calls.filter(([k]) => k === 'fillRect').length, 1);
  const ink = stub();
  drawSlices(ink.ctx, frame, fit, { slices: [{ ...slice, kind: 'ink' }] });
  const smear = ink.calls.filter(([k]) => k === 'drawImage');
  assert.equal(smear.length, 1, 'a strip of the frame, shifted');
  assert.equal(smear[0][7], 600 + 60, 'by its dx, to start with');
  assert.ok(ink.calls.filter(([k]) => k === 'fillRect').length >= 2, 'the gilt wash and the fold');
  const late = stub();
  drawSlices(late.ctx, frame, fit, { slices: [{ ...slice, kind: 'ink', life: 0.1 }] });
  assert.ok(late.calls.find(([k]) => k === 'drawImage')[3] > 600, 'the strip sweeps on in the direction it was shifted');
});
