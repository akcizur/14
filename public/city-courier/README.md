# City Courier (legacy arcade mode)

A separate arcade game mode extracted from the uploaded single-file City Courier build. It lives under `public/city-courier/` and does not replace the current two-house first-person world.

## Project layout

- `index.html`: page and interface shell.
- `style.css`: HUD, menu and responsive styles.
- `assets.js`: validates and loads the model manifest.
- `assets/manifest.json`: mapping from model names to GLB files.
- `assets/models/`: 32 independently cacheable GLB assets.
- `js/00-engine.js`: renderer, shared state, input bindings, model and vehicle factories.
- `js/10-city.js`: procedural city and collision geometry.
- `js/20-mission.js`: mission state, parcels, score, police and HUD.
- `js/30-weapons.js`: first-person controls, weapon selection, hit detection and audio.
- `js/40-open-world.js`: pedestrians, vehicles, day/night lighting and Open World systems.
- `js/50-loop.js`: animation loop, rendering and startup.

The runtime files remain ordered classic scripts. This preserves the existing shared global state while establishing boundaries for a later dependency-safe ES-module refactor.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite-served `/city-courier/` route. Do not open the page through `file://`; the manifest and GLB loader use HTTP requests.

## Controls

- WASD / arrows: drive and walk
- Mouse: look around in first-person mode; hold left mouse to fire
- E: enter or leave a vehicle
- V: switch first- and third-person camera
- 1 / 2 / 3: pistol, SMG, shotgun
- Shift: sprint; Space: jump; F: flip car model orientation

## Implemented systems

- 32 external GLB assets instead of embedded base64 model data
- Local mission TOP 10 in `localStorage`, with the legacy `akc14best` key retained
- Three weapons with distinct cadence, spread, pellet count, range, stun and synthesized audio
- A 90-second day/night cycle in missions and Open World
- Vehicle wheel rotation where source models expose wheel nodes, plus basic lighting and body movement

## Validation

`npm test` verifies GLB headers and byte lengths, runtime script order and JavaScript syntax. GitHub Actions then runs the production Vite build.
