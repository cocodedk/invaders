import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { myFiles } from './smogenv2-kit.js';

// The rules the review history set for the backdrop's drawing code, checked over World 17's mid and near layers, ambient and
// ground flourishes (every file named parallax-smog-{kit,pal,mid*,near*}, ambient-9*, flourish-smog-ground*): no shadow blur, no dice
// or clock, no text, each file under 200 lines and opening with a comment block that says what it is, sprite cache keys that
// carry this worker's prefixes so they cannot collide with another world's, and no network address.
const { dir, names } = myFiles();
const text = (n) => readFileSync(new URL(n, dir), 'utf8');
const code = (n) => text(n).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/^import .*$/gm, ''); // comments may say window or document, and a module may be named so

test('there are files to check, and they are the ones this worker owns', () => {
  assert.ok(names.length >= 20, `${names.length} files`);
  for (const must of ['parallax-smog-mid.js', 'parallax-smog-near.js', 'ambient-9.js', 'ambient-9-sprites.js', 'flourish-smog-ground.js', 'flourish-smog-ground-sprites.js', 'parallax-smog-pal.js', 'parallax-smog-kit.js']) assert.ok(names.includes(must), must);
});

test('no file uses shadow blur, Math.random, Date.now, text drawing or a network address', () => {
  for (const n of names) {
    const c = code(n);
    for (const re of [/shadowBlur/, /Math\s*\.\s*random/, /Date\s*\.\s*now/, /fillText|strokeText|measureText/, /\bwindow\s*[.[]/, /\bdocument\s*[.[]/]) assert.ok(!re.test(c), `${n}: ${re}`);
  }
});

test('every file is under 200 lines and opens with a comment block', () => {
  for (const n of names) {
    const t = text(n);
    assert.ok(t.split('\n').length < 200, `${n} has ${t.split('\n').length} lines`);
    assert.ok(t.startsWith('//'), `${n} opens with a comment`);
    assert.ok(t.split('\n').slice(0, 12).filter((l) => l.startsWith('//')).length >= 3, `${n}: the header says what it is`);
  }
});

test('sprite cache keys carry a prefix of this worker: smogmid, smogamb, smogkite or smogbank', () => {
  let keys = 0;
  for (const n of names) {
    for (const m of code(n).matchAll(/cached\(\s*([`'])([^`']*)/g)) {
      keys++;
      assert.match(m[2], /^smog(mid|amb|kite|bank)/, `${n}: ${m[2]}`);
    }
  }
  assert.ok(keys >= 8, `${keys} keys`);
});
