import "../styles.css";
import * as THREE from "three";
import { createPlayerController } from "./core/player-controller.js";
import { bindInput } from "./core/input-controller.js";
import { buildExterior } from "./world/exterior.js";
import { buildHouseA } from "./interiors/house-a.js";
import { buildHouseB } from "./interiors/house-b.js";
import { SceneManager } from "./scenes/scene-manager.js";
import { WORLD_PLAN } from "./world/world-plan.js";
import { configureWorldRenderer, createWorldLighting } from "./world/lighting.js";
import { disposeSurfaceTextures, loadRealPbrMaterials } from "./world/surface-materials.js";
import { createWorldPostProcessing } from "./world/postprocessing.js";

const mount = document.getElementById("game");
const coordinates = document.getElementById("coordinates");
const locationLabel = document.getElementById("locationLabel");
const toast = document.getElementById("toast");
const hint = document.getElementById("hint");
const crosshair = document.querySelector(".crosshair");
const pauseScreen = document.getElementById("pauseScreen");
const welcomeScreen = document.getElementById("welcomeScreen");
const fadeElement = document.getElementById("sceneFade");
const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
const defaultHint = coarsePointer
  ? "JOYSTICK POHYB · TAŽENÍ POHLED · TLAČÍTKA AKCE"
  : "WASD POHYB · SHIFT BĚH · SPACE SKOK · MYŠ POHLED · E INTERAKCE";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4c9c7);
scene.fog = new THREE.Fog(0xb8c0bf, 54, 128);
const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 150);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
configureWorldRenderer(renderer, window.devicePixelRatio || 1);
renderer.domElement.id = "screenCanvas";
renderer.domElement.setAttribute("aria-label", "První osoba — dva domy");
renderer.domElement.tabIndex = 0;
mount.appendChild(renderer.domElement);

const worldLighting = createWorldLighting(scene, renderer);
const postProcessing = createWorldPostProcessing(renderer, scene, camera);

function prepareAmbientOcclusionUVs(root) {
  root.traverse(object => {
    if (!object.isMesh || !object.geometry?.attributes?.uv || object.geometry.attributes.uv2) return;
    object.geometry.setAttribute("uv2", object.geometry.attributes.uv.clone());
  });
}

const state = { started: false, paused: false, transitioning: false };
let sceneManager;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  postProcessing.setSize(width, height);
}

const controller = createPlayerController({ camera, state, ui: { showToast } });
const transitionTo = (target, sourceDoor, targetSpawn) =>
  sceneManager.transition(target, sourceDoor, targetSpawn);

const exterior = buildExterior({ onDoorInteract: transitionTo, generatedHouses: true });
const houseA = buildHouseA({ onExit: transitionTo, seed: WORLD_PLAN.houses.find(site => site.planId === "houseA").seed });
const houseB = buildHouseB({ onExit: transitionTo, seed: WORLD_PLAN.houses.find(site => site.planId === "houseB").seed });

for (const root of [exterior.group, houseA.group, houseB.group]) prepareAmbientOcclusionUVs(root);
void loadRealPbrMaterials().then(result => {
  console.info("[PBR] Real Poly Haven materials loaded:", result.textures.join(", "));
}).catch(error => {
  console.warn("[PBR] Using procedural fallback materials:", error);
});
void worldLighting.hdriReady.then(loaded => {
  console.info("[Lighting] " + (loaded ? "Poly Haven HDRI loaded." : "Procedural daylight fallback active."));
});

sceneManager = new SceneManager({
  root: scene,
  controller,
  state,
  fadeElement,
  onChange(id) {
    const labels = {
      street: "ULICE / EXTERIÉR",
      houseA: "DŮM A / INTERIÉR",
      houseB: "DŮM B / INTERIÉR"
    };
    locationLabel.textContent = labels[id] || id.toUpperCase();
    hint.textContent = defaultHint;
  }
});
sceneManager.register(exterior);
sceneManager.register(houseA);
sceneManager.register(houseB);
sceneManager.activate("street", "start");

const input = bindInput({
  element: renderer.domElement,
  controller,
  state,
  onInteract: () => controller.doInteract(),
  onStart: () => showToast("ROZHLÉDNI SE PO ULICI"),
  onPauseChange(paused) {
    pauseScreen.hidden = !paused;
    renderer.domElement.classList.toggle("is-paused", paused);
  }
});

let resizeObserver;
if (typeof ResizeObserver !== "undefined") {
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
} else {
  window.addEventListener("resize", resize, { passive: true });
}
resize();

let previousTime = 0;
renderer.setAnimationLoop(time => {
  const deltaTime = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
  previousTime = time;
  const nearby = controller.update(deltaTime);
  exterior.traffic.update(deltaTime, sceneManager.currentId === "street" && state.started && !state.paused && !state.transitioning);
  exterior.pedestrians.update(deltaTime, sceneManager.currentId === "street" && state.started && !state.paused && !state.transitioning);
  coordinates.textContent =
    "X " + controller.player.x.toFixed(1) + " · Z " + controller.player.z.toFixed(1);

  const canInteract = state.started && !state.transitioning && !state.paused && Boolean(nearby);
  crosshair.classList.toggle("is-interactive", canInteract);
  if (canInteract) {
    hint.textContent = nearby.prompt || "E / INTERAKCE";
    hint.classList.add("is-interactive");
  } else {
    hint.classList.remove("is-interactive");
    if (state.transitioning) hint.textContent = "PŘECHOD...";
    else if (state.paused) hint.textContent = "PAUZA";
    else hint.textContent = defaultHint;
  }

  postProcessing.render(deltaTime);
});

window.addEventListener("beforeunload", () => {
  input.destroy();
  resizeObserver?.disconnect();
  if (!resizeObserver) window.removeEventListener("resize", resize);
  renderer.setAnimationLoop(null);
  exterior.traffic.dispose();
  exterior.pedestrians.dispose();
  sceneManager.dispose();
  postProcessing.dispose();
  worldLighting.dispose();
  disposeSurfaceTextures();
  renderer.dispose();
});
