// World 1, Arcade Origin: crisp pixel aliens on a CRT, every cell a lit phosphor dot with an
// afterglow; the eyes and cores burn white. The whole formation steps its legs in time (sync).
// Original bitmaps: X body, h rim highlight, d shadowed plate, o lit eye, c lit core, r ring.
import { pixels, phosphor, shade } from './kit.js';

const PX = 5;

const ROWS = {
  grunt: [[ // a dome bug on four legs
    '....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XkpXXXXpkX.', 'XXkkXXXXkkXX', 'XXXXXXXXXXXX',
    '.X.X.XX.X.X.', 'X.X......X.X',
  ], [
    '....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XkpXXXXpkX.', 'XXkkXXXXkkXX', 'XXXXXXXXXXXX',
    '.X.X.XX.X.X.', '.X.X....X.X.',
  ]],
  diver: [[ // a dart, nose down, wings beating
    'X.........X', 'XX.......XX', 'XXX.hhh.XXX', '.XXXXXXXXX.', '..XXoXoXX..', '...XXXXX...', '....XXX....',
    '....XXX....', '.....X.....',
  ], [
    '...........', '...........', 'XX..hhh..XX', 'XXXXXXXXXXX', '.XXXoXoXXX.', '...XXXXX...', '....XXX....',
    '....XXX....', '.....X.....',
  ]],
  gunner: [[ // a crab with its claws up and a twin gun underneath
    'XX.........XX', 'X.X..hhh..X.X', '..XXXXXXXXX..', '.XXXoXXXoXXX.', 'XXXXXXXXXXXXX', 'X.XXXXXXXXX.X',
    'X.X..XXX..X.X', '.....X.X.....', '.....o.o.....',
  ], [
    '..X.......X..', '.X...hhh...X.', '.XXXXXXXXXXX.', 'XXXXoXXXoXXXX', 'XXXXXXXXXXXXX', '..XXXXXXXXX..',
    '..X..XXX..X..', '.....X.X.....', '.............',
  ]],
  armored: [[ // a plated block with a visor
    '.hhhhhhhhhh.', 'hXXXXXXXXXXh', 'hXddddddddXh', 'hXdoodddoodh', 'hXddddddddXh', 'hXXXXXXXXXXh',
    '.hXXhXXhXXh.', '..XX.XX.XX..', '.XX......XX.',
  ], [
    '.hhhhhhhhhh.', 'hXXXXXXXXXXh', 'hXddddddddXh', 'hdoodddoodXh', 'hXddddddddXh', 'hXXXXXXXXXXh',
    '.hXXhXXhXXh.', '..XX.XX.XX..', '...XX..XX...',
  ]],
  carrier: [[ // a burning core in a tilted ring
    '.....XXX.....', '...XXhhhXX...', '..XXXcccXXX..', 'rrXXccoccXXrr', '.rrXXcccXXrr.', '...rXXXXXr...',
    '.....XXX.....',
  ], [
    '.....XXX.....', '...XXhhhXX...', 'rrXXXcccXXXrr', '.rrXccoccXrr.', '...XXcccXX...', '....XXXXX....',
    '.....XXX.....',
  ]],
};

const SAUCER = [[
  '.....XXXXXX.....', '...XXhhhhhhXX...', '..XXXXXXXXXXXX..', '.XXoXXoXXoXXoXX.', 'XXXXXXXXXXXXXXXX',
  '..XXX..XX..XXX..', '...X........X...',
], [
  '.....XXXXXX.....', '...XXhhhhhhXX...', '..XXXXXXXXXXXX..', '.XXdXXdXXdXXdXX.', 'XXXXXXXXXXXXXXXX',
  '..XXX..XX..XXX..', '...X........X...',
]];

function cells(c) {
  return {
    X: c, h: shade(c, 0.55), d: shade(c, -0.5), r: shade(c, -0.15),
    k: '#1a0a2a', o: ['#ffffff', true], p: ['#ff4f8a', true], c: [shade(c, 0.35), true],
  };
}

const painter = (rows) => (b, l, f, c) => {
  pixels(b, l, rows[f], PX, cells(c));
  phosphor(b, l, 0.45, 4);
};

const saucer = painter(SAUCER);
saucer.size = 128;

export default {
  rate: 1.5, sync: true, halo: 0.3,
  grunt: painter(ROWS.grunt),
  diver: painter(ROWS.diver),
  gunner: painter(ROWS.gunner),
  armored: painter(ROWS.armored),
  carrier: painter(ROWS.carrier),
  saucer,
};
