import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_DEFS, bossDef } from '../../src/core/bosses-data.js';
import { BOSSES, PATTERNS, ROLES, HUD_BOTTOM } from '../../src/core/kinds.js';
import { WARN } from '../../src/core/boss-attack.js';

const sum = (parts) => parts.reduce((n, p) => n + p.hp, 0);

// The weak parts by the time phase `i` begins: weak from the start, or opened by phase i or before.
const weakAt = (def, i) => def.parts.filter((p) =>
  p.weak || def.phases.some((ph, j) => j <= i && ph.open?.includes(p.id)));

test('there are seventeen definitions, in world order, looked up by kind', () => {
  assert.deepEqual(BOSS_DEFS.map((d) => d.kind), BOSSES);
  for (const kind of BOSSES) assert.equal(bossDef(kind).kind, kind);
  assert.equal(bossDef('nope'), undefined);
});

test('each definition is plain data: maxHp is the sum of its parts, ids are unique, parts fit the size', () => {
  for (const def of BOSS_DEFS) {
    assert.equal(def.maxHp, sum(def.parts), def.kind);
    assert.equal(new Set(def.parts.map((p) => p.id)).size, def.parts.length, `${def.kind} ids`);
    assert.equal(typeof def.name, 'string');
    assert.doesNotThrow(() => structuredClone(def));
    for (const p of def.parts) {
      assert.ok(p.hp > 0 && p.w > 0 && p.h > 0, `${def.kind}/${p.id}`);
      assert.ok(!(p.weak && p.armor), `${def.kind}/${p.id} is weak or armoured, not both`);
      assert.ok(Math.abs(p.dx) + p.w / 2 <= def.size.w / 2, `${def.kind}/${p.id} fits the width`);
      assert.ok(Math.abs(p.dy) + p.h / 2 <= def.size.h / 2, `${def.kind}/${p.id} fits the height`);
    }
    assert.ok(def.y - def.size.h / 2 >= 0 && def.y + def.size.h / 2 <= 620, `${def.kind} stays above the player zone`);
  }
});

// Ruling R28: at its resting place (before any sway, hover or charge) no part is under the HUD,
// which ends at HUD_BOTTOM (y 96), so every silhouette is seen whole.
test('at rest every part of every boss is below the HUD (no rect top above y 100)', () => {
  for (const def of BOSS_DEFS) {
    for (const p of def.parts) {
      const top = def.y + p.dy - p.h / 2;
      assert.ok(top >= HUD_BOTTOM + 4, `${def.kind}/${p.id} top at y ${top}`);
    }
  }
});

test('every boss has 2 or 3 phases at falling hp thresholds, the last at 0', () => {
  for (const def of BOSS_DEFS) {
    const n = def.phases.length;
    assert.ok(n >= 2 && n <= 3, `${def.kind} has ${n} phases`);
    const until = def.phases.map((p) => p.until);
    assert.equal(until[n - 1], 0);
    for (let i = 0; i < n - 1; i++) assert.ok(until[i] > until[i + 1] && until[i] < 1, `${def.kind} thresholds`);
    for (const ph of def.phases) assert.ok(['sway', 'hover', 'charge', 'orbit'].includes(ph.move), ph.move);
  }
});

test('every phase of every boss defines a weak part, and the bare hulls fit inside the last phase', () => {
  for (const def of BOSS_DEFS) {
    def.phases.forEach((ph, i) => assert.ok(weakAt(def, i).length >= 1, `${def.kind} phase ${i}`));
    // Hulls cannot be hurt until a phase opens them: their hp must be what is left when the last
    // phase begins, or a boss reduced to its hulls could not be finished.
    const hulls = def.parts.filter((p) => !p.weak && !p.armor);
    const opens = hulls.every((p) => def.phases.some((ph) => ph.open?.includes(p.id)));
    assert.ok(opens, `${def.kind}: every hull is opened by some phase`);
    const last = def.phases.at(-2).until;
    assert.ok(sum(hulls) <= last * def.maxHp + 1e-9, `${def.kind}: hulls hold ${sum(hulls)} of ${def.maxHp}`);
  }
});

test('attacks come from real parts with real patterns, and are slower than their own telegraph', () => {
  for (const def of BOSS_DEFS) {
    const ids = def.parts.map((p) => p.id);
    for (const ph of def.phases) {
      assert.ok(ph.attacks.length >= 1, `${def.kind} attacks in every phase`);
      for (const a of ph.attacks) {
        assert.ok(PATTERNS.includes(a.pattern), `${def.kind}: ${a.pattern}`);
        assert.ok(ids.includes(a.from), `${def.kind}: from ${a.from}`);
        assert.ok(a.every >= WARN + 0.8, `${def.kind} ${a.pattern} every ${a.every}`);
      }
      for (const m of ph.minions ?? []) {
        assert.ok(m.role in ROLES && m.count >= 1 && m.every >= 4, `${def.kind} minions`);
        assert.ok(ids.includes(m.from), `${def.kind}: minions from ${m.from}`);
      }
    }
  }
  assert.ok(WARN >= 0.6, 'the telegraph is at least 0.6 s');
});

// Power-ups come all through a fight, not only at its end (R55).
test('every phase of every boss sends one carrier at a time, at least every 5 s', () => {
  for (const def of BOSS_DEFS) {
    def.phases.forEach((ph, i) => {
      const carriers = (ph.minions ?? []).filter((m) => m.role === 'carrier');
      assert.equal(carriers.length, 1, `${def.kind} phase ${i}`);
      assert.ok(carriers[0].count === 1 && carriers[0].every <= 5, `${def.kind} phase ${i}`);
    });
  }
});

test('the bosses differ: layouts, part counts and attack mixes are not copies of one another', () => {
  const sig = BOSS_DEFS.map((d) => JSON.stringify([d.parts.map((p) => [p.dx, p.dy]), d.phases.map((p) => p.attacks.map((a) => a.pattern))]));
  assert.equal(new Set(sig).size, 17);
  for (const def of BOSS_DEFS) assert.ok(def.parts.length >= 5, `${def.kind} has parts`);
  assert.ok(BOSS_DEFS.some((d) => d.phases.some((p) => p.open)), 'a trench that opens');
});

// The Crystal Wyrm never charges, shoots ice shards from its gems and the laser from its maw, keeps
// its face clear of the HUD at the top of its orbit (the orbit climbs 55 px: boss-move.js, R28) and
// ends no lower than the Count.
test('the Crystal Wyrm sways, hovers and circles, shoots shards, and sits no lower than the Count', () => {
  const wyrm = bossDef('wyrm');
  assert.deepEqual(wyrm.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  const head = wyrm.parts.find((p) => p.id === 'head');
  assert.ok(wyrm.y + head.dy - head.h / 2 - 55 >= HUD_BOTTOM, 'the face clears the HUD at the top of the orbit');
  assert.ok(wyrm.bottom <= bossDef('count').bottom, 'no lower than the Count');
  const attacks = wyrm.phases.flatMap((p) => p.attacks);
  assert.ok(attacks.some((a) => a.pattern === 'shuriken' && a.from.startsWith('gem')), 'shards from the gems');
  assert.ok(attacks.some((a) => a.pattern === 'laser' && a.from === 'maw'), 'the frost laser from the maw');
  assert.ok(attacks.some((a) => a.pattern === 'rain' && a.from === 'crest'), 'hail from the crest');
  assert.ok(wyrm.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver')), 'snow owls in phases 2 and 3');
  for (const id of ['maw', 'gemL', 'gemR']) assert.ok(wyrm.parts.find((p) => p.id === id).weak, id);
});

// The Grand Grimoire never charges, keeps its sigil-eye clear of the HUD at the top of its orbit,
// ends no lower than the wyrm, and works every pattern of its kind: aimed bolts and the laser from
// the eye, fans and spirals from the quills, rings from the clasp, homing sparks from the pages.
test('the Grand Grimoire sways, hovers and circles, writes its attacks, and sits no lower than the wyrm', () => {
  const grimoire = bossDef('grimoire');
  assert.deepEqual(grimoire.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  const eye = grimoire.parts.find((p) => p.id === 'eye');
  assert.ok(grimoire.y + eye.dy - eye.h / 2 - 55 >= HUD_BOTTOM, 'the eye clears the HUD at the top of the orbit');
  assert.ok(grimoire.bottom <= bossDef('wyrm').bottom, 'no lower than the wyrm');
  const from = (pattern, part) => grimoire.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(part));
  assert.ok(from('aimed', 'eye') && from('laser', 'eye'), 'aimed bolts and the laser from the eye');
  assert.ok(from('fan', 'quill') && from('spiral', 'quill'), 'fans and spirals from the quills');
  assert.ok(from('ring', 'clasp'), 'rings from the clasp');
  assert.ok(from('homing', 'page'), 'homing sparks from the pages');
  assert.ok(grimoire.phases.at(-1).attacks.some((a) => a.pattern === 'laser'), 'the laser in the last phase');
  assert.ok(grimoire.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver')), 'paper cranes in phases 2 and 3');
  for (const id of ['eye', 'quillL', 'quillR', 'clasp']) assert.ok(grimoire.parts.find((p) => p.id === id).weak, id);
  for (const id of ['crown', 'pageL', 'pageR']) assert.ok(grimoire.parts.find((p) => p.id === id).armor, id);
});

// The Thunder Galleon never charges, keeps its bridge clear of the HUD at the top of its orbit, ends
// no lower than the grimoire, and works its attacks from the parts the picture gives it: aimed bolts
// and the laser from the bridge, fans from the gun decks, rain from the mast, rings from the keel.
test('the Thunder Galleon sways, hovers and circles, fires from its decks, and sits no lower than the grimoire', () => {
  const galleon = bossDef('galleon');
  assert.deepEqual(galleon.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.equal(galleon.y, 260, 'it rests about where the grimoire does');
  const bridge = galleon.parts.find((p) => p.id === 'bridge');
  assert.ok(galleon.y + bridge.dy - bridge.h / 2 - 55 >= HUD_BOTTOM, 'the bridge clears the HUD at the top of the orbit');
  assert.ok(galleon.bottom <= bossDef('grimoire').bottom, 'no lower than the grimoire');
  const from = (pattern, part) => galleon.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(part));
  assert.ok(from('aimed', 'bridge') && from('laser', 'bridge'), 'aimed bolts and the laser from the bridge');
  assert.ok(from('fan', 'gun'), 'fans from the gun decks');
  assert.ok(from('rain', 'mast'), 'rain from the mast');
  assert.ok(from('ring', 'keel'), 'rings from the keel');
  assert.ok(!galleon.phases.slice(0, 2).some((p) => p.attacks.some((a) => a.pattern === 'laser')), 'the laser only in the last phase');
  assert.ok(galleon.phases.at(-1).attacks.some((a) => a.pattern === 'laser'), 'the laser in the last phase');
  assert.ok(galleon.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('prop'))), 'divers from the props in phases 2 and 3');
  assert.ok(!galleon.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  for (const id of ['bridge', 'gunL', 'gunR', 'keel']) assert.ok(galleon.parts.find((p) => p.id === id).weak, id);
  for (const id of ['mast', 'propL', 'propR']) assert.ok(galleon.parts.find((p) => p.id === id).armor, id);
  assert.deepEqual(galleon.parts.map((p) => p.id), ['mast', 'bridge', 'propL', 'propR', 'gunL', 'gunR', 'keel']);
});

// The Grand Carousel never charges, keeps its organ clear of the HUD at the top of its orbit, ends no
// lower than the galleon, and works its attacks from the parts the picture gives it: aimed bolts and
// the laser from the organ, fans from the lanterns, confetti rain from the crown, rings from the drum.
test('the Grand Carousel sways, hovers and circles, fires from its organ and lamps, and sits no lower than the galleon', () => {
  const carousel = bossDef('carousel');
  assert.equal(carousel.name, 'The Grand Carousel');
  assert.deepEqual(carousel.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  assert.equal(carousel.y, 260);
  assert.deepEqual([carousel.size.w, carousel.size.h], [700, 340]);
  const organ = carousel.parts.find((p) => p.id === 'organ');
  assert.ok(carousel.y + organ.dy - organ.h / 2 - 55 >= HUD_BOTTOM, 'the organ clears the HUD at the top of the orbit');
  assert.ok(carousel.bottom <= bossDef('galleon').bottom, 'no lower than the galleon');
  assert.ok(Math.abs(carousel.maxHp - bossDef('galleon').maxHp) <= 10, `${carousel.maxHp} hp, about the galleon's`);
  const from = (pattern, part) => carousel.phases.flatMap((p) => p.attacks).some((a) => a.pattern === pattern && a.from.startsWith(part));
  assert.ok(from('aimed', 'organ') && from('laser', 'organ'), 'aimed bolts and the laser from the organ');
  assert.ok(from('fan', 'lamp'), 'fans from the lamps');
  assert.ok(from('rain', 'crown'), 'confetti from the crown');
  assert.ok(from('ring', 'drum'), 'rings from the drum');
  assert.ok(!carousel.phases.slice(0, 2).some((p) => p.attacks.some((a) => a.pattern === 'laser')), 'the laser only in the last phase');
  assert.ok(carousel.phases.at(-1).attacks.some((a) => a.pattern === 'laser'), 'the laser in the last phase');
  assert.ok(carousel.phases.slice(1).every((p) => p.minions.some((m) => m.role === 'diver' && m.from.startsWith('horse'))), 'divers from the horses in phases 2 and 3');
  assert.ok(!carousel.phases[0].minions.some((m) => m.role === 'diver'), 'none in the first');
  for (const id of ['organ', 'lampL', 'lampR', 'drum']) assert.ok(carousel.parts.find((p) => p.id === id).weak, id);
  for (const id of ['crown', 'horseL', 'horseR']) assert.ok(carousel.parts.find((p) => p.id === id).armor, id);
  assert.deepEqual(carousel.parts.map((p) => p.id), ['crown', 'organ', 'horseL', 'horseR', 'lampL', 'lampR', 'drum']);
});
