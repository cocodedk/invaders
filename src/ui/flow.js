// The end of a level: the best is saved the moment the level is cleared, and once the slow motion
// has played out the outcome goes to `flow.cleared` or `flow.failed`, which show the results or
// failed card. trailer/routes.js replaces those two to run the trailer or the blooper first; each ends by
// calling flow.showResults(outcome) / flow.showFailed(outcome).
//   outcome = { level, mode ('play' | 'try'), cleared, score, stars, best, prev, newBest,
//               recording: { level, seed, inputs, events, ticks, score, stars, state, tainted },
//               run: makeRun(...) | null (null for the demo or a debug-tainted run), session,
//               view (the level's baked view: replay clips can draw on it without a bake) }
import { LEVELS, WORLDS } from '../core/levels.js';
import { store } from './storage.js';
import { play, setBeam } from './audio.js';
import { finished, recording, runOf } from './session.js';
import { resultsScreen } from './screens/results.js';
import { failedScreen } from './screens/failed.js';

const CLEAR_WAIT = 2.4; // s after the clear: the slow motion and the bonus pop-up
const FAIL_WAIT = 1.6; // s after the last life

function progress(world) {
  const b = world.boss;
  if (b) return `${WORLDS[world.level.world - 1].name}'s boss held at ${Math.ceil((100 * b.hp) / b.maxHp)} %`;
  return `Wave ${world.wave} of ${world.level.waves.length}`;
}

export function createFlow(r, stage) {
  const { app } = r;
  const flow = {
    onEvent(scene, e) {
      if (e.type === 'cleared' && scene.mode === 'play') scene.result = store.recordResult(scene.level.id, e);
    },

    // Once a frame while a level is up: has it ended, and has its moment played out?
    check(scene) {
      const s = scene.session;
      if (scene.ended || !finished(s.world) || (scene.mode !== 'play' && scene.mode !== 'try')) return;
      const cleared = s.world.state === 'cleared';
      if (s.over < (cleared ? CLEAR_WAIT : FAIL_WAIT)) return;
      scene.ended = true;
      setBeam(false);
      const res = scene.result ?? { best: { score: s.world.score, stars: 0 }, prev: null, newBest: false };
      const rec = recording(s);
      const o = {
        level: scene.level, mode: scene.mode, cleared, score: s.world.score, stars: rec.stars,
        best: res.best, prev: res.prev, newBest: res.newBest, recording: rec, run: runOf(s), session: s, view: scene.view,
      };
      app.screen = cleared ? 'results' : 'failed';
      flow[cleared ? 'cleared' : 'failed'](o);
    },

    cleared: (o) => flow.showResults(o),
    failed: (o) => flow.showFailed(o),

    showResults(o) {
      app.screen = 'results';
      play('cleared');
      const demo = o.mode === 'try';
      const i = LEVELS.indexOf(o.level);
      const next = demo ? r.goLobby : LEVELS[i + 1] && (() => r.startLevel(LEVELS[i + 1]));
      stage.show(resultsScreen({
        label: r.labelOf(o.level), title: demo ? 'You’re ready!' : o.level.boss ? 'Victory' : 'Cleared',
        score: o.score, stars: o.stars, best: o.best, newBest: o.newBest && !demo,
      }, {
        next, nextLabel: demo ? 'Pick a level' : 'Next',
        retry: demo ? r.startTry : () => r.startLevel(o.level), retryLabel: demo ? 'Again' : 'Retry',
        select: demo ? r.goTitle : r.goLobby, selectLabel: demo ? 'Title' : 'Select',
      }));
    },

    showFailed(o) {
      app.screen = 'failed';
      play('failed');
      const demo = o.mode === 'try';
      stage.show(failedScreen({ label: r.labelOf(o.level), score: o.score, progress: progress(o.session.world) }, {
        retry: demo ? r.startTry : () => r.startLevel(o.level),
        select: r.goLobby,
      }));
    },
  };
  r.flow = flow;
  return flow;
}
