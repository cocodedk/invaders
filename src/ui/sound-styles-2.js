// The sound styles after Anvil Sky's, spread into STYLES by sound-data.js (whose header explains every field), and `tune`,
// which both files write a sparse tune with. Nothing here is imported from sound-data.js: it imports this file.
// A tune from its notes: [step, degree] pairs over `steps` steps, every other step a rest.
export const tune = (steps, notes) => Array.from({ length: steps }, (_, i) => notes.find(([at]) => at === i)?.[1] ?? null);

export const STYLES_2 = {
  // 4/4 at 118 bpm, four bars of sixteenth-note steps to a pass: bath time on a sunny morning, in a six-note major with no
  // leading tone. A marimba (an FM tone on its tuned overtone, two octaves up, struck and dying fast) bounces up the chord
  // and back in bars one and three, with rests; a kalimba answers in the gaps of bars two and four; both ring through the
  // echo. Under them a lazy two-beat bounce played dry, past the echo (music-bath.js): a soft round kick with the bass
  // plucked under it on one and three, a woodblock on every off-beat, a light clap on four and nothing on beat two.
  bath: {
    mood: 'bath', wave: 'triangle', cut: 5600, wet: 0.36, pitch: 1.1,
    music: { vol: 0.958, drone: { wave: 'triangle', oct: 2, cut: 420, fifth: true, gain: 0.01 },
      lead: { wave: 'sine', oct: 4, cut: 6000, len: 5, gain: 0.17, fm: { ratio: 4, index: 0.9 } },
      div: 4, seq: tune(64, [[0, 0], [3, 2], [6, 4], [8, 5], [10, 4], [12, 2], [16, 4],
        [32, 1], [35, 3], [38, 5], [40, 6], [42, 5], [44, 3], [48, 2], [60, 0]]),
      drum: 'B.W...W.B.W.S.W.' + 'B.W.L.WLBLW.S.W.' + 'B.W...W.B.W.S.W.' + 'B.W.L.WLBLW.S.W.' },
  },
};
