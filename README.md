# Severní čtvrť — FPS World

A browser-based low-poly residential district built with Three.js and the standalone FPS controller in this repository.

## World

- 20 separate residential lots arranged in a 4 × 5 district.
- A road grid, asphalt, lane markings, raised curbs, sidewalks and parking bays.
- 20 individual low-poly houses with varied silhouettes, roof styles, facades, porches, doors, windows and chimneys.
- Small yards, fences, hedges, flowerbeds, mailboxes and trees.
- Street lamps, benches, bins and a district entrance sign.
- Per-house and prop collision boxes, plus district boundary walls.
- Optional import of the supplied Blender house pack as a GLB file. If it is not present, the built-in procedural house set is used automatically.

## Run

Requirements: Node.js 20 or newer.

~~~sh
npm install
npm run dev
~~~

Build and preview the static site:

~~~sh
npm test
npm run build
npm run preview
~~~

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D or arrows | Move |
| Shift | Sprint |
| Space | Jump |
| Mouse | Look (click the world to capture the pointer) |
| E | Interact with nearby home markers / district sign |
| Escape | Pause / resume |
| Touch | Left joystick to move, drag right side to look, action buttons |
| Gamepad | Left stick move, right stick look, A jump, X interact, triggers sprint, Start / B pause |

## Optional Blender model pack

Place the exported model at:

~~~text
public/models/LowPoly_House_20_Pack_Selected.glb
~~~

The GLB should expose scene roots named `house_1`, `house_2`, etc. The world will detect and reuse the available variants. The built-in procedural houses remain available as a fallback, so the world does not require the asset to start.

## Project layout

~~~text
src/
  core/
    player-controller.js
    input-controller.js
  world/
    world.js
  main.js
public/
  models/
    LowPoly_House_20_Pack_Selected.glb  (optional)
tests/
  player-controller.test.js
~~~

The movement controller is kept separate from the world builder so another level can reuse the same FPS movement, touch, keyboard, mouse and gamepad input.

## Source relationship

The first-person movement architecture is based on the approach in [akcizur/DFLAT](https://github.com/akcizur/DFLAT). This repository is a reusable controller and test world, not the DFLAT game.
