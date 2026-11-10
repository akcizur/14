# 14 — Two-house FPS world

A small first-person Three.js environment built around one street, two opposing houses and two empty interiors.

## Current world

- One short residential street with sidewalks and two houses facing each other.
- House A and House B each have a separate empty interior, with matching front and rear window positions.
- Front doors rotate inward around a hinge pivot; interior exit doors swing outward toward the street.
- Window openings are modeled in the walls and backed by glazing colliders, so the glass remains visible and solid.
- Both roofs use matching gable geometry with aligned ridge caps, verge boards and eaves.
- Entry and exit use paired, house-specific spawn points.
- The player enters facing into the room and exits facing away from the facade toward the street.
- Scene transitions use a short fade and preserve the exact source position if a destination spawn is invalid.
- One shared camera, renderer, FPS controller and input layer are used across all locations.
- Each location owns its own colliders, interaction points and navigation bounds.
- Street trees have solid trunk collision; the player no longer walks through their bases.
- The welcome screen explains the controls before play, and the pause screen restores mouse capture when resumed.
- Nearby doors are signaled by both the interaction hint and a highlighted reticle.

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
| Escape / Enter | Start, pause / resume |
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
    roof-geometry.js
    interior-builder.js
    interactions/
      door-transition.js
  interiors/
    house-a.js
    house-b.js
~~~

Touch joystick and gamepad analogue input are kept as independent sources and combined safely; gamepad pause works in both directions and look speed is time-based. Navigation bounds include the player's collision radius.

The SceneManager switches location visibility and world data without recreating the renderer, camera or player controller. The player controller accepts new colliders, interactables and navigation bounds through setWorld(). Door spawn orientation is centralized in door-spawns.js so both opposing houses use the same in/out rules.

## Deployment

The repository is configured for GitHub Pages through .github/workflows/pages.yml. The test suite covers player movement, collision boundaries, door swing direction, scene transitions, roof profiles, wall openings and input-source arbitration.
