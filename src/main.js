import "../styles.css";
import * as THREE from "three";
import { createPlayerController } from "./core/player-controller.js";
import { bindInput } from "./core/input-controller.js";
import { buildResidentialWorld } from "./world/world.js";

const mount = document.getElementById("game");
const coordinates = document.getElementById("coordinates");
const toast = document.getElementById("toast");
const pauseScreen = document.getElementById("pauseScreen");
const hint = document.getElementById("hint");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8b8bf);
scene.fog = new THREE.Fog(0xa8b8bf, 92, 176);

const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 220);

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
renderer.domElement.setAttribute("aria-label", "Residential district first-person world");
renderer.domElement.tabIndex = 0;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe4edf1, 0x565c58, 2.0));

const sun = new THREE.DirectionalLight(0xfff1d8, 2.15);
sun.position.set(-42, 72, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -76;
sun.shadow.camera.right = 76;
sun.shadow.camera.top = 76;
sun.shadow.camera.bottom = -76;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 180;
sun.shadow.bias = -0.00018;
scene.add(sun);

const state = { started: true, paused: false };

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2000);
}

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

async function start() {
  hint.textContent = "BUILDING RESIDENTIAL DISTRICT…";

  try {
    const world = await buildResidentialWorld(scene, { showToast });
    const controller = createPlayerController({
      camera,
      colliders: world.colliders,
      interactables: world.interactables,
      state,
      ui: { showToast },
      navigation: {
        bounds: { minX: -61, maxX: 61, minZ: -61, maxZ: 61 }
      }
    });

    controller.setSpawn({ x: 0, z: 58, yaw: 0 });

    const input = bindInput({
      element: renderer.domElement,
      controller,
      state,
      onInteract: () => controller.doInteract(),
      onPauseChange(paused) {
        pauseScreen.hidden = !paused;
        renderer.domElement.classList.toggle("is-paused", paused);
      }
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let previousTime = 0;
    renderer.setAnimationLoop(time => {
      const deltaTime = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;

      const nearby = controller.update(deltaTime);
      world.update(time);

      coordinates.textContent =
        "X " + controller.player.x.toFixed(1) + " · Z " + controller.player.z.toFixed(1);

      hint.textContent = nearby
        ? "E / TAP TO INTERACT · WASD MOVE · SHIFT RUN · SPACE JUMP"
        : "20 HOMES · WASD MOVE · SHIFT RUN · SPACE JUMP · MOUSE LOOK · ESC PAUSE";

      renderer.render(scene, camera);
    });

    window.addEventListener("beforeunload", () => {
      input.destroy();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      world.dispose();
      renderer.dispose();
    });

    showToast(world.usingImportedModels
      ? "SEVERNÍ ČTVRŤ · BLENDER HOUSE PACK LOADED"
      : "SEVERNÍ ČTVRŤ · 20 LOW-POLY HOMES");
  } catch (error) {
    console.error(error);
    hint.textContent = "WORLD INITIALIZATION FAILED · CHECK CONSOLE";
    showToast("World could not be initialized.");
  }
}

start();
