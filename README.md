# FPS Foundation

A small, reusable first-person controller starter built around the movement architecture used by DFLAT. It intentionally contains no DFLAT level, mission, model library, game menu, story, or original game UI.

## Included

- First-person camera controller with smooth yaw/pitch synchronization, walking bob, breathing, subtle lean and strafe roll.
- WASD and arrow-key movement, sprint, jump and gravity.
- Radius-based player collision against axis-aligned X/Z collider rectangles, with wall sliding.
- Optional world bounds, spawn positioning and proximity interaction callbacks.
- Pointer Lock mouse look.
- Touch movement joystick, separate touch-look surface and jump/run/interact/pause buttons.
- Gamepad left-stick movement, right-stick look, jump, interact, sprint and pause.
- Minimal Three.js test scene with replaceable geometry.
- Node tests for movement, collisions, diagonal speed, jumping and pause state.

The player is a first-person camera with a collision radius; there is no visible third-person body or character mesh in this foundation.

## Run locally

Requirements: Node.js 20 or newer.

~~~sh
npm install
npm run dev
~~~

Build the static site:

~~~sh
npm run build
npm run preview
~~~

Run controller tests:

~~~sh
npm test
~~~

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D or arrows | Move |
| Shift | Sprint |
| Space | Jump |
| Mouse | Look (click the scene to capture the pointer) |
| E | Interact with the nearest enabled object in range |
| Escape | Pause / resume |
| Touch | Left joystick to move, drag the right side to look, action buttons |
| Gamepad | Left stick move, right stick look, A jump, X interact, triggers sprint, Start / B pause |

## Project structure

~~~text
src/
  core/
    player-controller.js
    input-controller.js
  main.js
tests/
  player-controller.test.js
index.html
styles.css
vite.config.js
~~~

## Connecting a new world

1. Build a Three.js scene and add its meshes to the scene in src/main.js.
2. For every solid rectangular obstacle, add an X/Z collider with minX, maxX, minZ and maxZ.
3. Pass the collider array, optional world bounds and interaction objects to createPlayerController.
4. Keep the controller and input adapter independent from level construction.

The controller accepts a Three.js camera and does not create world geometry itself.

## Source relationship

The movement feel and first-person architecture are based on the player controller and multi-device input approach in [akcizur/DFLAT](https://github.com/akcizur/DFLAT). This repository is a clean extraction for a new project, not a copy of the DFLAT game.