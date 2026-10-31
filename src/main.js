import "../styles.css";
import * as THREE from "three";
import { createPlayerController } from "./core/player-controller.js";
import { bindInput } from "./core/input-controller.js";

const mount = document.getElementById("game");
const coordinates = document.getElementById("coordinates");
const toast = document.getElementById("toast");
const pauseScreen = document.getElementById("pauseScreen");
const hint = document.getElementById("hint");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111315);
scene.fog = new THREE.Fog(0x111315, 32, 105);

const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 180);
camera.position.set(0, 1.68, 6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.id = "screenCanvas";
renderer.domElement.setAttribute("aria-label", "3D first-person scene");
renderer.domElement.tabIndex = 0;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdde5e7, 0x34383b, 2.1));

const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(-12, 22, 10);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x292d30, roughness: 0.94 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.025;
scene.add(floor);

const grid = new THREE.GridHelper(120, 60, 0x565d60, 0x3b4144);
grid.position.y = 0.002;
scene.add(grid);

const colliders = [];

function addBlock(name, x, z, width, height, depth, color, solid = true) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.84 })
  );
  mesh.position.set(x, height / 2, z);
  scene.add(mesh);

  if (solid) {
    colliders.push({
      name,
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }
  return mesh;
}

// Replace this neutral test layout with a custom world.
addBlock("north wall", 0, -18, 26, 4, 0.6, 0x50585c);
addBlock("west wall", -13, -7, 0.6, 4, 22, 0x454c50);
addBlock("east wall", 13, -7, 0.6, 4, 22, 0x454c50);
addBlock("low barrier", -4, -7, 5.5, 1.2, 0.65, 0x737a7d);
addBlock("test pillar", 6, -11, 1.6, 3.6, 1.6, 0x626b70);
addBlock("test crate", 3.5, 1, 1.4, 1.4, 1.4, 0x8c8e87);

const marker = addBlock("interaction marker", 0, -9.5, 0.8, 1.4, 0.8, 0xd7ff76, false);
marker.material.emissive = new THREE.Color(0x35451a);
marker.material.emissiveIntensity = 0.65;

const state = { started: true, paused: false };

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

const interactables = [{
  id: "test-marker",
  x: 0,
  z: -9.5,
  range: 2.4,
  action() {
    showToast("Interaction callback works.");
    marker.rotation.y += Math.PI / 4;
  }
}];

const controller = createPlayerController({
  camera,
  colliders,
  interactables,
  state,
  ui: { showToast },
  navigation: {
    bounds: { minX: -56, maxX: 56, minZ: -56, maxZ: 56 }
  }
});

controller.setSpawn({ x: 0, z: 6, yaw: 0 });

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

function resize() {
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(mount);
resize();

let previousTime = 0;
renderer.setAnimationLoop(time => {
  const deltaTime = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
  previousTime = time;

  const nearby = controller.update(deltaTime);
  marker.material.emissiveIntensity = 0.45 + Math.sin(time * 0.002) * 0.16;

  coordinates.textContent =
    "X " + controller.player.x.toFixed(2) + " · Z " + controller.player.z.toFixed(2);

  hint.textContent = nearby
    ? "E / TAP TO INTERACT · WASD MOVE · SHIFT RUN · SPACE JUMP"
    : "WASD MOVE · SHIFT RUN · SPACE JUMP · MOUSE LOOK · E INTERACT · ESC PAUSE";

  renderer.render(scene, camera);
});

window.addEventListener("beforeunload", () => {
  input.destroy();
  resizeObserver.disconnect();
  renderer.setAnimationLoop(null);
  renderer.dispose();
});