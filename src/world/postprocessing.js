import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const GTAO_TUNING = Object.freeze({
  blendIntensity: 0.88,
  radius: 0.32,
  distanceExponent: 1.45,
  thickness: 0.075,
  scale: 1.0,
  samples: 8,
  screenSpaceRadius: true,
  denoiseRadius: 6,
  denoiseSamples: 8,
  resolutionScale: 0.72
});

/**
 * Screen-space GTAO supplies contact occlusion between scene objects. The
 * effect is kept below native resolution on purpose, so it remains usable on
 * laptop and mobile GPUs while retaining a denoised result.
 */
export function createWorldPostProcessing(renderer, scene, camera) {
  if (!renderer?.render || !scene?.isScene || !camera?.isCamera) {
    throw new TypeError("createWorldPostProcessing requires a renderer, scene and camera.");
  }

  let composer = null;
  let gtaoPass = null;
  let outputPass = null;
  let enabled = false;
  const composerPixelRatio = Math.min(renderer.getPixelRatio(), 1.35);

  try {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(composerPixelRatio);
    composer.addPass(new RenderPass(scene, camera));

    gtaoPass = new GTAOPass(scene, camera, 512, 512);
    gtaoPass.output = GTAOPass.OUTPUT.Default;
    gtaoPass.blendIntensity = GTAO_TUNING.blendIntensity;
    gtaoPass.updateGtaoMaterial({
      radius: GTAO_TUNING.radius,
      distanceExponent: GTAO_TUNING.distanceExponent,
      thickness: GTAO_TUNING.thickness,
      scale: GTAO_TUNING.scale,
      samples: GTAO_TUNING.samples,
      screenSpaceRadius: GTAO_TUNING.screenSpaceRadius
    });
    gtaoPass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: GTAO_TUNING.denoiseRadius,
      radiusExponent: 2,
      rings: 2,
      samples: GTAO_TUNING.denoiseSamples
    });
    composer.addPass(gtaoPass);

    outputPass = new OutputPass();
    composer.addPass(outputPass);
    enabled = true;
  } catch (error) {
    console.warn("[PostFX] GTAO unavailable; using the standard renderer.", error);
    outputPass?.dispose();
    gtaoPass?.dispose();
    composer?.dispose();
    composer = null;
    gtaoPass = null;
    outputPass = null;
  }

  return {
    get enabled() { return enabled; },
    gtaoPass,
    setSize(width, height) {
      if (!composer) return;
      composer.setSize(width, height);
      const aoWidth = Math.max(1, Math.round(width * composerPixelRatio * GTAO_TUNING.resolutionScale));
      const aoHeight = Math.max(1, Math.round(height * composerPixelRatio * GTAO_TUNING.resolutionScale));
      gtaoPass?.setSize(aoWidth, aoHeight);
    },
    render(deltaTime = 0) {
      if (composer) composer.render(deltaTime);
      else renderer.render(scene, camera);
    },
    dispose() {
      outputPass?.dispose();
      gtaoPass?.dispose();
      composer?.dispose();
    }
  };
}
