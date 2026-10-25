import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { stateful } from './smogal-kit.js';

// What test/ui/line-cap.test.js asks of every world's drawing, for Ash to Air (W17): the alien painters must leave every
// piece of the context's state (line caps and joins, widths, colours, alpha, blend mode) as they found it, or later
// strokes (the HUD's power ring) inherit it. Kept apart from that file to keep both under 200 lines. The module's five
// painters are wrapped in tidy(); the raw ones and the bigger pieces they are built from must also leave it alone.
installCanvas(64);
const { default: world } = await import('../../src/ui/aliens/w17.js');
const { grunt } = await import('../../src/ui/aliens/w17-grunt.js');
const { ash: gruntAsh } = await import('../../src/ui/aliens/w17-grunt-ash.js');
const { diver } = await import('../../src/ui/aliens/w17-butt.js');
const { gunner } = await import('../../src/ui/aliens/w17-pipe.js');
const { woodGrain } = await import('../../src/ui/aliens/w17-pipe-wood.js');
const { armored } = await import('../../src/ui/aliens/w17-cigar.js');
const { ash: cigarAsh } = await import('../../src/ui/aliens/w17-cigar-ash.js');
const { scales } = await import('../../src/ui/aliens/w17-cigar-leaf.js');
const { carrier } = await import('../../src/ui/aliens/w17-pack.js');
const { lid, tubes, foil } = await import('../../src/ui/aliens/w17-pack-top.js');
const { wisp, flake, coal } = await import('../../src/ui/aliens/w17-fx.js');
const { turned, blocked } = await import('../../src/ui/aliens/w17-kit.js');

const colour = '#ff7a30';
const painters = { grunt, diver, gunner, armored, carrier };
const pieces = {
  gruntAsh: (b, l, f) => gruntAsh(b, l, f),
  cigarAsh: (b, l, f) => cigarAsh(b, l, f),
  scales: (b) => scales(b, () => 18, -30, 15, 8),
  woodGrain: (b) => woodGrain(b),
  lid: (b, l, f) => lid(b, l, f),
  tubes: (b, l, f) => tubes(b, f),
  foil: (b, l, f) => foil(b, f),
  wisp: (b, l, f) => wisp(b, [[0, 0, 3], [2, -8, 4], [0, -16, 5]], 0.9, colour, f),
  flake: (b, l, f) => flake(b, 3, 3, 2, f, 7),
  coal: (b, l, f) => coal(l, 0, 0, 6, 3, f),
  turned: (b, l, f) => turned(b, l, 0.4, 3, 3, () => b.fillRect(0, 0, 2, 2), 1.3),
  blocked: (b, l) => blocked(l, (g) => g.rect(0, 0, 4, 4)),
};

test("the invaders of Ash to Air, raw and wrapped, leave the line caps and joins, widths, colours, alpha and blend mode as they found them, on both beats", () => {
  for (const [name, run] of [...Object.entries(painters), ...Object.entries(world).filter(([, v]) => typeof v === 'function')]) {
    for (const f of [0, 1]) {
      const [b, l] = [stateful(), stateful()];
      const before = { ...b.state };
      run(b.ctx, l.ctx, f, colour);
      for (const [side, s] of [['body', b], ['lights', l]]) {
        assert.equal(s.stack.length, 0, `${name} frame ${f} ${side}: unbalanced saves`);
        assert.deepEqual({ ...s.state }, before, `${name} frame ${f} ${side}`);
      }
    }
  }
});

const KEEPS = ['lid', 'wisp', 'flake', 'coal', 'turned', 'blocked']; // the pieces that give the state back on their own

test('every piece the invaders are built from pairs its saves, and the self-contained ones give the state back too', () => {
  for (const [name, run] of Object.entries(pieces)) {
    for (const f of [0, 1]) {
      const [b, l] = [stateful(), stateful()];
      const before = { ...b.state };
      run(b.ctx, l.ctx, f);
      for (const [side, s] of [['body', b], ['lights', l]]) {
        assert.equal(s.stack.length, 0, `${name} frame ${f} ${side}: unbalanced saves`);
        if (!KEEPS.includes(name)) continue; // the rest set line caps and widths freely, inside the painter's own save (tidy)
        assert.deepEqual({ ...s.state }, before, `${name} frame ${f} ${side}`);
      }
    }
  }
});
