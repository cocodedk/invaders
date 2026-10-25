import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';

// The Grand Grimoire's art under stand-in canvases: what each part puts on the lights layer, where the
// art lies against the boss's box, and the live extras, which are cached sprites only (the opaque ones
// only in the boss's own pass).
installCanvas(64);
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART, painterFor } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { LINES, leaf } = await import('../../src/ui/bosses/grimoire-kit.js');
const { board, CORNER_Y, CORNER_LIP, BINDING } = await import('../../src/ui/bosses/grimoire-cover.js');
const { FAN } = await import('../../src/ui/bosses/grimoire-body.js');
const { FLEURS, arch } = await import('../../src/ui/bosses/grimoire-crown.js');

const look = LOOKS[11];
const def = BOSS_DEFS.find((d) => d.kind === 'grimoire');
const art = BOSS_ART.grimoire;
const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;

test('every part of the grimoire, and its hull, paints lights: script, runes, the eye, the quills, the stone', () => {
  const hull = recorder();
  art.hull(recorder().ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 6, `the hull lights: ${lit(hull.calls)}`);
  for (const p of def.parts) {
    const [paint] = painterFor(art, p.id);
    const b = recorder();
    const l = recorder();
    paint(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 5, `${p.id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls) * 0.5, `${p.id} has a body too`);
  }
  assert.ok(lit((() => { const l = recorder(); painterFor(art, 'pageL')[0](recorder().ctx, l.ctx, def.parts[2], S); return l; })().calls) >= 2 * LINES.length, 'a page lights every ruled line twice, a thread and a glow');
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 1, `phase ${phase} glows behind the spread`);
  }
});

const TOP = -158; // the highest the art may reach: the boss rests at 260 and the HUD ends at 96, so this clears it

// The points a path painter draws through, its bezier curves sampled.
function trace(draw) {
  const pts = [];
  let at = [0, 0];
  const g = {
    beginPath() {},
    closePath() {},
    moveTo: (x, y) => pts.push((at = [x, y])),
    lineTo: (x, y) => pts.push((at = [x, y])),
    bezierCurveTo(ax, ay, bx, by, x, y) {
      for (let i = 1; i <= 24; i++) {
        const [u, v] = [i / 24, 1 - i / 24];
        pts.push([v ** 3 * at[0] + 3 * v * v * u * ax + 3 * v * u * u * bx + u ** 3 * x, v ** 3 * at[1] + 3 * v * v * u * ay + 3 * v * u * u * by + u ** 3 * y]);
      }
      at = [x, y];
    },
  };
  draw(g);
  return pts;
}

test('the page outline lies inside its hit box and the book inside the boss box', () => {
  const page = def.parts.find((p) => p.id === 'pageL');
  for (const [x, y] of trace(leaf)) {
    assert.ok(Math.abs(x) <= page.w / 2 + 6 && Math.abs(y) <= page.h / 2 + 6, `the outline's point ${x},${y} is within a few px of the page's box`);
    assert.ok(Math.abs(page.dx + x) <= def.size.w / 2 && page.dy + y >= TOP && page.dy + y <= def.size.h / 2, 'and within the boss box');
  }
  for (const p of def.parts) assert.ok(Math.abs(p.dx) + p.w / 2 <= def.size.w / 2 && p.dy - p.h / 2 >= -def.size.h / 2 && p.dy + p.h / 2 <= def.size.h / 2, `${p.id} is within the box`);
});

test('nothing on the hull rises above y -158, ink outlines and all: cover, corner plates, binding, fanned leaves, fleurons', () => {
  const page = def.parts.find((p) => p.id === 'pageL');
  const crown = def.parts.find((p) => p.id === 'crown');
  assert.ok(Math.min(...trace(board).map(([, y]) => y)) - 1.8 >= TOP, 'the boards, their outline 3.6 wide');
  assert.ok(CORNER_Y - CORNER_LIP - 1.5 >= TOP, 'the corner plates, outline 3 wide');
  assert.ok(Math.min(...BINDING.map(([, y]) => y)) - 1.3 >= TOP, 'the binding');
  for (const [, dy, tilt, k] of FAN) {
    const tops = trace(leaf).map(([x, y]) => (x + 127) * k * Math.sin(tilt) + (y - 98) * k * Math.cos(tilt) + dy + 98);
    assert.ok(page.dy + Math.min(...tops) - 1.2 >= TOP, `the leaf fanned by ${dy}: ${page.dy + Math.min(...tops)}`);
  }
  for (const [x, h] of FLEURS) assert.ok(crown.dy + arch(x) - 8 - h - 0.75 >= TOP, `the fleuron at ${x}: ${crown.dy + arch(x) - 8 - h}`);
});

// A boss to draw live extras for: parts at their places, every one alive.
const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy })) });
const images = (b, t, own = false) => {
  const { ctx, calls } = recorder();
  art.live(ctx, b, t, 1, own, 10);
  return calls.filter(([k]) => k === 'drawImage').length;
};

test('script glints crawl and the eye, quills and stones burn at rest; ghost leaves fan out from the second phase, the storm comes with the last', () => {
  const [rest, hover, orbit] = [0, 1, 2].map((phase) => images(boss(phase), 14));
  assert.ok(rest >= 25, `${rest} glows at rest`);
  assert.ok(hover >= rest + 3 + 2 * LINES.length, `${hover} in the hover phase: the script burning on every ruled line of both pages, ghost leaves, every jewel`);
  assert.ok(orbit >= hover + 20, `${orbit} in the orbit phase: five ghost leaves a side and a glow on every torn page`);
});

test("the pupil, the turning leaf and the torn pages are opaque and come only in the boss's own pass", () => {
  assert.equal(images(boss(0), 14, true) - images(boss(0), 14), 1, 'the pupil');
  assert.ok(images(boss(2), 14, true) >= images(boss(2), 14) + 20, 'and the torn pages themselves');
  const leafAt = (t) => images(boss(0), t, true) - images(boss(0), t);
  assert.equal(leafAt(2.5), 2, 'a leaf is turning at 2.5 s: the pupil and the leaf');
  assert.equal(leafAt(6), 1, 'and not at 6 s');
});

test('the storm spirals out of the eye when the phase begins, and keeps its place once the eye is gone', () => {
  const b = boss(1);
  images(b, 10);
  b.phase = 2;
  const [began, later] = [10.1, 14].map((t) => images(b, t, true));
  assert.ok(later >= began, 'pages fade in');
  const dead = boss(2);
  dead.parts.find((p) => p.id === 'eye').hp = 0;
  assert.ok(images(dead, 14, true) > later - 25, 'the storm outlives the eye: only its glows go');
});

test('a dying part leaves no glow behind in the live extras: not its script, its jewels, its ink, its eye', () => {
  const b = boss(0);
  for (const p of b.parts) p.hp = 0;
  assert.equal(images(b, 3), 0);
  const noQuills = boss(0);
  for (const p of noQuills.parts) if (p.id.startsWith('quill')) p.hp = 0;
  assert.ok(images(boss(0), 3) - images(noQuills, 3) >= 8, 'ink and sparks gone from both nibs');
  const noPage = boss(0);
  noPage.parts.find((p) => p.id === 'pageL').hp = 0;
  assert.ok(images(boss(0), 3) - images(noPage, 3) >= 5, 'glints and twinkles gone from a destroyed page');
});
