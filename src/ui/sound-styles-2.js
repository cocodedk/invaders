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
  // 4/4 at 84 bpm, two bars of eighth-note steps to a pass: a press turning over at midnight, in D on the phrygian dominant. A slow
  // mechanical pulse: a kick on every beat but the bar's second and fourth, where the bass plucks the chord's root and a press's
  // clank (the snare-ish noise) falls, and a gear's tick on every off-beat. Over it struck type metal (an FM tone on the
  // square root of two, an inharmonic clang) climbs the flat second and the major third slowly, with rests.
  press: {
    mood: 'press', wave: 'triangle', cut: 3800, wet: 0.3, pitch: 0.92,
    music: { vol: 0.9, drone: { wave: 'triangle', oct: 2, cut: 420, fifth: true, gain: 0.012 },
      lead: { wave: 'sine', oct: 4, cut: 3600, len: 3, gain: 0.08, fm: { ratio: 1.41, index: 1.6 } },
      div: 2, seq: [0, null, null, 1, null, null, 2, null, 4, null, null, 2, 1, null, 0, null],
      drum: 'khzhkhsh' + 'khzhkhsh' },
  },
  // 4/4 at 96 bpm, four bars of sixteenth-note steps to a pass: the last battle at dusk before a city of gold, in E on the double
  // harmonic major. A buzzing drone on the root and fifth holds under a sitar (music-isle.js) that climbs the chord, falls home by
  // the flat second, rises to the octave and settles, with rests, pulling up into a note a short climb over the last. Under it a tabla
  // on the root plays teentaal, a beat a stroke of its sixteen and the strokes between filled in: dha dhin dhin dha twice, the open
  // third bar on the treble drum alone after its first dha, a tirakita run into the last dha (the owner asked for tabla and sitar, then for more tabla
  // and louder, 2026-11-19, so this loop sits about 2 dB over the others).
  isle: {
    mood: 'isle', wave: 'triangle', cut: 4400, wet: 0.28, pitch: 0.94,
    music: { vol: 0.888, drone: { wave: 'sawtooth', oct: 2, cut: 600, fifth: true, gain: 0.012 },
      lead: { voice: 'sitar', oct: 4, len: 8, gain: 0.19 },
      div: 4, seq: tune(64, [[0, 0], [3, 1], [6, 2], [8, 4], [10, 5], [12, 4], [16, 2], [19, 1], [22, 0],
        [32, 4], [35, 5], [38, 7], [40, 6], [42, 7], [44, 5], [48, 4], [51, 2], [54, 1], [56, 0]]),
      drum: 'D.GNJ..NJ.G.D.NG' + 'D.GNJ..NJ.G.D.E.' + 'D.NNI.N.I.NNN.N.' + 'N.NNJ.GNR...D.G.' },
  },
};
