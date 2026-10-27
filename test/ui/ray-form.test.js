import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './dom-kit.js';
import { art, S, HUD, f, part, margin, painter, paint, colours } from './ray-kit.js';

// What The Squall Ray's art is drawn as (the still half is ray-parts.test.js, the live half ray-live.test.js): the silhouette a manta's (pointed tips swept back, a trailing edge
// that sags, a leading edge that bulges toward the player, lobes that project forward) and that it holds the hit boxes (every point of the wing's rect is wing: in a free level a box
// rams, so no corner of it may be sky), the fade of the hull's layers into the HUD, the coil as a Tesla coil that fills its rect, the heart as an orb, the weak points in the ray's own colours.
const shape = await import('../../src/ui/bosses/ray-shape.js');
const { ELECTRODE, PRONG, TORUS } = await import('../../src/ui/bosses/ray-coil.js');
const { ORB } = await import('../../src/ui/bosses/ray-heart.js');

test('the silhouette is a manta\'s: pointed tips swept back, a trailing edge that sags toward the body, a leading edge that bulges toward the player, a top that is not flat', () => {
  const { TRAIL, LEAD, WING_TIP } = shape;
  const [x0, x1] = [TRAIL[0][0], WING_TIP[0]];
  const chord = (edge, x) => edge[0][1] + ((WING_TIP[1] - edge[0][1]) * (x - edge[0][0])) / (x1 - edge[0][0]);
  assert.ok(WING_TIP[1] < -40, `the tip is swept back, up the screen, to ${f(WING_TIP[1])}`);
  const out = x0 + 0.72 * (x1 - x0);
  assert.ok(shape.edgeY(TRAIL, out) > chord(TRAIL, out) + 6, `the trailing edge sags below its chord toward the body out at ${f(out)}: ${f(shape.edgeY(TRAIL, out) - chord(TRAIL, out))} px`);
  const mid = LEAD[0][0] + 0.5 * (x1 - LEAD[0][0]);
  assert.ok(shape.edgeY(LEAD, mid) > chord(LEAD, mid) + 25, `the leading edge bulges toward the player by ${f(shape.edgeY(LEAD, mid) - chord(LEAD, mid))} px at its middle`);
  const [t, l] = [TRAIL.at(-2), LEAD.at(-2)].map(([x, y]) => [x - WING_TIP[0], y - WING_TIP[1]]);
  const angle = (Math.acos((t[0] * l[0] + t[1] * l[1]) / (Math.hypot(...t) * Math.hypot(...l))) * 180) / Math.PI;
  assert.ok(angle < 50, `the tip is a point: ${f(angle)} degrees between its two edges`);
  assert.ok(shape.edgeY(TRAIL, 450) - shape.edgeY(TRAIL, 150) >= 50, 'the top of the wing falls away from the shoulder to the tip: it is no flat line along the HUD');
  const h = shape.HORN.pts;
  assert.ok(h.at(-1)[1] > h[0][1] + 80, 'the lobes project forward, down the screen');
  assert.ok(h.every(([x, y], i) => i === 0 || (x >= h[i - 1][0] && y > h[i - 1][1])), 'and never hook back in under the mouth: each point of them lies further out and further forward than the one before');
  assert.ok(h.every(([x]) => x >= 88), 'they stay either side of the mouth, which is 160 wide');
});

test('the tail arches out from behind the anvil over the right shoulder and stays under the HUD', () => {
  const t = shape.TAIL;
  assert.ok(t[0][0] < 60 && t[0][1] > -130, 'it starts behind the anvil, which is 120 wide and tops the back');
  assert.ok(t.at(-1)[0] > 180, 'and ends out over the shoulder');
  assert.ok(Math.min(...t.map(([, y]) => y)) >= HUD + 10, 'its highest point leaves room for its plates under the HUD');
});

test('the silhouette holds the hit boxes: the wing armour lies in the wing, the heart and the maw in the torso, a coil hangs from the belly of its wing, the spine tops the back', () => {
  const inWing = (x, y) => shape.polyDepth(shape.WING, x, y) > 0;
  const rect = (id) => ({ x: Math.abs(part(id).dx), y: part(id).dy, w: part(id).w, h: part(id).h });
  const wing = rect('wingR');
  // A ship that touches the rect is rammed (core/free.js), so the whole rect, its corners too, is wing, never the sky beside a swept tip.
  for (let i = 0; i <= 11; i++) {
    for (let j = 0; j <= 5; j++) {
      const [x, y] = [wing.x - wing.w / 2 + (wing.w * i) / 11, wing.y - wing.h / 2 + (wing.h * j) / 5];
      assert.ok(inWing(x, y), `(${f(x)}, ${f(y)}) of the wing's rect is wing`);
    }
  }
  for (const id of ['heart', 'maw']) {
    const r = rect(id);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      assert.ok(shape.polyDepth(shape.TORSO, dx * (r.w / 2 - 6), r.y + dy * (r.h / 2 - 6)) > 0, `${id} lies in the torso`);
    }
  }
  const coil = rect('coilR');
  assert.ok(inWing(coil.x - coil.w / 2 + 12, coil.y - coil.h / 2 + 8), 'the inner top corner of a coil is in the belly of its wing: it hangs from it');
  assert.ok(!inWing(coil.x, coil.y + coil.h / 2), 'and the coil is below it');
  const spine = part('spine');
  assert.equal(spine.dy - spine.h / 2, -150, 'the spine tops out at -150');
  const [tip, ball] = [shape.WING_TIP, shape.TIP_BALL];
  assert.ok(ball[0] > tip[0] - 10 && ball[0] < S.W / 2 - 4, 'the lit point of the wing tip is at its end and on the canvas');
  for (const poly of [shape.WING, shape.TORSO]) for (const [, y] of poly) assert.ok(y >= HUD + 20, 'the outline is well under the HUD, so the discs of its edge are too');
});

test('the layers of the hull fade out over the 26 px under the HUD instead of being cut at it: a feather is laid on each, after the glows', () => {
  const [hb, hl] = [recorder(), recorder()];
  art.hull(hb.ctx, hl.ctx, S);
  for (const [name, { calls }] of [['body', hb], ['lights', hl]]) {
    const at = calls.findIndex((c) => c[0] === 'fillRect' && c[2] === HUD && c[4] === 26);
    assert.ok(at >= 0, `${name}: a rect from the HUD's line, 26 px deep, fades the top`);
    assert.ok(at > calls.findLastIndex((c) => c[0] === 'drawImage'), `${name}: and it comes after every picture of cloud and light it fades (only the tail, which is iron, is laid after it)`);
  }
});

test('the coil fills its rect, as a Tesla coil: the art spans its hit box, a donut at the free end ninety px across', () => {
  const c = part('coilL');
  const { b } = paint('coilL');
  assert.ok((b.x1 - b.x0) / c.w >= 0.75, `the coil's art covers ${f((100 * (b.x1 - b.x0)) / c.w)}% of its rect's width`);
  assert.ok((b.y1 - b.y0) / c.h >= 0.9, `and ${f((100 * (b.y1 - b.y0)) / c.h)}% of its height`);
  assert.ok(2 * (TORUS.rx + TORUS.w / 2) >= 80 && 2 * (TORUS.rx + TORUS.w / 2) <= 100, `the toroid is ${f(2 * (TORUS.rx + TORUS.w / 2))} px across`);
  assert.ok(TORUS.y > 0, 'at the free end, the bottom');
});

test('the storm heart is an orb of fifty to sixty px, and the weak points glow the ray\'s own violet and cyan, none of them the yellow the old heart blazed in', () => {
  assert.ok(ORB * 2 >= 50 && ORB * 2 <= 60, `${ORB * 2} px`);
  for (const id of ['heart', 'maw', 'coilL']) {
    const yellow = colours(id).filter((c) => {
      const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(c);
      return m && +m[1] > 180 && +m[2] > 160 && +m[3] < 120 && +m[4] > 0.3;
    });
    assert.deepEqual(yellow, [], `${id}'s lights have no yellow`);
  }
});

test("a coil's electrode and prong, shared with the arcs, lie in its rect and margin", () => {
  const c = part('coilL');
  for (const [x, y] of [ELECTRODE, PRONG]) {
    assert.ok(Math.abs(x) <= c.w / 2 + margin('coilL') && Math.abs(y) <= c.h / 2 + margin('coilL'), `${f(x)}, ${f(y)}`);
  }
  assert.ok(PRONG[0] <= ELECTRODE[0] && PRONG[1] < ELECTRODE[1] - 40, 'the prong rises up toward the wing tip, and no further in than the toroid it is fed from');
});
