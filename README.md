# 14 — Procedural residential world

A low-poly first-person Three.js environment with two playable houses, a residential street, traffic and pedestrians.

## Unified world model

`src/world/world-plan.js` is the canonical spatial source of truth. Its measurements are in metres and define the road, sidewalks, crosswalks, traffic lanes, pedestrian routes, vegetation, navigation bounds and house sites.

The world is built from that model. Street geometry, traffic and pedestrian systems receive the same dimensions instead of maintaining separate coordinate constants.

## Procedural houses

`src/world/house-plans.js` contains two house archetypes and a deterministic seed-based generator:

- `central-hall`: four rooms arranged around a central circulation hall.
- `five-room`: open living/kitchen zone with a three-room rear wing.

A seed determines room dimensions, partition positions, window placement, roof profile and material palette. The same seed is passed to the exterior shell, window preview and playable interior, so they always describe the same building.

Every generated plan is validated before geometry is created. Validation checks footprint bounds, room overlap, partition ranges, door openings, facade windows and entrance dimensions.

## Derived geometry and physics

The building plan drives the exterior walls, real wall openings, frames, roof, eaves, gutters, entrance, interior partitions, window preview, room furnishings, door spawns and navigation bounds.

Large furniture pieces create matching player collision volumes. Window previews are visual-only and never add collision. Door dimensions and spawn distances come from the same entrance definition.

## Runtime systems

- One renderer, camera, player controller and scene manager are shared between street and interiors.
- Traffic reads its road edge and lane spacing from the street plan.
- Pedestrians read sidewalk lines, crossing locations, benches and spawn points from the same plan.
- Door transitions retain the route-aligned threshold crossing and swap collision worlds at the doorway.

## Project structure

```text
src/
  core/
    input-controller.js
    player-controller.js
  scenes/
    door-spawns.js
    scene-manager.js
  world/
    world-plan.js
    house-plans.js
    house-plan-geometry.js
    exterior.js
    interior-builder.js
    interior-preview.js
    roof-geometry.js
    traffic.js
    pedestrians.js
    interactions/
      door-transition.js
  interiors/
    house-a.js
    house-b.js
tests/
```

## Run and verify

Requirements: Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run build
```

GitHub Pages deploys from `main` after the test suite and production build succeed.
