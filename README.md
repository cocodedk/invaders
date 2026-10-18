# Invaders

A cinematic arcade shooter for the browser. Fly anywhere in the lower screen, shoot down formations
and beat a boss at the end of each world: 8 worlds with 5 levels each, every world with its own look,
music and one rule only it has. Power-ups, smart bombs and combos along the way. Clear a level and
the game cuts a movie trailer from your own run; the Cinema on the title screen replays your best
ones. Plain HTML and ES modules: no dependencies, no build step, no network.

## Run locally

```
python3 -m http.server 8000
```

Open http://localhost:8000/ in a browser. Any static file server works, at any sub-path.

## Controls

| Action | Keyboard | Mouse |
|---|---|---|
| Move | Arrows or WASD | the ship follows the pointer |
| Fire (hold for auto-fire) | Space | left button |
| Smart bomb | B or Shift | right button |
| Pause | P or Esc | |
| Mute | M | |
| Confirm in menus | Enter | click |

Any key skips a trailer.

## Test

```
npm test
```

The design is in `docs/superpowers/specs/`, the build plan in `docs/superpowers/plans/`.
