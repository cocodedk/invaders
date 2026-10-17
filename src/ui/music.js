// A light synthesized loop per world: a drone on the root (two detuned oscillators breathing through
// a slow filter) and a lead stepping through the world's scale over a short drum line, all from the
// look's music entry (sound-data.js STYLES[style].music). Every 2 passes of the sequence the lead
// moves to the next chord of a four-step progression, so the loop does not drone on one phrase.
//   setMusic(look)   the world to play (cross-fades from the last); null for silence
//   updateMusic()    once per frame: schedules the next 0.3 s of notes ahead of the clock
//   startLoop(nodes, look) / fillLoop(loop, until)   the same loop on any context (offline checks)
import { audioNodes } from './audio.js';
import { tone, hiss, wobble } from './audio-kit.js';
import { STYLES, kitFor, degreeMidi, midiHz } from './sound-data.js';

const AHEAD = 0.3; // s scheduled ahead of the audio clock
const FADE = 1.2; // s cross-fade between worlds
const PROGRESSION = [0, 0, 5, 3]; // scale-degree shift of the lead, per two passes

let want = null;
let cur = null;

export function setMusic(look) {
  want = look ?? null;
}

const DRUM = {
  k: (a, t) => tone(a, { t, f0: 150, f1: 44, dur: 0.18, peak: 0.26 }),
  t: (a, t) => {
    tone(a, { t, f0: 115, f1: 48, dur: 0.42, peak: 0.3 });
    hiss(a, { t, type: 'lowpass', f0: 500, dur: 0.08, peak: 0.08 });
  },
  h: (a, t) => hiss(a, { t, type: 'highpass', f0: 8000, dur: 0.03, peak: 0.03 }),
  s: (a, t) => {
    hiss(a, { t, type: 'bandpass', f0: 1700, q: 0.8, dur: 0.12, peak: 0.08 });
    tone(a, { t, f0: 210, f1: 150, dur: 0.05, peak: 0.05 });
  },
};

export function startLoop(nodes, look) {
  const { ctx } = nodes;
  const kit = kitFor(look.music);
  const m = STYLES[kit.style].music;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(m.vol ?? 1, ctx.currentTime + FADE);
  bus.connect(nodes.music);
  let input = bus;
  if (kit.wet > 0.3) { // a tape echo for the wide, wet worlds
    const echo = ctx.createDelay(1);
    const fb = ctx.createGain();
    echo.delayTime.value = (60 / kit.bpm) * 0.75;
    fb.gain.value = 0.32;
    input = ctx.createGain();
    input.connect(bus);
    input.connect(echo).connect(fb).connect(echo);
    fb.connect(bus);
  }
  const a = { ctx, t: ctx.currentTime, out: input, noise: nodes.noise, kit };
  const drone = droneVoice(a, m.drone);
  return { look, kit, m, a, bus, drone, next: ctx.currentTime + 0.1, step: 0 };
}

function droneVoice(a, d) {
  const { ctx, kit } = a;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = d.cut;
  f.connect(g).connect(a.out);
  const root = midiHz(degreeMidi(kit, 0, d.oct));
  const hz = d.fifth ? [root, root * 1.5, root * 1.003] : [root, root * 1.004];
  const oscs = hz.map((h, i) => {
    const o = ctx.createOscillator();
    o.type = d.wave;
    o.frequency.value = h;
    o.detune.value = i * 4;
    o.connect(f);
    o.start();
    return o;
  });
  oscs.push(wobble(a, f.frequency, 0.09, d.cut * 0.45, ctx.currentTime, 1e6));
  return oscs;
}

function stop(c) {
  const { ctx } = c.a;
  c.bus.gain.cancelScheduledValues(ctx.currentTime);
  c.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, FADE / 4);
  for (const o of c.drone) {
    try {
      o.stop(ctx.currentTime + FADE + 0.2);
    } catch {
      // already stopped
    }
  }
  setTimeout(() => c.bus.disconnect(), (FADE + 1) * 1000);
}

function stepAt(c, t) {
  const { m, kit, a } = c;
  const len = 60 / kit.bpm / m.div;
  const deg = m.seq[c.step % m.seq.length];
  const shift = PROGRESSION[Math.floor(c.step / (m.seq.length * 2)) % PROGRESSION.length];
  if (deg != null) {
    const L = m.lead;
    const pad = L.len > 1;
    tone(a, {
      type: L.wave, t, f0: midiHz(degreeMidi(kit, deg + shift, L.oct)), attack: pad ? len * 0.25 : 0.006,
      dur: len * L.len, peak: L.gain, cut: L.cut, q: 1.5,
    });
  }
  const hit = m.drum[c.step % m.drum.length];
  DRUM[hit]?.(a, t);
  c.step += 1;
  return len;
}

export function updateMusic() {
  const nodes = audioNodes();
  if (!nodes) return;
  if ((cur?.look ?? null) !== want) {
    if (cur) stop(cur);
    cur = want ? startLoop(nodes, want) : null;
  }
  if (!cur) return;
  const horizon = nodes.ctx.currentTime + AHEAD;
  if (cur.next < nodes.ctx.currentTime) cur.next = nodes.ctx.currentTime + 0.02; // after a stall, never a burst
  fillLoop(cur, horizon);
}

// Schedule the loop's notes up to `until` (audio clock seconds).
export function fillLoop(c, until) {
  while (c.next < until) c.next += stepAt(c, c.next);
}
