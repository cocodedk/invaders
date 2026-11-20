// Every world's scale, by the name its look's music entry gives (looks/w1..w21.js): semitone steps above the root.
// Re-exported by sound-data.js, which every caller imports it from.
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  in: [0, 1, 5, 7, 8], // the Japanese in scale
  harmonic: [0, 2, 3, 5, 7, 8, 11], // harmonic minor: the minor with its leading tone
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], // the major with a flat seventh: a fairground's tunes
  pentatonic: [0, 3, 5, 7, 10], // the minor pentatonic: five notes with no semitone, so nothing played on it clashes
  melodic: [0, 2, 3, 5, 7, 9, 11], // the melodic minor going up: a minor key with the sixth and seventh raised, a dawn over ruins
  bright: [0, 2, 4, 7, 9], // the major pentatonic: five open notes with no semitone, a storm's heroic tunes
  sunny: [0, 2, 4, 5, 7, 9], // the major with no leading tone: six notes and nothing that pulls, a bath-time tune
  night: [0, 2, 4, 6, 7, 9, 10], // the lydian dominant: a major key with a raised fourth and a flat seventh, a press hall racing a deadline
  doubleharmonic: [0, 1, 4, 5, 7, 8, 11], // the double harmonic major: two augmented seconds, a golden city at dusk
};
