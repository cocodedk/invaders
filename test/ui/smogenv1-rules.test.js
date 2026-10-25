import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { myFiles } from './smogenv1-kit.js';

// The rules every file of world 17's sky, far layer and sky flourishes must keep (the review history of the other worlds): a header comment
// saying what the file draws, under 200 lines, no shadow blur, dice or clock, sprite cache keys with this worker's prefixes (smogsky,
// smogcig), nothing allocated per frame in a flourish (no closures over the frame, no Array.from, no spreads), the registry lines this
// worker owns in place, and the look entries it may set.
const { dir, names } = myFiles();
const src = (n) => readFileSync(new URL(n, dir), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the files are all here and each starts with a comment block and stays under 200 lines', () => {
  assert.ok(names.length >= 18, `${names.length} files`);
  for (const n of names) {
    const text = src(n);
    assert.ok(text.startsWith('//'), `${n} starts with its comment block`);
    assert.ok(text.split('\n').length < 200, `${n} is ${text.split('\n').length} lines`);
  }
});

test('no file uses shadow blur, dice or the clock', () => {
  for (const n of names) assert.ok(!/shadowBlur|Math\.random|Date\.now|performance\.now/.test(code(src(n))), `${n} uses shadow blur, dice or the clock`);
});

test('every sprite is cached under this worker\'s prefix: smogsky for the skies and the sky flourishes, smogcig for the cigarettes', () => {
  for (const n of names) {
    const keys = [...code(src(n)).matchAll(/cached\(\s*[`'"]([A-Za-z]+)/g)].map((m) => m[1]);
    const want = /cig/.test(n) ? /^smogcig/ : /^smogsky/;
    for (const k of keys) assert.match(k, want, `${n}: ${k}`);
  }
});

test('the flourishes allocate nothing in a frame: no closures over the frame, no Array.from, no spreads', () => {
  for (const n of ['flourish-smog-sky.js', 'flourish-smog-sky-cig.js']) {
    const c = code(src(n));
    assert.ok(!/\.(forEach|map|filter|reduce)\(|Array\.from|\[\.\.\.|new (Array|Float32Array|Map)\b/.test(c), `${n} allocates in a frame`);
  }
});

test('the registries carry this worker\'s lines, and the look keeps its sky, layer and flourish entries', async () => {
  assert.match(code(src('parallax-smog.js')), /import \{ smogcity \} from '\.\/parallax-smog-far\.js'/);
  assert.match(code(src('parallax-smog.js')), /SMOG = \{[^}]*\bsmogcity\b/);
  assert.match(code(src('flourish-smog.js')), /\.\.\.FLOURISH_SKY/);
  assert.match(code(src('warm-breath.js')), /warmSkyFx\(\)/);
  assert.match(code(src('sky-bodies.js')), /BODIES9/);
  const { default: look } = await import('../../src/ui/looks/w17.js');
  assert.equal(look.layers[0].kind, 'smogcity');
  assert.deepEqual([look.body, look.cleanBody], ['smogsky', 'cleansky']);
  for (const k of ['smokeroll', 'cigarettes', 'sunbeams', 'skybirds']) assert.ok(look.flourish.includes(k), k);
});
