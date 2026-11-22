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
  // 4/4 at 126 bpm, four bars of sixteenth-note steps to a pass: a newsroom racing its deadline, in D on the lydian dominant (the owner
  // found the old slow pulse gloomy and sad and asked for more beats, a typewriter and action, 2026-11-20). A punchy stab (an FM tone
  // on a whole ratio, bright and gone at once) jumps up the chord and back with rests; under it the press's beat played dry
  // (music-press.js): a stamp of a kick with the bass on one and three and the a of three, the press's slam on two and four, a
  // typist's keys in bursts between, and at the end of each pass the margin bell and the carriage zipping back.
  press: {
    mood: 'press', wave: 'triangle', cut: 3800, wet: 0.3, pitch: 0.92,
    music: { vol: 0.98, drone: { wave: 'triangle', oct: 2, cut: 420, fifth: true, gain: 0.006 },
      lead: { wave: 'sine', oct: 4, cut: 5200, len: 2.5, gain: 0.19, fm: { ratio: 1, index: 3 } },
      div: 4, seq: tune(64, [[0, 0], [2, 2], [3, 4], [6, 7], [8, 6], [10, 4], [16, 5], [19, 4], [22, 2], [24, 3], [26, 4],
        [32, 0], [34, 2], [35, 4], [38, 7], [40, 8], [42, 7], [48, 6], [51, 4], [54, 2], [56, 0]]),
      drum: 'X.QUZ.QQX.QXZQ.Q' + 'X.QUZQ.QX.UQZQQ.' + 'X.QUZ.QQX.QXZQ.Q' + 'X.QUZ.QQX.QXZF..' },
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
  // 4/4 at 104 bpm, four bars of eighth-note steps to a pass: a placeholder for Wanderlight (world 22) until the world has its own music,
  // shaped like the calm styles before it: a soft sine drone, a triangle lead walking up the major chord and back with rests, and a frame
  // drum on every beat (the drum letter f is in music-drums.js). Nothing here has been matched to the other loops' level.
  road: {
    mood: 'road', wave: 'triangle', cut: 4800, wet: 0.34, pitch: 1.04,
    music: { vol: 0.9, drone: { wave: 'sine', oct: 2, cut: 420, fifth: true, gain: 0.01 },
      lead: { wave: 'triangle', oct: 4, cut: 4200, len: 3, gain: 0.15 },
      div: 2, seq: tune(32, [[0, 0], [3, 2], [6, 4], [8, 5], [10, 4], [12, 2], [16, 4], [19, 2], [22, 1], [24, 0], [28, 2]]),
      drum: 'f.f.f.f.' },
  },
};
