import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf } from './lobby-kit.js';

// Level Select is one uniform grid: every world has the same full card (its poster over its five reels), in world
// order, eight to a row, a free-flight world only adding a flag. Each card shows its difficulty score (ratings.js) in a strip
// under the poster, so no type lies over the boss.
// Row lengths and the card's parts are read from the built DOM, never from numbers of worlds.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');
const { cardOf, SEGMENTS, LONG, isLong } = await import('../../src/ui/screens/lobby-card.js');
const { WORLDS, LEVELS, reelName } = await import('../../src/core/levels.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { ratingOf } = await import('../../src/core/ratings.js');
const { TAGLINES } = await import('../../src/ui/screens/posters.js');

const has = (e, cls) => e.className.split(' ').includes(cls);

function lobby(best = {}, focusId) {
  const screen = lobbyScreen({ best, start() {}, back() {}, reset() {}, focusId });
  const named = (cls) => all(screen.el).filter((e) => has(e, cls));
  return { screen, named, rows: named('posters'), cards: named('poster') };
}

test('every world has a full card, in order from world 1 to the last', () => {
  const { cards } = lobby();
  assert.equal(cards.length, WORLDS.length);
  assert.deepEqual(cards.map((c) => c.dataset.world), WORLDS.map((w) => String(w.id)), 'the same order as the worlds');
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    const part = (cls) => all(card).filter((e) => has(e, cls));
    assert.equal(part('poster-art').length, 1, `world ${w.id} has its poster`);
    assert.equal(textOf(part('poster-world')[0]), `World ${w.id}`);
    assert.equal(textOf(part('poster-name')[0]), w.name);
    assert.equal(textOf(part('poster-tag')[0]), TAGLINES[w.id - 1]);
    assert.equal(textOf(part('poster-bill')[0]), `Featuring ${bossDef(w.boss).name}`);
    const reels = part('reel');
    assert.deepEqual(reels.map((r) => r.dataset.id), LEVELS.filter((l) => l.world === w.id).map((l) => l.id));
    assert.equal(reels.length, 5, `world ${w.id} has five reels`);
    assert.deepEqual(reels.map((r) => has(r, 'finale')), [false, false, false, false, true], 'the boss level is the finale');
    assert.deepEqual(reels.map((r) => r.attrs['aria-label']), LEVELS.filter((l) => l.world === w.id).map((l) => `${w.name}, ${reelName(l).toLowerCase()}`));
  }
});

test('the cards stand eight to a row, ceil(worlds / 8) rows, the last one partly filled', () => {
  const { rows, cards, screen } = lobby();
  assert.equal(rows.length, Math.ceil(WORLDS.length / 8));
  rows.slice(0, -1).forEach((row, r) => assert.equal(row.children.length, 8, `row ${r + 1}`));
  assert.equal(rows.at(-1).children.length, WORLDS.length - 8 * (rows.length - 1));
  assert.deepEqual(rows.flatMap((r) => r.children), cards, 'the rows hold the cards in order');
  assert.deepEqual(rows.map((r) => r.children[0].dataset.world), rows.map((_, i) => String(8 * i + 1)), 'worlds 1, 9, 17 start the rows');
  assert.deepEqual(rows.map((r) => r.parent), rows.map(() => rows[0].parent), 'one page holds every row');
  assert.ok(!all(screen.el).some((e) => ['side', 'side-label', 'free'].some((c) => has(e, c))), 'no side shelf, no foot card');
  assert.ok(!textOf(screen.el).includes('Also showing'), 'no "Also showing" banner');
});

test('world 18 is a full card in the third row, with the free-flight flag, and the only flagged one', () => {
  const { rows, named } = lobby();
  assert.equal(WORLDS[17].free, true);
  const card = rows[2].children[1];
  assert.equal(card.dataset.world, '18');
  assert.ok(has(card, 'poster'), 'a poster card like the others');
  assert.equal(all(card).filter((e) => has(e, 'reel')).length, 5);
  assert.equal(all(card).filter((e) => has(e, 'poster-bill')).length, 1);
  const flags = named('poster-flag');
  assert.equal(flags.length, WORLDS.filter((w) => w.free).length, 'a flag on every free-flight world');
  assert.equal(textOf(flags[0]), 'Free flight');
  assert.ok(all(card).includes(flags[0]), 'on world 18');
  const art = all(card).find((e) => has(e, 'poster-art'));
  assert.ok(art.children.includes(flags[0]), 'in the poster, in its foot');
  assert.ok(!all(all(card).find((e) => has(e, 'poster-type'))).includes(flags[0]), 'and not in the type block, which it would push up the boss');
  const say = textOf(card);
  for (const part of ['World 18', 'Anvil Sky', 'Make their fire follow you.', 'The Squall Ray']) assert.ok(say.includes(part), part);
});

test("each poster shows its world's difficulty score out of 10, with one decimal, a caption and a ten-segment bar", () => {
  const { cards } = lobby();
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    const score = ratingOf(w.id);
    const part = (cls) => all(card).filter((e) => has(e, cls));
    assert.equal(textOf(part('rating-n')[0]), score.toFixed(1), `world ${w.id}`);
    assert.match(textOf(part('rating-n')[0]), /^\d+\.\d$/);
    assert.equal(textOf(part('rating-cap')[0]), 'Difficulty', 'labelled');
    const [line] = part('rating');
    assert.equal(line.attrs['aria-label'], `Difficulty ${score.toFixed(1)} out of 10`);
    const segs = all(part('rating-bar')[0]).filter((e) => e.tag === 'i');
    assert.equal(segs.length, SEGMENTS);
    const kinds = segs.map((s) => (has(s, 'on') ? 'on' : has(s, 'half') ? 'half' : 'off'));
    const lit = kinds.filter((k) => k === 'on').length + kinds.filter((k) => k === 'half').length / 2;
    assert.ok(Math.abs(lit - score) <= 0.5, `world ${w.id}: ${lit} segments for ${score}`);
    assert.equal(kinds.join(' '), [...kinds].sort((a, b) => ['on', 'half', 'off'].indexOf(a) - ['on', 'half', 'off'].indexOf(b)).join(' '), 'lit segments first');
    assert.ok(kinds.filter((k) => k === 'half').length <= 1);
  }
});

test('the score is a strip between the poster and the reels, and the poster head is the kicker alone', () => {
  const { cards } = lobby();
  for (const card of cards) {
    const [art, strip, reels] = card.children;
    assert.deepEqual([art, strip, reels].map((e) => e.className.split(' ')[0]), ['poster-art', 'rating', 'reels'], `world ${card.dataset.world}`);
    assert.deepEqual(strip.children.map((e) => e.className), ['rating-cap', 'rating-bar', 'rating-n'], 'caption, bar, number on one line');
    assert.ok(!all(art).some((e) => ['rating', 'rating-n', 'rating-bar', 'rating-cap'].some((c) => has(e, c))), 'none of it over the poster');
    const head = all(art).find((e) => has(e, 'poster-head'));
    assert.deepEqual(head.children.map((e) => e.className), ['poster-world'], 'the kicker alone');
  }
});

test('a name with a word of more than 8 letters is set smaller (.long), or the word is cut off at the poster edge', () => {
  const { cards } = lobby();
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    const name = all(card).find((e) => has(e, 'poster-name'));
    const wide = w.name.split(' ').some((word) => word.length > LONG);
    assert.equal(has(name, 'long'), wide, `${w.name}: ${wide ? 'a long word' : 'short words'}`);
    assert.equal(has(name, 'long'), isLong(w.name));
  }
  assert.equal(LONG, 8);
  assert.ok(isLong('Glass Cathedral') && !isLong('Ember Carnival') && !isLong('Ash to Air'), 'Cathedral has 9, Carnival 8');
  assert.ok(WORLDS.some((w) => isLong(w.name)), 'world 16 is one');
});

test("a shelf says how many cards it holds (--filled), so the rail ends at the last one", () => {
  const { rows } = lobby();
  assert.deepEqual(rows.map((r) => r.style.props['--filled']), rows.map((r) => String(r.children.length)));
});

test('a world without a rating yet still gets a full card, only without the score', () => {
  const world = { ...WORLDS[0], id: 99 };
  assert.equal(ratingOf(99), null);
  const card = cardOf(world, {}, () => {});
  assert.ok(!all(card.el).some((e) => has(e, 'rating-n') || has(e, 'rating')));
  assert.equal(all(card.el).filter((e) => has(e, 'reel')).length, 0, 'no levels of world 99, so no reels, and no throw');
  assert.equal(textOf(all(card.el).find((e) => has(e, 'poster-world'))), 'World 99');
});

test('the reels carry the stars, the best score and the medal mark, and nothing stray shows', () => {
  const { named, screen } = lobby();
  const none = named('reel').find((r) => r.dataset.id === 'w18-1');
  assert.equal(textOf(none), '1★★★—', 'unplayed: the number, three stars, a dash');
  assert.ok(!has(none, 'played') && !all(none).some((e) => has(e, 'on') || has(e, 'medal')));
  const played = lobby({ 'w18-1': { score: 1004324, stars: 3, medal: true }, 'w18-5': { score: 7300, stars: 2, medal: false } }).named('reel');
  const [first] = played.filter((r) => r.dataset.id === 'w18-1');
  const [last] = played.filter((r) => r.dataset.id === 'w18-5');
  assert.ok(textOf(first).endsWith('1,004,324'), 'a seven-digit score is shown whole');
  assert.equal(all(first).filter((e) => has(e, 'on')).length, 3);
  assert.ok(all(first).some((e) => has(e, 'medal')) && has(first, 'played'));
  assert.ok(textOf(last).endsWith('7,300') && !all(last).some((e) => has(e, 'medal')));
  assert.equal(all(last).filter((e) => has(e, 'on')).length, 2);
  for (const stray of ['false', 'undefined', 'null', 'NaN']) assert.ok(!textOf(screen.el).includes(stray), stray);
});

test('the header and the rows scroll together in one page, and the bar stands outside it', () => {
  const { screen, named, rows } = lobby();
  const [page] = named('lobby-scroll');
  const [bar] = named('lobby-bar');
  assert.deepEqual(screen.el.children, [page, bar], 'the page, then the bar fixed over its foot');
  for (const part of [named('marquee')[0], named('sub')[0], ...rows]) assert.equal(part.parent, page);
  assert.deepEqual(bar.children.slice(0, 2).map(textOf), ['Back', 'Reset scores']);
  assert.ok(textOf(bar).includes('Enter play') && textOf(bar).includes('Esc back'), 'with the key hint');
  assert.ok(!all(page).some((e) => e.tag === 'button' && /^(Back|Reset scores)$/.test(textOf(e))), 'no buttons for the bar inside the page');
});
