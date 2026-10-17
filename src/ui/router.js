// Screen routing: title (over the backdrop battle) -> lobby -> title card -> play -> pause ->
// results / failed, and "watch, then try". `app` is the one piece of state the loop reads.
//   app = { screen, scene, backdrop, demo, lastLevel }
//   screen 'title' | 'lobby' | 'loading' | 'play' | 'demo' | 'paused' | 'results' | 'failed'
// The end of a level goes through flow.js (Task 12 puts the trailer and the blooper there).
import { DEMO_LEVEL, WORLDS } from '../core/levels.js';
import { lookFor } from './looks/index.js';
import { store } from './storage.js';
import { play, duck, setBeam, setWorldSound } from './audio.js';
import { setMusic } from './music.js';
import { resetInput } from './input.js';
import { backdropScene, pickBackdrop, playScene } from './scenes.js';
import { titleScreen } from './screens/title.js';
import { lobbyScreen } from './screens/lobby.js';
import { cardScreen } from './screens/card.js';
import { pauseScreen } from './screens/pause.js';
import { reelName } from './screens/posters.js';
import { demoScreen } from './demo/demo-screen.js';
import { DEMO_SEED, createDirector, directInput, noteEvents } from './demo/script.js';

const MIN_CARD = 0.9; // s the title card stays, so it reads as a moment, not a flicker

// The world's sound effects and its music loop.
function sound(level) {
  const look = lookFor(level);
  setWorldSound(look);
  setMusic(look);
}

const labelOf = (level) => (level === DEMO_LEVEL ? 'Watch, then try' : `${WORLDS[level.world - 1].name} · ${reelName(level)}`);

export function createRouter({ canvas, stage, input }) {
  const app = { screen: 'boot', scene: null, backdrop: null, demo: null, lastLevel: 'w1-1', token: 0 };
  const r = { app, labelOf };
  const live = () => app.screen === 'play' || app.screen === 'demo';

  r.goTitle = () => {
    app.token += 1;
    app.screen = 'title';
    app.demo = null;
    setBeam(false);
    duck(1);
    const items = [ // the main menu, in order (Task 12 adds the cinema here)
      { label: 'Play', pick: r.goLobby },
      { label: 'Watch, then try', pick: r.startDemo },
    ];
    const level = app.backdrop?.level ?? pickBackdrop();
    sound(level);
    stage.show(titleScreen({ items, nowShowing: WORLDS[level.world - 1].name }));
    if (app.backdrop) {
      app.scene = app.backdrop;
      return;
    }
    const token = app.token; // the first time, the battle is baked once the menu has painted
    requestAnimationFrame(() => requestAnimationFrame(() => {
      app.backdrop = backdropScene(canvas, level);
      if (token === app.token) app.scene = app.backdrop;
    }));
  };

  r.goLobby = () => {
    app.token += 1;
    app.screen = 'lobby';
    app.demo = null;
    setBeam(false);
    stage.show(lobbyScreen({ best: store.allBest(), start: r.startLevel, back: r.goTitle, focusId: app.lastLevel }));
  };

  // Show the level's card, bake its view behind it, then play. build(level) -> scene.
  function load(level, kicker, build, then) {
    const token = ++app.token;
    app.screen = 'loading';
    setBeam(false);
    duck(1);
    sound(level);
    stage.show(cardScreen(level, kicker));
    play('start');
    const t0 = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== app.token) return;
      const scene = build();
      setTimeout(() => {
        if (token !== app.token) return;
        app.scene = scene;
        resetInput(input);
        then(scene);
      }, Math.max(0, MIN_CARD * 1000 - (performance.now() - t0)));
    }));
  }

  r.startLevel = (level) => {
    app.lastLevel = level.id;
    app.demo = null;
    load(level, null, () => playScene(canvas, level, input, { onEvent: (e) => r.flow.onEvent(app.scene, e) }), () => {
      app.screen = 'play';
      stage.show(null);
    });
  };

  // Watch: the director flies the demo level and captions it.
  r.startDemo = () => {
    store.setDemoSeen(); // shown once on first launch; from then on it waits on the title menu
    load(DEMO_LEVEL, 'Watch, then try', () => {
      const sc = playScene(canvas, DEMO_LEVEL, input, { seed: DEMO_SEED, mode: 'watch' });
      const d = createDirector();
      sc.source = (world) => (sc.last = directInput(d, world));
      const base = sc.onEvents;
      sc.onEvents = (events) => {
        base(events);
        noteEvents(d, events);
      };
      app.demo = { d, view: sc.view, screen: demoScreen({ skip: r.startTry }) };
      return sc;
    }, () => {
      app.screen = 'demo';
      stage.show(app.demo.screen);
    });
  };

  // Try: the same level, fresh, in the player's hands (the view is kept: no bake).
  r.startTry = () => {
    if (!app.demo) return;
    app.token += 1;
    app.scene = playScene(canvas, DEMO_LEVEL, input, { view: app.demo.view, seed: DEMO_SEED, mode: 'try' });
    app.screen = 'demo';
    app.demo.d = null;
    resetInput(input);
    stage.show(app.demo.screen);
    app.demo.screen.yourTurn();
    play('start');
  };

  r.restart = () => (app.scene.mode === 'play' ? r.startLevel(app.scene.level) : app.scene.mode === 'try' ? r.startTry() : r.startDemo());

  r.pause = () => {
    if (!live()) return;
    app.screen = 'paused';
    setBeam(false);
    duck(0.35);
    play('pause');
    const back = app.demo ? app.demo.screen : null;
    stage.show(pauseScreen({
      label: labelOf(app.scene.level),
      resume: () => {
        app.screen = app.demo ? 'demo' : 'play';
        duck(1);
        resetInput(input);
        stage.show(back);
      },
      restart: r.restart,
      select: r.goLobby,
      title: r.goTitle,
    }));
  };

  r.live = live;
  return r;
}
