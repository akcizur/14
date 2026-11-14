# City Courier (legacy arcade mode)

This is a preserved, separate game mode extracted from the uploaded single-file City Courier build. It is kept outside the current two-house first-person world so the existing root experience is not overwritten.

## Where it lives

- Entry page: `/city-courier/` after the site is built and deployed.
- Runtime: `game.js` (gameplay and render loop), `assets.js` (manifest bootstrap), `style.css` (interface styling).
- Models: 32 external GLB files in `assets/models/`, indexed by `assets/manifest.json`.

## Run locally

From the repository root:

```sh
npm install
npm run dev
``

Open the Vite-served `/city-courier/` route. Do not open the HTML with `file://`; the GLB loader and manifest use HTTP requests.

## Controls

- WASD / arrows: drive and walk
- Mouse: look around in first-person mode; hold left mouse to fire
- E: enter or leave a vehicle
- V: switch first- and third-person camera
- 1 / 2 / 3: pistol, SMG, shotgun
- Shift: sprint; Space: jump; F: flip car model orientation

## First extraction milestone

The embedded base64 model payloads have been replaced with standalone GLB assets. This keeps the original Three.js r147 runtime and original gameplay structure intact while making models independently cacheable and inspectable. The next refactor can now split the gameplay into world, player, vehicle, weapon, day-cycle and HUD modules without entangling binary data with code.

The local TOP 10 and the legacy best-score key are stored in the browser's localStorage. The 90-second day cycle advances in both mission and Open World modes (about 60 seconds daylight and 30 seconds night).
