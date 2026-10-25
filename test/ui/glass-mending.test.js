import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// The mending, world 7's reassemble twist drawn as shattered glass in world 16: the wreck is a cloud of shards, stone
// chips and lead (mending-view.js, from shard-sprites.js), the stand-up and the shot-down wreck are the fx rings 'mend'
// and 'scatter' (mending-fx-view.js). The reactions that add the rings are test/fx/react-glass.test.js.
installCanvas(64);
const made = [];
const stand = document.createElement;
document.createElement = (...a) => {
  const T = tracker();
  const c = { ...stand(...a), getContext: () => T.ctx, T };
  made.push(c);
  return c;
};
const { PIECES, pieceAt, drawMending, seedOf } = await import('../../src/ui/mending-view.js');
const { drawMend, drawScatter } = await import('../../src/ui/mending-fx-view.js');
const { warmShards, shardSprite, chipSprite, cameSprite, SHARD_SHAPES, CHIP_SHAPES, GLASSES } = await import('../../src/ui/shard-sprites.js');
const { drawAliens } = await import('../../src/ui/aliens/index.js');
const { warmAliens } = await import('../../src/ui/aliens/bake.js');
const { warmGlass } = await import('../../src/ui/warm-glass.js');
const { WRECK_TIME } = await import('../../src/core/twists-2.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { MEND_LIFE, SCATTER_LIFE } = await import('../../src/fx/react-glass.js');

const look = LOOKS[15];
const wreck = (age, extra = {}) => ({ x: 800, y: 300, hp: 1, left: WRECK_TIME - age, slot: { row: 1, col: 2 }, wreck: true, ...extra });
const at = { x: 0, y: 0, z: 0, rot: 0, scale: 1 };
const where = (seed, age) => PIECES.map((_, i) => ({ ...pieceAt(i, seed, age, { ...at }) }));
const FILES = ['mending-view.js', 'mending-fx-view.js', 'shard-sprites.js', 'ship-glass.js', 'ship-glass-sprites.js', 'shots-glass.js', 'glass-kit.js', 'pickup-glass.js', 'bunker-glass.js', 'warm-glass.js'];

test('warming paints every shard, chip and lead strip, and they lie inside their canvases', () => {
  const before = made.length;
  warmShards();
  const baked = made.slice(before);
  assert.equal(baked.length, SHARD_SHAPES * GLASSES.length + CHIP_SHAPES + 1, 'every cut in every glass, the chips and the came');
  for (const c of baked) {
    const b = c.T.bounds;
    assert.ok(b.x0 >= 2 && b.y0 >= 2 && b.x1 <= c.width - 2 && b.y1 <= c.height - 2, `${c.width}x${c.height}: ${[b.x0, b.y0, b.x1, b.y1].map(Math.round)}`);
  }
  assert.ok(shardSprite(0, 0) !== shardSprite(1, 0) && shardSprite(0, 0) !== shardSprite(0, 1) && chipSprite(0) !== cameSprite(), 'each is its own sprite');
  warmAliens(look); // the ghost of the gargoyle is its own sprite, baked with the level's aliens
  warmGlass(look); // and the glows are baked with the rest of the world's sprites
  const warmed = made.length;
  for (let t = 0; t < 2; t += 0.13) drawMending(tracker().ctx, wreck(t), look, 3 + t);
  assert.equal(made.length, warmed, 'drawing baked nothing more');
});

test('the cloud is sixteen pieces: glass in the aliens\' jewel colours, chips of stone and strips of lead', () => {
  assert.equal(PIECES.length, 16);
  const kinds = { glass: 0, chip: 0, came: 0 };
  for (const p of PIECES) kinds[p.kind]++;
  assert.ok(kinds.glass >= 9 && kinds.chip >= 3 && kinds.came >= 1, JSON.stringify(kinds));
  assert.ok(new Set(PIECES.filter((p) => p.kind === 'glass').map((p) => p.color)).size >= 4, 'at least four glasses in it');
  assert.ok(new Set(PIECES.map((p) => p.reach.toFixed(1))).size >= 12, 'each ring is its own size');
});

test('a piece is a pure function of the wreck\'s age and its seed: the same every time, different for another wreck', () => {
  assert.deepEqual(where(5, 0.9), where(5, 0.9));
  assert.notDeepEqual(where(5, 0.9), where(6, 0.9));
  assert.equal(seedOf({ row: 1, col: 2 }), 1 * 31 + 2 * 7 + 3);
  assert.equal(seedOf(null, 100, 200), Math.round(100 * 0.37 + 200 * 0.11));
});

test('the pieces fly out of the body in the first third of a second, hang and turn slowly, drift wider as the light gathers', () => {
  const spread = (age) => Math.max(...where(3, age).map((p) => Math.hypot(p.x, p.y)));
  assert.ok(spread(0) < 14, `all at the middle at the break: ${spread(0)}`);
  assert.ok(spread(0.35) > 20 && spread(0.35) < 45, `out by 0.35 s: ${spread(0.35)}`);
  assert.ok(spread(1.95) > spread(0.9) * 1.2, 'wider again at the end');
  const [a, b] = [where(3, 0.7), where(3, 0.8)];
  const step = Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));
  assert.ok(step > 0.3 && step < 8, `it turns slowly: at most ${step.toFixed(1)} px in a tenth of a second`);
  for (const age of [0, 0.5, 1.2, 2]) for (const p of where(3, age)) assert.ok(Math.abs(p.z) <= 1 && p.scale > 0.3 && p.scale < 1.3);
});

test('a wreck draws sixteen pieces, far ones first, glints over them, and its glow; the gargoyle\'s ghost comes up only at the end', () => {
  const calls = (age) => {
    const T = tracker();
    drawMending(T.ctx, wreck(age), look, 4);
    return T.calls;
  };
  const early = calls(0.6);
  const bodies = (c) => c.filter((x) => x.comp === 'source-over' && x.alpha > 0.3);
  assert.ok(bodies(early).length >= 16, `a body each: ${bodies(early).length}`);
  assert.ok(early.length >= 17 && early.length <= 30, `${early.length} images before the light gathers`);
  const late = calls(1.95);
  assert.ok(late.length > early.length, 'the ghost and its lights come in the last second');
  const ghosts = late.filter((c) => c.box[2] - c.box[0] > 60 && c.comp === 'source-over');
  assert.ok(ghosts.length >= 1, 'a faint body the size of the alien');
  assert.ok(ghosts.every((g) => g.alpha < 0.6), 'faint');
  assert.equal(early.filter((c) => c.box[2] - c.box[0] > 60 && c.comp === 'source-over').length, 0, 'none early on');
  const first = calls(0.05);
  assert.ok(Math.max(...first.filter((c) => c.comp === 'source-over').map((c) => c.alpha)) < 0.6, 'the cloud fades in over the break');
  const placed = calls(1).filter((c) => c.comp === 'source-over' && c.box[2] - c.box[0] < 40);
  assert.ok(placed.every((c) => Math.hypot((c.box[0] + c.box[2]) / 2 - 800, (c.box[1] + c.box[3]) / 2 - 300) < 70), 'every piece hangs about the wreck');
});

test('a wreck in the formation hangs where its slot is, and a wreck stands where it fell: the draw only uses its x and y', () => {
  const T = tracker();
  drawMending(T.ctx, wreck(1, { x: 300, y: 450 }), look, 4);
  assert.ok(T.bounds.x0 > 200 && T.bounds.x1 < 400 && T.bounds.y0 > 350 && T.bounds.y1 < 550, JSON.stringify(T.bounds));
});

test('the aliens\' own draw sends a world 16 wreck to the cloud and leaves every other world\'s wreck as it was', () => {
  const world = (w) => ({ aliens: [], wrecks: [wreck(1)], saucer: null, level: { world: w } });
  const glass = recorder();
  drawAliens(glass.ctx, world(16), look, 4);
  const iron = recorder();
  drawAliens(iron.ctx, world(7), LOOKS[6], 4);
  const images = (r) => r.calls.filter(([k]) => k === 'drawImage').length;
  assert.ok(images(glass) >= 17, `the cloud: ${images(glass)} images`);
  assert.ok(images(iron) <= 6, `the crawler's wreck: ${images(iron)} images`);
});

const ring = (extra = {}) => ({ x: 640, y: 300, seed: 5, color: '#d8f4ff', max: 0.5, life: 0.5, ...extra });
const flight = (draw, u, extra) => {
  const T = tracker();
  const r = recorder();
  draw(T.ctx, ring({ life: 0.5 * (1 - u), ...extra }));
  draw(r.ctx, ring({ life: 0.5 * (1 - u), ...extra }));
  return { T, r };
};
const pieces = (calls) => calls.filter((c) => c.comp === 'source-over' && c.box[2] - c.box[0] < 40 && c.alpha > 0.01);

test('the stand-up flies the pieces in from where the wreck hung, and ends in a flash and a rainbow ring', () => {
  const start = flight(drawMend, 0).T;
  const hung = where(5, WRECK_TIME);
  assert.equal(pieces(start.calls).length, 16, 'every piece is there at the start');
  const first = pieces(start.calls)[0];
  const [cx, cy] = [(first.box[0] + first.box[2]) / 2, (first.box[1] + first.box[3]) / 2];
  assert.ok(Math.abs(cx - (640 + hung[0].x)) < 1 && Math.abs(cy - (300 + hung[0].y)) < 1, 'the first piece starts exactly where the cloud left it');
  const spread = (u) => Math.max(...pieces(flight(drawMend, u).T.calls).map((c) => Math.hypot((c.box[0] + c.box[2]) / 2 - 640, (c.box[1] + c.box[3]) / 2 - 300)));
  assert.ok(spread(0.2) < spread(0) && spread(0.5) < spread(0.2) && spread(0.78) < 6, `they close in, faster and faster: ${[0, 0.2, 0.5, 0.78].map((u) => spread(u).toFixed(1))}`);
  const glow = (u) => Math.max(...flight(drawMend, u).T.calls.filter((c) => c.comp === 'lighter' && c.box[2] - c.box[0] > 100).map((c) => c.alpha), 0);
  assert.ok(glow(0.1) === 0 && glow(0.75) > 0.7 && glow(0.99) < 0.2, `a flash as they arrive: ${[0.1, 0.75, 0.99].map((u) => glow(u).toFixed(2))}`);
  const arcs = flight(drawMend, 0.8).r.calls.filter(([k]) => k === 'arc').length;
  assert.equal(arcs, 5, 'a ring of each of the five colours of the rainbow');
  assert.equal(pieces(flight(drawMend, 0.98).T.calls).length, 0, 'and the pieces are gone');
});

test('a wreck shot down scatters: the pieces fly out, fall, flash as they turn, and fade; a white flash starts it', () => {
  const far = (u) => Math.max(...pieces(flight(drawScatter, u).T.calls).map((c) => Math.hypot((c.box[0] + c.box[2]) / 2 - 640, (c.box[1] + c.box[3]) / 2 - 300)), 0);
  assert.ok(far(0.1) < far(0.4) && far(0.4) < far(0.7), `${[0.1, 0.4, 0.7].map((u) => far(u).toFixed(0))}`);
  const lowest = (u) => Math.max(...pieces(flight(drawScatter, u).T.calls).map((c) => c.box[3]));
  assert.ok(lowest(0.7) > 300 + 100, 'they fall');
  const glints = (u) => flight(drawScatter, u).T.calls.filter((c) => c.comp === 'lighter' && c.box[2] - c.box[0] < 24).length;
  assert.ok([0.2, 0.35, 0.5, 0.65].some((u) => glints(u) >= 1), 'glints run over the pieces');
  const burst = (u) => flight(drawScatter, u).T.calls.filter((c) => c.comp === 'lighter' && c.box[2] - c.box[0] >= 100).length;
  assert.ok(burst(0.05) >= 2 && burst(0.5) === 0, 'the flash is only at the start');
  assert.equal(pieces(flight(drawScatter, 0.999).T.calls).length, 0, 'faded away by the end');
  assert.ok(MEND_LIFE > 0.3 && MEND_LIFE < 0.6 && SCATTER_LIFE > 0.6 && SCATTER_LIFE < 1.2);
});

test('the glass files follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines', () => {
  for (const name of FILES) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
  for (const name of ['react-glass.js']) {
    const src = readFileSync(new URL(`../../src/fx/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200 && !/Math\.random|Date\.now|document|window/.test(src), `${name} is short and pure`);
  }
});
