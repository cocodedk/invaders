import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scribe, W } from './bath-kit.js';
import { recorder } from './dom-kit.js';

// World 21's backdrop cast and city (the owner asked for them, 2026-11-19; docs/lean/02-world-21.md, C1 amended for the backdrop):
// every figure and building painter draws under a stand-in canvas; the sky's vulture and champion stand in the frame under the HUD;
// the causeway carries the host and the giant's islet under the horizon, and the near shore its ranks, banners, drum and the archer, who stays in the frame wherever the ship
// flies; on the boss level the champion stands where none of the king's parts reaches in any phase; the city is the same on every level
// and each burning roof sits under the sky's smoke; the sky's streaking arrows keep off its figures; the mark is the only text (C3).
const look = { world: 21, ...(await import('../../src/ui/looks/w21.js')).default };
const { makeRng } = await import('../../src/core/rng.js');
const { HUD_BOTTOM, TICK } = await import('../../src/core/kinds.js');
const { FREE_ZONE } = await import('../../src/core/ship.js');
const { buildSky } = await import('../../src/ui/sky.js');
const { buildLayers, layerX, MARGIN } = await import('../../src/ui/parallax.js');
const { BODIES13, ARROWS } = await import('../../src/ui/sky-bodies-13.js');
const { ISLE_LAYERS } = await import('../../src/ui/parallax-isle.js');
const { CAST, ISLE, MARK, fireAt } = await import('../../src/ui/isle-kit.js');
const { champion, CHAMPION } = await import('../../src/ui/isle-champion.js');
const { vulture, VULTURE } = await import('../../src/ui/isle-vulture.js');
const { archer, ARCHER } = await import('../../src/ui/isle-archer.js');
const { warrior, standard, wardrum, POSES, BANNER, DRUM } = await import('../../src/ui/isle-host.js');
const { grove } = await import('../../src/ui/isle-grove.js');
const { BUILD, GOLDS, palette } = await import('../../src/ui/isle-palace.js');
const { summit } = await import('../../src/ui/isle-summit.js');
const { SHORE } = await import('../../src/ui/parallax-isle-shore.js');
const { CAUSEWAY, ISLET } = await import('../../src/ui/parallax-isle-causeway.js');
const { giant, GIANT } = await import('../../src/ui/isle-giant.js');
const { CITY, ridge } = await import('../../src/ui/parallax-isle-city.js');
const { LEVELS } = await import('../../src/core/levels.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { stepMove } = await import('../../src/core/boss-move.js');
const finale = LEVELS.find((l) => l.world === look.world && l.boss);
const [fx, fy, fk] = CAST.finale;
const FINALE = { w: CHAMPION.w * fk, h: CHAMPION.h * fk }; // the champion's box on the boss level
const SWEEP = 120; // s each of the king's phases is followed for, many times round each of its moves

const images = (paint) => {
  const r = recorder();
  paint(r.ctx);
  return r.calls.filter(([k]) => k === 'drawImage');
};
const SHIPS = [FREE_ZONE.x0, W / 2, FREE_ZONE.x1];

test('every figure and building painter draws', () => {
  const figures = {
    champion: (g) => champion(g, 0, 0, 0), vulture: (g) => vulture(g, 0, 0, 0), archer: (g) => archer(g, 100, 240, 200, 0),
    summit: (g) => summit(g, 100, 200, 120, [1, 0]), banner: (g) => standard(g, 50, 240, 200), drum: (g) => wardrum(g, 80, 160, 100), giant: (g) => giant(g, 0, 200, 0), grove: (g) => grove(g, 0, 160, makeRng(1), GOLDS[0]),
    ...Object.fromEntries(Object.keys(POSES).map((p) => [p, (g) => warrior(g, p, 50, 150, 90)])),
  };
  for (const [name, paint] of Object.entries(figures)) assert.ok(images(paint).length > 0, name);
  for (const [name, build] of Object.entries(BUILD)) {
    const r = recorder();
    build(r.ctx, 100, 200, 60, 90, palette(0.1, GOLDS[1]), makeRng(2));
    assert.ok(r.calls.filter(([k]) => k === 'fill' || k === 'fillRect').length > 2, name);
  }
});

test("the sky paints the vulture and the champion where CAST puts them, in the frame, under the HUD and over the island's waterline", () => {
  const r = recorder();
  BODIES13[look.body](r.ctx, look);
  const [vx, vy] = CAST.vulture;
  const [cx, cy] = CAST.champion;
  assert.ok(r.calls.some(([k, x, y]) => k === 'translate' && x === vx + VULTURE.w / 2 && y === vy + VULTURE.h / 2), 'the vulture');
  assert.ok(r.calls.some(([k, , x, y]) => k === 'drawImage' && x === cx && y === cy), 'the champion');
  const boss = recorder();
  BODIES13[look.body](boss.ctx, look, finale);
  assert.ok(boss.calls.some(([k, , x, y, w, h]) => k === 'drawImage' && x === fx && y === fy && w === FINALE.w && h === FINALE.h), 'the champion on the boss level');
  for (const [[x, y], { w, h }, name] of [[CAST.vulture, VULTURE, 'vulture'], [CAST.champion, CHAMPION, 'champion'], [CAST.finale, FINALE, 'boss-level champion']]) {
    assert.ok(x >= 0 && x + w <= W && y >= HUD_BOTTOM && y + h <= ISLE.sea, `the ${name}'s box ${x},${y} ${w}x${h}`);
  }
});

test('the causeway carries the host on its stones, and the near shore its ranks, banners, drum and the archer', () => {
  const [, mid, near] = look.layers;
  const out = { lights: [], signs: [] };
  const onCauseway = images((g) => ISLE_LAYERS[mid.kind](g, W + 2 * MARGIN, mid.height, makeRng(5), mid, out)).length;
  assert.ok(onCauseway >= CAUSEWAY.n, `${onCauseway} walkers for ${CAUSEWAY.n} stones`);
  assert.ok(ISLET[1] - GIANT.h >= ISLE.sea && ISLET[0] >= 0 && ISLET[0] + GIANT.w <= W, "the giant's islet lies under the horizon, in the frame");
  const onShore = images((g) => ISLE_LAYERS[near.kind](g, W + 2 * MARGIN, near.height, makeRng(5), near, out)).length;
  assert.ok(onShore >= SHORE.ranks.flat().length + SHORE.banners.length + 2, `${onShore} figures on the shore`);
});

test("the archer, the banners and the drum stay in the frame wherever the ship flies, and nothing on the shore or the summits is cut by its layer's top", () => {
  const [far, , near] = buildLayers(look, 3);
  const [ax, ay, at] = SHORE.archer;
  const [dx, dy, dt] = SHORE.drum;
  const boxes = [ // [what, left, width, top] in the frame with the ship at the middle
    ['the archer', ax - (ARCHER.w / 2) * (at / ARCHER.foot), ARCHER.w * (at / ARCHER.foot), ay - at],
    ...SHORE.banners.map(([x, y, t]) => ['a banner', x - BANNER.pole * (t / BANNER.h), BANNER.w * (t / BANNER.h), y - t]),
    ['the drum', dx - (DRUM.w / 2) * (dt / DRUM.h), DRUM.w * (dt / DRUM.h), dy - dt],
  ];
  for (const [what, x0, w, top] of boxes) {
    assert.ok(top > near.top && top > HUD_BOTTOM, `${what}'s top ${top} is in the near layer (from ${near.top})`);
    for (const ship of SHIPS) {
      const x = x0 + layerX(near, ship) + MARGIN;
      assert.ok(x >= 0 && x + w <= W, `with the ship at ${ship} ${what} spans ${x}..${x + w}`);
    }
  }
  for (const [i, tall] of CITY.crowns.entries()) {
    const tip = ridge(ISLE.peaks[i][0]) + CITY.seat - tall;
    assert.ok(tip > far.top, `the palace on peak ${i} reaches ${tip}, the far layer starts at ${far.top}`);
  }
});

test("the sky's streaking arrows, their glows with them, cross neither of the sky's figures", () => {
  const boxes = [[CAST.vulture, VULTURE], [CAST.champion, CHAMPION], [CAST.finale, FINALE]];
  const clear = (px, py, pad) => boxes.every(([[bx, by], { w, h }]) => Math.hypot(Math.max(bx - px, 0, px - bx - w), Math.max(by - py, 0, py - by - h)) > pad);
  for (const [x, y, len] of ARROWS.at) {
    for (let i = 0; i <= 20; i++) assert.ok(clear(x - (len * i) / 20, y - (len * ARROWS.drop * i) / 20, ARROWS.head), `the arrow at ${x},${y}, ${i}/20 along`);
    assert.ok(clear(x - len * ARROWS.emberAt, y - len * ARROWS.emberAt * ARROWS.drop, ARROWS.ember), `the arrow at ${x},${y}: its ember glow`);
  }
});

test("on the boss level the champion's box stays clear of every one of the king's parts, wherever each phase takes him", () => {
  const def = bossDef(finale.boss);
  for (let phase = 0; phase < def.phases.length; phase++) {
    const b = { x: W / 2, y: def.y, clock: 0, phase, enter: 0 };
    for (let t = 0; t < SWEEP; t += TICK) {
      stepMove(b, def, TICK, { x: W / 2, y: FREE_ZONE.y1 });
      for (const p of def.parts) {
        const [x0, y0] = [b.x + p.dx - p.w / 2, b.y + p.dy - p.h / 2];
        const apart = x0 + p.w <= fx || x0 >= fx + FINALE.w || y0 + p.h <= fy || y0 >= fy + FINALE.h;
        assert.ok(apart, `phase ${phase}: ${p.id} at ${Math.round(b.x)},${Math.round(b.y)} covers the champion`);
      }
    }
  }
});

test('the city is the same on every level, and each burning roof flickers under the smoke the sky raises over it', () => {
  const lights = (seed) => buildLayers(look, seed)[0].lights.map(({ x, y, r, color, mode, ph }) => ({ x, y, r, color, mode, ph }));
  assert.deepEqual(lights(3), lights(97));
  const far = buildLayers(look, 3)[0];
  for (const f of ISLE.fires) {
    const [fx, fy] = fireAt(f);
    const fire = far.lights.find((p) => p.mode === 'flicker' && p.x === fx + MARGIN);
    assert.ok(fire, `a fire at ${fx}`);
    assert.ok(Math.abs(far.top + fire.y - fy) < ISLE.tall[f[1]] * 0.25, `the fire at ${fx} burns at ${far.top + fire.y}, the smoke rises from ${fy}`);
  }
});

test('the mark is the only text the backdrop draws: nothing is written on the cast, the city or the stones (C3)', () => {
  const s = scribe();
  buildSky(look);
  buildLayers(look, 3);
  s.restore();
  assert.deepEqual(s.texts.map((t) => t.text), [MARK]);
});
