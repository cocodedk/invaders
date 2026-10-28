import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf, has, openLobby } from './lobby-kit.js';

// Level Select is one uniform grid: every world has the same full card (its poster over its five reels), in world
// order, PER_ROW to a row, a free-flight world only adding a flag. Each card shows its difficulty score (ratings.js) in a strip
// under the poster, so no type lies over the boss.
// Row lengths and the card's parts are read from the built DOM, never from numbers of worlds.
installDom();
const { lobbyScreen } = await import('../../src/ui/screens/lobby.js');
const { SEGMENTS, LONG, isLong } = await import('../../src/ui/screens/lobby-card.js');
const { PER_ROW } = await import('../../src/ui/screens/lobby-nav.js');
const { WORLDS, LEVELS, reelName } = await import('../../src/core/levels.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { RATINGS } = await import('../../src/core/ratings.js');
const { TAGLINES } = await import('../../src/ui/screens/posters.js');

const lobby = (best) => openLobby(lobbyScreen, undefined, best);
const part = (card, cls) => all(card).filter((e) => has(e, cls)); // a card's elements of a class

test('every world has a full card, in order from world 1 to the last', () => {
  const { cards } = lobby();
  assert.equal(cards.length, WORLDS.length);
  assert.deepEqual(cards.map((c) => c.dataset.world), WORLDS.map((w) => String(w.id)), 'the same order as the worlds');
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    assert.equal(part(card, 'poster-art').length, 1, `world ${w.id} has its poster`);
    assert.equal(textOf(part(card, 'poster-world')[0]), `World ${w.id}`);
    assert.equal(textOf(part(card, 'poster-name')[0]), w.name);
    assert.equal(textOf(part(card, 'poster-tag')[0]), TAGLINES[w.id - 1]);
    assert.equal(textOf(part(card, 'poster-bill')[0]), `Featuring ${bossDef(w.boss).name}`);
    const reels = part(card, 'reel');
    assert.deepEqual(reels.map((r) => r.dataset.id), LEVELS.filter((l) => l.world === w.id).map((l) => l.id));
    assert.equal(reels.length, 5, `world ${w.id} has five reels`);
    assert.deepEqual(reels.map((r) => has(r, 'finale')), [false, false, false, false, true], 'the boss level is the finale');
    assert.deepEqual(reels.map((r) => r.attrs['aria-label']), LEVELS.filter((l) => l.world === w.id).map((l) => `${w.name}, ${reelName(l).toLowerCase()}`));
  }
});

test('the cards stand PER_ROW to a row, ceil(worlds / PER_ROW) rows, the last one partly filled', () => {
  const { rows, cards, screen } = lobby();
  assert.equal(rows.length, Math.ceil(WORLDS.length / PER_ROW));
  rows.slice(0, -1).forEach((row, r) => assert.equal(row.children.length, PER_ROW, `row ${r + 1}`));
  assert.equal(rows.at(-1).children.length, WORLDS.length - PER_ROW * (rows.length - 1));
  assert.deepEqual(rows.flatMap((r) => r.children), cards, 'the rows hold the cards in order');
  assert.deepEqual(rows.map((r) => r.children[0].dataset.world), rows.map((_, i) => String(PER_ROW * i + 1)), 'every PER_ROW-th world starts a row');
  assert.deepEqual(rows.map((r) => r.parent), rows.map(() => rows[0].parent), 'one page holds every row');
  assert.ok(!all(screen.el).some((e) => ['side', 'side-label', 'free'].some((c) => has(e, c))), 'no side shelf, no foot card');
  assert.ok(!textOf(screen.el).includes('Also showing'), 'no "Also showing" banner');
});

test('world 18 is a full card in its row, with the free-flight flag, and the only flagged one', () => {
  const { rows, named } = lobby();
  assert.equal(WORLDS[17].free, true);
  const card = rows[Math.floor(17 / PER_ROW)].children[17 % PER_ROW];
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

test("each poster shows its world's difficulty score out of SEGMENTS, with one decimal, a caption and a bar of SEGMENTS segments", () => {
  const { cards } = lobby();
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    const score = RATINGS[w.id - 1];
    assert.equal(textOf(part(card, 'rating-n')[0]), score.toFixed(1), `world ${w.id}`);
    assert.match(textOf(part(card, 'rating-n')[0]), /^\d+\.\d$/);
    assert.equal(textOf(part(card, 'rating-cap')[0]), 'Difficulty', 'labelled');
    const [line] = part(card, 'rating');
    assert.equal(line.attrs['aria-label'], `Difficulty ${score.toFixed(1)} out of ${SEGMENTS}`);
    const segs = all(part(card, 'rating-bar')[0]).filter((e) => e.tag === 'i');
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

test('a name with a word of more than LONG letters is set smaller (.long), or the word is cut off at the poster edge', () => {
  const { cards } = lobby();
  for (const [i, card] of cards.entries()) {
    const w = WORLDS[i];
    const name = all(card).find((e) => has(e, 'poster-name'));
    assert.equal(has(name, 'long'), isLong(w.name), `${w.name}: ${isLong(w.name) ? 'a long word' : 'short words'}`);
  }
  const word = (n) => 'x'.repeat(n);
  assert.ok(isLong(`Glass ${word(LONG + 1)}`) && !isLong(`${word(LONG)} ${word(LONG)}`) && !isLong('Ash to Air'), 'one word over LONG is enough, LONG itself is not');
  assert.ok(WORLDS.some((w) => isLong(w.name)), 'world 16 is one');
});

test("a shelf says how many cards it holds (--filled), so the rail ends at the last one", () => {
  const { rows } = lobby();
  assert.deepEqual(rows.map((r) => r.style.props['--filled']), rows.map((r) => String(r.children.length)));
});

test('the reels carry the stars, the best score and the medal mark, and nothing stray shows', () => {
  const { reels, screen } = lobby();
  const none = reels['w18-1'];
  assert.equal(textOf(none), '1★★★—', 'unplayed: the number, three stars, a dash');
  assert.ok(!has(none, 'played') && !all(none).some((e) => has(e, 'on') || has(e, 'medal')));
  const played = lobby({ 'w18-1': { score: 1004324, stars: 3, medal: true }, 'w18-5': { score: 7300, stars: 2, medal: false } }).reels;
  const [first, last] = [played['w18-1'], played['w18-5']];
  assert.ok(textOf(first).endsWith('1,004,324'), 'a seven-digit score is shown whole');
  assert.equal(all(first).filter((e) => has(e, 'on')).length, 3);
  assert.ok(all(first).some((e) => has(e, 'medal')) && has(first, 'played'));
  assert.ok(textOf(last).endsWith('7,300') && !all(last).some((e) => has(e, 'medal')));
  assert.equal(all(last).filter((e) => has(e, 'on')).length, 2);
  for (const stray of ['false', 'undefined', 'null', 'NaN']) assert.ok(!textOf(screen.el).includes(stray), stray);
});

test('the header and the rows scroll together in one page, and the bar stands outside it', () => {
  const { screen, named, rows, page } = lobby();
  const [bar] = named('lobby-bar');
  assert.deepEqual(screen.el.children, [page, bar], 'the page, then the bar fixed over its foot');
  for (const part of [named('marquee')[0], named('sub')[0], ...rows]) assert.equal(part.parent, page);
  assert.deepEqual(bar.children.slice(0, 2).map(textOf), ['Back', 'Reset scores']);
  assert.ok(textOf(bar).includes('Enter play') && textOf(bar).includes('Esc back'), 'with the key hint');
  assert.ok(!all(page).some((e) => e.tag === 'button' && /^(Back|Reset scores)$/.test(textOf(e))), 'no buttons for the bar inside the page');
});
