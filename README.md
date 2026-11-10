# 14 — Two-house FPS world

A small first-person Three.js environment built around one street, two opposing houses and two empty interiors.

## Current world

- One short residential street with sidewalks and two houses facing each other.
- House A and House B each have a separate empty interior.
- Front doors rotate around a hinge pivot before the location transition.
- Entry and exit use paired, house-specific spawn points.
- The player enters facing into the room and exits facing away from the facade toward the street.
- Scene transitions use a short fade and preserve the exact source position if a destination spawn is invalid.
- One shared camera, renderer, FPS controller and input layer are used across all locations.
- Each location owns its own colliders, interaction points and navigation bounds.

Interiors are intentionally unfurnished. They currently contain only the floor, walls, ceiling, windows, lighting and door opening.

## Run

Requirements: Node.js 20 or newer.

~~~sh
npm install
npm run dev
~~~

Run controller tests and build the static site:

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
| E | Enter / leave a house |
| Escape | Pause / resume |
| Touch | Left joystick to move, drag right side to look, action buttons |
| Gamepad | Left stick move, right stick look, A jump, X interact, triggers sprint, Start / B pause |

## Scene architecture

~~~text
src/
  core/
    input-controller.js
    player-controller.js
  scenes/
    door-spawns.js
    scene-manager.js
  world/
    exterior.js
    geometry.js
    interior-builder.js
    interactions/
      door-transition.js
  interiors/
    house-a.js
    house-b.js
~~~

The SceneManager switches location visibility and world data without recreating the renderer, camera or player controller. The player controller accepts new colliders, interactables and navigation bounds through setWorld(). Door spawn orientation is centralized in door-spawns.js so both opposing houses use the same in/out rules.

## Deployment

The repository is configured for GitHub Pages through .github/workflows/pages.yml.
