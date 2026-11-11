# 14 — Procedural residential world

A first-person Three.js residential environment with two playable houses, a detailed street, traffic and pedestrians.

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

## Residential street detailing

`src/world/streetscape.js` adds the street-level elements that connect the houses to a believable residential setting: metal and timber front fences, masonry plinths, gates, mailboxes, planted hedges, entrance sconces, street lamps, manhole covers and storm drains. Tree crowns use layered instanced leaf clusters, varied foliage tones and visible branch structure.

The surface material system provides tiling albedo, roughness, height and tangent-space normal maps. The environment uses a higher-resolution daylight sky with soft cloud formations, balanced hemisphere fill and directional sunlight. Vehicle bodies use rounded forms and more complete trim; pedestrian limbs and torsos use curved geometry.

The street layout uses fewer, more plausible pedestrian crossings while keeping vehicle and pedestrian routes linked to the same world plan.

## Photographic materials and lighting

The build fetches the following CC0 material sets from [Poly Haven](https://polyhaven.com): White Stucco 02, Asphalt 02, Brick Pavement 02, Concrete Floor 01, Roof Tiles, Wood Floor, Leafy Grass, Brick Wall 001 and Interior Tiles. The game loads their diffuse, OpenGL normal, roughness, AO and displacement maps locally from `public/assets/pbr/`; no asset requests are made from the browser to Poly Haven.

The outdoor lighting uses the Poly Haven Kloofendal 48d Partly Cloudy HDRI for image-based lighting and reflections, together with a directional sun and hemisphere fill. A denoised Three.js GTAO pass adds real-time screen-space ambient occlusion around contact areas and corners. GTAO runs at a reduced internal resolution and is upscaled for the final frame to limit its frame-time cost. The scanned material AO maps remain available as a separate per-surface layer.

Prepare assets locally with:

```sh
npm run assets:pbr
npm run dev
```

GitHub Pages runs the same asset-fetch step before the production build. The texture sets and HDRI are CC0; see [CREDITS.md](CREDITS.md).

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
