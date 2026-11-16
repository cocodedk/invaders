import { test } from 'node:test';
import assert from 'node:assert/strict';
import { art, S, TOP, look, f, part, paint } from './duck-kit.js';

// What The Dowager Duck is drawn as (the still half is duck-parts.test.js, the live half duck-live.test.js): that she holds her hit boxes (in free
// flight a box rams, core/free.js, so no point of a box, its corners included, may be wall), that nothing but the bobble rises into the HUD at the top
// of her orbit, that her colours are the look's, and the shapes that make her read as a rubber duck at a glance: the eyes beside the bill and not on it,
// a bill that flares to its corners, a cap wider than her head, feet that splay out and paddle under the foam, a ring of foam wider than she is.
const shape = await import('../../src/ui/bosses/duck-shape.js');
const { PAL } = await import('../../src/ui/bosses/duck-kit.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { createWorld, stepWorld } = await import('../../src/core/world.js');
const { levelById } = await import('../../src/core/levels.js');
const { HUD_BOTTOM, TICK } = await import('../../src/core/kinds.js');
const { IDLE } = await import('../../src/core/input-codec.js');

const duck = bossDef('duck');

test('TOP is the HUD\'s edge at the top of her orbit: flown through it, her centre comes no nearer the HUD than TOP allows', () => {
  const w = createWorld(levelById('w19-5'));
  w.ship.invuln = Infinity;
  while (w.state === 'intro' || w.boss.enter > 0) stepWorld(w, TICK, IDLE);
  for (const p of w.boss.parts) p.hp = p.max * (duck.phases.at(-2).until - 0.02);
  let top = Infinity;
  for (let i = 0; i < 60 * 14; i++) {
    stepWorld(w, TICK, IDLE);
    w.events.length = 0;
    top = Math.min(top, w.boss.y);
  }
  assert.equal(w.boss.phase, duck.phases.length - 1, 'she is circling');
  const edge = HUD_BOTTOM - top; // the HUD's edge in boss coordinates at her highest
  assert.ok(TOP >= edge - 0.01, `TOP ${TOP} lies under the HUD's edge, ${edge.toFixed(1)}`);
  assert.ok(TOP <= edge + 4, `and is no lower than it need be: ${TOP} against ${edge.toFixed(1)}`);
  assert.ok(part('bobble').dy - part('bobble').h / 2 < TOP, 'only the bobble\'s box rises above it: it may slip under the HUD');
  for (const p of duck.parts) if (p.id !== 'bobble') assert.ok(p.dy - p.h / 2 > TOP, `${p.id}'s box is under it`);
});

test('every box lies inside her silhouette on every side, its corners and edges too: a ship that touches a box always touches her art', () => {
  for (const p of duck.parts) {
    for (let i = 0; i <= 12; i++) {
      for (let j = 0; j <= 8; j++) {
        const [x, y] = [p.dx - p.w / 2 + (p.w * i) / 12, p.dy - p.h / 2 + (p.h * j) / 8];
        assert.ok(shape.depth(x, y) >= 1, `(${f(x)}, ${f(y)}) of ${p.id}'s box is inside her by ${shape.depth(x, y).toFixed(1)} px`);
      }
    }
  }
});

test('each part\'s own piece holds its box\'s corners (the belly\'s top lies under the chin, which holds it), and its painter covers its box', () => {
  for (const p of duck.parts) {
    const own = shape.PIECES[p.id];
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [-1, 0], [1, 0]]) {
      const [x, y] = [p.dx + (dx * p.w) / 2, p.dy + (dy * p.h) / 2];
      const d = p.id === 'belly' && dy < 0 ? Math.max(shape.polyDepth(own, x, y), shape.polyDepth(shape.PIECES.head, x, y)) : shape.polyDepth(own, x, y);
      assert.ok(d >= 1, `${p.id} holds (${f(x)}, ${f(y)}): ${d.toFixed(1)} px`);
    }
    const { b } = paint(p.id);
    assert.ok(b.x0 <= -p.w / 2 && b.x1 >= p.w / 2 && b.y1 >= p.h / 2, `${p.id}'s art spans its box across and to its foot: ${f(b.x0)}..${f(b.x1)}, to ${f(b.y1)}`);
    if (p.id !== 'belly') assert.ok(b.y0 <= -p.h / 2, `and to its top: ${f(b.y0)}`);
  }
});

test('her outline is under TOP everywhere but the bobble, which is the only piece that may rise past it', () => {
  for (const [id, poly] of Object.entries(shape.PIECES)) {
    const high = Math.min(...poly.map(([, y]) => y));
    if (id === 'bobble') assert.ok(high < TOP, 'the bobble rises past it');
    else assert.ok(high >= TOP, `${id} tops out at ${f(high)}`);
  }
  for (const [, y, r] of [...shape.FOAM_BACK, ...shape.FOAM_FRONT]) assert.ok(y - r >= TOP, 'and so does the foam');
});

test('her colours are the look\'s: yellow rubber, coral armour, orange weak points', () => {
  assert.equal(S.pal, look.palette.boss);
  assert.equal(PAL.yellow, look.palette.boss.hull);
  assert.equal(PAL.coral, look.palette.boss.plate);
  assert.equal(PAL.orange, look.palette.boss.weak);
});

test('she reads as a rubber duck: eyes beside the bill, a bill that flares to its corners, a cap wider than her head that frames her face', () => {
  const [ex, ey, rx] = shape.EYE;
  const bill = shape.PIECES.bill;
  const billHalf = Math.max(...bill.filter(([, y]) => Math.abs(y - ey) < 4).map(([x]) => Math.abs(x)));
  assert.ok(Math.abs(ex) - rx >= billHalf, `the eye's inner edge, ${Math.abs(ex) - rx}, is clear of the bill's side, ${f(billHalf)}`);
  assert.ok(ey - shape.EYE[3] > shape.frillY(ex), 'and under the cap\'s ruffle');
  assert.ok(shape.BILL.flare > 0, 'the bill is wider at its mouth than at its top');
  assert.ok(shape.BILL.a > shape.BILL.b * 1.6, 'and much wider than it is tall');
  const capW = Math.max(...shape.CAP.map(([x]) => x));
  assert.ok(capW > shape.HEAD.a + 40, `the cap, ${f(capW)} wide either side, puffs out past her head, ${shape.HEAD.a}`);
  assert.ok(shape.frillY(shape.HEAD.a) > shape.frillY(0) + 25, 'its ruffle runs down the sides of her face');
  assert.ok(shape.BODY.a > shape.HEAD.a * 1.25, 'her body is plumper than her head');
});

test('her feet splay out and paddle under the foam crest; the ring of foam is wider than she is', () => {
  const foot = part('footL');
  const tips = shape.FOOT.filter(([, y]) => y > 40);
  assert.ok(Math.min(...tips.map(([x]) => x)) < -foot.w / 2 - 10, 'the left foot\'s toes reach out past its box, splayed');
  const crest = (x) => Math.max(...shape.FOAM_FRONT.filter(([cx, , r]) => Math.abs(cx - x) < r).map(([cx, cy, r]) => cy + Math.sqrt(r * r - (cx - x) ** 2)));
  for (const id of ['footL', 'footR', 'squeak']) {
    const p = part(id);
    const high = Math.min(...shape.PIECES[id].map(([, y]) => y));
    assert.ok(crest(p.dx) > high + 8, `the crest comes down over the top of ${id}, ${f(high)}: to ${f(crest(p.dx))}`);
    assert.ok(crest(p.dx) < p.dy, `and leaves the rest of ${id} in view`);
  }
  const reach = Math.max(...shape.FOAM_BACK.map(([x, , r]) => x + r));
  assert.ok(reach > part('bandR').dx + part('bandR').w / 2 + 60, `the foam heaps up past her armbands, to x ${f(reach)}`);
  assert.ok(reach <= S.W / 2, 'and stays on the hull\'s canvas');
  assert.equal(art.pad, S.pad);
});
