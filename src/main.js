import "../styles.css";
import * as THREE from "three";
import { createPlayerController } from "./core/player-controller.js";
import { bindInput } from "./core/input-controller.js";
import { buildExterior } from "./world/exterior.js";
import { buildHouseA } from "./interiors/house-a.js";
import { buildHouseB } from "./interiors/house-b.js";
import { SceneManager } from "./scenes/scene-manager.js";

const mount = document.getElementById("game");
const coordinates = document.getElementById("coordinates");
const locationLabel = document.getElementById("locationLabel");
const toast = document.getElementById("toast");
const hint = document.getElementById("hint");
const pauseScreen = document.getElementById("pauseScreen");
const welcomeScreen = document.getElementById("welcomeScreen");
const fadeElement = document.getElementById("sceneFade");
const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
const defaultHint = coarsePointer
  ? "JOYSTICK POHYB · TAŽENÍ POHLED · TLAČÍTKA AKCE"
  : "WASD POHYB · SHIFT BĚH · SPACE SKOK · MYŠ POHLED · E INTERAKCE";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8b8bf);
scene.fog = new THREE.Fog(0xa8b8bf, 55, 115);
const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 150);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = "screenCanvas";
renderer.domElement.setAttribute("aria-label", "První osoba — dva domy");
renderer.domElement.tabIndex = 0;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7eef0, 0x62675c, 1.75));
const sun = new THREE.DirectionalLight(0xfff0d5, 2.05);
sun.position.set(-24, 38, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -38;
sun.shadow.camera.right = 38;
sun.shadow.camera.top = 38;
sun.shadow.camera.bottom = -38;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 95;
sun.shadow.bias = -0.0002;
scene.add(sun);

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
}

const controller = createPlayerController({ camera, state, ui: { showToast } });
const transitionTo = (target, sourceDoor, targetSpawn) =>
  sceneManager.transition(target, sourceDoor, targetSpawn);

const exterior = buildExterior({ onDoorInteract: transitionTo });
const houseA = buildHouseA({ onExit: transitionTo });
const houseB = buildHouseB({ onExit: transitionTo });

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
  coordinates.textContent =
    "X " + controller.player.x.toFixed(1) + " · Z " + controller.player.z.toFixed(1);

  if (!state.transitioning && !state.paused && nearby) {
    hint.textContent = nearby.prompt || "E / INTERAKCE";
    hint.classList.add("is-interactive");
  } else {
    hint.classList.remove("is-interactive");
    if (state.transitioning) hint.textContent = "PŘECHOD...";
    else if (state.paused) hint.textContent = "PAUZA";
    else hint.textContent = defaultHint;
  }

  renderer.render(scene, camera);
});

window.addEventListener("beforeunload", () => {
  input.destroy();
  resizeObserver?.disconnect();
  if (!resizeObserver) window.removeEventListener("resize", resize);
  renderer.setAnimationLoop(null);
  sceneManager.dispose();
  renderer.dispose();
});
