# City Courier (legacy arcade mode)

A separate arcade game mode extracted from the uploaded single-file City Courier build. It lives under `public/city-courier/` and does not replace the current two-house first-person world.

## Project layout

- `index.html`: page and interface shell.
- `style.css`: HUD, menu and responsive styles.
- `assets.js`: validates and loads the model manifest.
- `assets/manifest.json`: mapping from model names to GLB files.
- `assets/models/`: 32 independently cacheable GLB assets.
- `js/05-driving-rules.js`: pure, shared vehicle movement and player-separation rules, covered by unit tests.
- `js/00-engine.js`: renderer, shared state, model factories and keyboard input.
- `js/10-city.js`: procedural city, collision geometry and street lamps.
- `js/20-mission.js`: mission state, two-player driving, parcels, police and HUD.
- `js/30-weapons.js`: first-person controls, weapon selection, hit detection and audio.
- `js/40-open-world.js`: pedestrians, vehicles, day/night lighting and Open World systems.
- `js/50-loop.js`: animation loop, split viewports, rendering and startup.

The runtime files remain ordered classic scripts. The shared driving rules load first so single-player and split-screen use exactly the same tested movement logic. This preserves the existing shared global state while establishing boundaries for a later dependency-safe ES-module refactor.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite-served `/city-courier/` route. Do not open the page through `file://`; the manifest and GLB loader use HTTP requests.

## Controls

- Single player: WASD or arrow keys to drive and walk
- Split-screen: P1 uses WASD; P2 uses arrow keys
- In split-screen both players drive separate cars, share parcels, score, time and lives, and police pursue the nearest driver; P2 is currently driver-only
- Mouse: look around in first-person mode; hold left mouse to fire
- E: P1 enters or leaves a vehicle
- V: switch P1 between first- and third-person camera
- 1 / 2 / 3: pistol, SMG, shotgun
- Shift: sprint; Space: jump; F: flip car model orientation

## Implemented systems

- 32 external GLB assets instead of embedded base64 model data
- Local mission TOP 10 in `localStorage`, with the legacy `akc14best` key retained
- Three weapons with distinct cadence, spread, pellet count, range, stun and synthesized audio
- A 90-second day/night cycle in missions and Open World, including 16 functional street lamps
- Vehicle wheel rotation where source models expose wheel nodes, plus night marker lights and brake lamps
- Local two-driver split-screen with independent keyboard controls and cameras; P2 has an independent SUV and is driver-only in this milestone; local only, with no network synchronization

## Validation

`npm test` verifies GLB headers and byte lengths, runtime script order, JavaScript syntax and the local split-screen wiring. GitHub Actions then runs the production Vite build.
