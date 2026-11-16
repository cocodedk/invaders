import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, stateful, PHASE } from './bath-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for Rubber Regatta's backdrop: the sky body, the three layers' painters,
// the maker's plate, every flourish in every phase it draws in (at a quiet moment and a busy one, a strike flash alive) and the ambient
// kinds must leave every piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they found it, or
// later strokes (the HUD's power ring) inherit it.
const { BODIES11 } = await import('../../src/ui/sky-bodies-11.js');
const { BATH } = await import('../../src/ui/parallax-bath.js');
const { FLOURISH_BATH } = await import('../../src/ui/flourish-bath.js');
const { AMBIENT11 } = await import('../../src/ui/ambient-11.js');
const { makerPlate } = await import('../../src/ui/parallax-bath-plate.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { makeRng } = await import('../../src/core/rng.js');
const { drip, bubble, steamer, STRIKE } = await import('../../src/ui/flourish-bath-model.js');
const { STRIKE_LIFE, STRIKE_FLASH } = await import('../../src/fx/react-bath.js');

const layers = buildLayers(look, 5);
const out = () => ({ lights: [], signs: [] });
const busy = (ok) => {
  for (let t = 0; t < 400; t += 0.05) if (ok(t)) return t;
  throw new Error('no such moment');
};
const env = (t, strike) => ({ v: { look, layers, cache: {} }, world: { ship: { x: 960 } }, fx: { flashes: strike ? [{ ...STRIKE_FLASH, tag: STRIKE, life: STRIKE_LIFE / 2, max: STRIKE_LIFE }] : [], time: t }, t, quality: 1 });
const times = [busy((t) => !drip(t).phase && !bubble(t).on), busy((t) => drip(t).phase === 'splash'), busy((t) => drip(t).phase === 'fall'), busy((t) => bubble(t).popped), busy((t) => steamer(t).on)];
const painters = {
  sky: (ctx) => BODIES11.bathwall(ctx, look),
  far: (ctx) => BATH.bathtaps(ctx, 2240, 700, makeRng(3), look.layers[0], out()),
  mid: (ctx) => BATH.bathshelf(ctx, 2240, 460, makeRng(3), look.layers[1], out()),
  near: (ctx) => BATH.bathfoam(ctx, 2240, 320, makeRng(3), look.layers[2], out()),
  plate: (ctx) => makerPlate(ctx, 1200, 260),
  ...Object.fromEntries(look.ambient.map((a, i) => [`${a.kind} ${a.phase} ${i}`, (ctx) => AMBIENT11[a.kind](ctx, a, 3.3, 40, 0, { ship: { x: 960 } })])),
};

test("Rubber Regatta's sky, layers, plate and ambient leave the line caps and joins, widths, colours, alpha and blend mode as they found them", () => {
  for (const [name, run] of Object.entries(painters)) {
    const ctx = stateful();
    const before = { ...ctx };
    run(ctx);
    assert.deepEqual({ ...ctx }, before, name);
  }
});

test("Rubber Regatta's flourishes, quiet or busy, a strike alive or not, leave the context's state as they found it", () => {
  for (const [name, phases] of Object.entries(FLOURISH_BATH)) {
    for (const [phase, draw] of Object.entries(phases)) {
      for (const t of times) {
        for (const strike of [false, true]) {
          const ctx = stateful();
          const before = { ...ctx };
          draw(ctx, env(t, strike), ...PHASE[phase]);
          assert.deepEqual({ ...ctx }, before, `${name} ${phase} at ${t.toFixed(2)}${strike ? ', a strike alive' : ''}`);
        }
      }
    }
  }
});
