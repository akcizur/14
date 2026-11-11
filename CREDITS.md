# Third-party asset credits

All assets below are provided by [Poly Haven](https://polyhaven.com) under the **CC0 1.0 Universal** license. They may be used, modified and redistributed, including in commercial projects.

| Asset | Use | Creator | Source |
|---|---|---|---|
| White Stucco 02 | Exterior and interior plaster | Dimitrios Savva | https://polyhaven.com/a/white_stucco_02 |
| Asphalt 02 | Street asphalt | Rob Tuytel | https://polyhaven.com/a/asphalt_02 |
| Brick Pavement 02 | Sidewalk paving | Charlotte Baglioni | https://polyhaven.com/a/brick_pavement_02 |
| Concrete Floor 01 | Concrete details and foundations | Rob Tuytel | https://polyhaven.com/a/concrete_floor_01 |
| Roof Tiles | Roof tile surface | Stephan Seeliger | https://polyhaven.com/a/roof_tiles |
| Wood Floor | Interior wood surfaces | Dimitrios Savva | https://polyhaven.com/a/wood_floor |
| Leafy Grass | Lawn ground surface | Charlotte Baglioni | https://polyhaven.com/a/leafy_grass |
| Brick Wall 001 | Chimney masonry | Dimitrios Savva; Rob Tuytel | https://polyhaven.com/a/brick_wall_001 |
| Interior Tiles | Kitchen and bathroom floors | Charlotte Baglioni | https://polyhaven.com/a/interior_tiles |
| Kloofendal 48d Partly Cloudy (Pure Sky) | HDRI sky, image-based lighting and reflections | Greg Zaal; Jarod Guest | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |

## Map usage

The asset preparation script downloads available diffuse/albedo, OpenGL tangent-space normal, roughness, ambient occlusion and displacement maps. The runtime loads these maps locally; it does not call the Poly Haven API.

The game uses Three.js GTAO for screen-space contact occlusion in addition to the scanned material AO maps.

## Rebuilding

Run `npm run assets:pbr` before `npm run dev` or `npm run build`. GitHub Pages runs this command in the deployment workflow.
