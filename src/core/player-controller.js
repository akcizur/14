// First-person movement, collision, jumping and camera synchronization.
export function createPlayerController({
  camera,
  colliders = [],
  interactables = [],
  state = { started: true, paused: false, transitioning: false },
  ui = {},
  navigation = null,
  config = {}
}) {
  if (!camera?.position || !camera?.rotation) {
    throw new TypeError("createPlayerController requires a Three.js camera.");
  }

  const settings = {
    walkSpeed: 3.6, runMultiplier: 1.8, jumpSpeed: 5.4, gravity: 18.5,
    eyeHeight: 1.68, radius: 0.29, minPitch: -1.35, maxPitch: 1.35, ...config
  };
  const player = {
    x: 0, z: 0, elevation: 0, yaw: 0, pitch: -0.04,
    speed: settings.walkSpeed, radius: settings.radius, jumpHeight: 0
  };
  const keysDown = Object.create(null);
  const analogMove = { x: 0, y: 0 };
  let activeColliders = [...colliders];
  let activeInteractables = [...interactables];
  let activeNavigation = navigation;
  let jumpVelocity = 0;
  let walkTime = 0, breathTime = 0;
  let cameraYaw = player.yaw, cameraPitch = player.pitch;
  let cameraX = player.x, cameraY = settings.eyeHeight, cameraZ = player.z;
  let walkBlend = 0, bodySpeed = 0, forwardIntent = 0, strafeIntent = 0;
  let isRunning = false, bodyLean = 0, bodyRoll = 0;

  camera.position.set(player.x, cameraY, player.z);
  camera.rotation.order = "YXZ";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function blockingCollidersAt(x, z) {
    const radius = player.radius;
    return activeColliders.filter(collider =>
      collider.enabled !== false &&
      x + radius > collider.minX && x - radius < collider.maxX &&
      z + radius > collider.minZ && z - radius < collider.maxZ
    );
  }
  function canMove(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const bounds = activeNavigation?.bounds;
    const radius = player.radius;
    if (bounds && (
      x - radius < bounds.minX || x + radius > bounds.maxX ||
      z - radius < bounds.minZ || z + radius > bounds.maxZ
    )) return false;
    return blockingCollidersAt(x, z).length === 0;
  }
  function tryMoveTo(x, z) {
    if (!canMove(x, z)) return false;
    player.x = x;
    player.z = z;
    return true;
  }
  function movePlayer(dx, dz) {
    if (Math.abs(dx) > 0) tryMoveTo(player.x + dx, player.z);
    if (Math.abs(dz) > 0) tryMoveTo(player.x, player.z + dz);
  }
  function nearestInteractable() {
    let nearest = null, nearestDistance = Infinity;
    const forwardX = -Math.sin(player.yaw), forwardZ = -Math.cos(player.yaw);
    for (const item of activeInteractables) {
      if (item.enabled === false || !Number.isFinite(item.x) || !Number.isFinite(item.z)) continue;
      const range = item.range ?? 2;
      if (!Number.isFinite(range) || range < 0) continue;
      const dx = item.x - player.x, dz = item.z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance > range || distance >= nearestDistance) continue;
      if (item.requiresFacing && distance > 0.001) {
        const facing = (dx / distance) * forwardX + (dz / distance) * forwardZ;
        if (facing < (item.facingThreshold ?? 0.12)) continue;
      }
      nearest = item;
      nearestDistance = distance;
    }
    return nearest;
  }
  function reportInteractionError(error) {
    const message = error?.message || "Interakce se nezdařila.";
    ui.showToast?.("CHYBA / " + message);
  }
  function doInteract() {
    if (state.transitioning || state.paused) return false;
    const item = nearestInteractable();
    if (!item) return false;

    try {
      const result = item.action?.(item, player);
      if (result && typeof result.then === "function") {
        result.catch(reportInteractionError);
      }
      return true;
    } catch (error) {
      reportInteractionError(error);
      return false;
    }
  }
  function syncCamera(deltaTime = 1 / 60) {
    const isMoving = Boolean(state.started) && !state.paused && !state.transitioning && bodySpeed > 0.06;
    const blend = 1 - Math.exp(-deltaTime * 18);
    const settle = 1 - Math.exp(-deltaTime * 5.5);
    walkBlend += ((isMoving ? 1 : 0) - walkBlend) * (1 - Math.exp(-deltaTime * 3.2));
    breathTime += deltaTime;
    if (isMoving) walkTime += deltaTime * (isRunning ? 10.4 : 7.2);
    const targetLean = isMoving
      ? (forwardIntent > 0 ? (isRunning ? 0.052 : 0.022) : forwardIntent < 0 ? -0.012 : 0)
      : 0;
    const targetRoll = isMoving ? -strafeIntent * (isRunning ? 0.042 : 0.026) : 0;
    bodyLean += (targetLean - bodyLean) * settle;
    bodyRoll += (targetRoll - bodyRoll) * settle;
    const breathing = Math.sin(breathTime * 1.35) * 0.008;
    const bobAmplitude = isRunning ? 0.017 : 0.010;
    const bob = Math.sin(walkTime * 1.65) * bobAmplitude * walkBlend;
    const sway = Math.sin(walkTime * 0.5) * 0.0035 * walkBlend;
    const targetX = player.x + Math.cos(player.yaw) * sway;
    const targetY = player.elevation + settings.eyeHeight + player.jumpHeight + breathing + bob;
    const targetZ = player.z - Math.sin(player.yaw) * sway;
    cameraX += (targetX - cameraX) * blend;
    cameraY += (targetY - cameraY) * blend;
    cameraZ += (targetZ - cameraZ) * blend;
    camera.position.set(cameraX, cameraY, cameraZ);
    camera.rotation.order = "YXZ";
    let yawDelta = player.yaw - cameraYaw;
    yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
    cameraYaw += yawDelta;
    cameraPitch += player.pitch - cameraPitch;
    camera.rotation.y = cameraYaw;
    camera.rotation.x = clamp(cameraPitch + bodyLean * 0.6, settings.minPitch, settings.maxPitch);
    camera.rotation.z = bodyRoll;
  }
  function setSpawn(spawn = {}) {
    if (!Number.isFinite(spawn.x) || !Number.isFinite(spawn.z) || !canMove(spawn.x, spawn.z)) return false;
    player.x = spawn.x;
    player.z = spawn.z;
    player.elevation = 0;
    player.jumpHeight = 0;
    jumpVelocity = 0;
    player.yaw = Number.isFinite(spawn.yaw) ? spawn.yaw : 0;
    player.pitch = Number.isFinite(spawn.pitch) ? spawn.pitch : -0.04;
    cameraYaw = player.yaw;
    cameraPitch = player.pitch;
    cameraX = player.x;
    cameraY = settings.eyeHeight;
    cameraZ = player.z;
    for (const code of Object.keys(keysDown)) delete keysDown[code];
    analogMove.x = 0;
    analogMove.y = 0;
    bodySpeed = 0;
    walkBlend = 0;
    camera.position.set(player.x, cameraY, player.z);
    camera.rotation.order = "YXZ";
    camera.rotation.x = cameraPitch;
    camera.rotation.y = cameraYaw;
    camera.rotation.z = 0;
    return true;
  }
  function setWorld({
    colliders: nextColliders = [],
    interactables: nextInteractables = [],
    navigation: nextNavigation = null
  } = {}) {
    activeColliders = Array.isArray(nextColliders) ? nextColliders : [];
    activeInteractables = Array.isArray(nextInteractables) ? nextInteractables : [];
    activeNavigation = nextNavigation;
    for (const code of Object.keys(keysDown)) delete keysDown[code];
    analogMove.x = 0;
    analogMove.y = 0;
    return true;
  }
  function setAnalogMove(x, y) {
    analogMove.x = clamp(Number(x) || 0, -1, 1);
    analogMove.y = clamp(Number(y) || 0, -1, 1);
  }
  function update(deltaTime) {
    const dt = clamp(Number(deltaTime) || 0, 0, 0.05);
    const previousX = player.x, previousZ = player.z;
    forwardIntent = 0;
    strafeIntent = 0;
    isRunning = false;
    bodySpeed = 0;
    if (state.started && !state.paused && !state.transitioning) {
      let forward = Number(Boolean(keysDown.KeyW || keysDown.ArrowUp))
        - Number(Boolean(keysDown.KeyS || keysDown.ArrowDown)) + analogMove.y;
      let strafe = Number(Boolean(keysDown.KeyD || keysDown.ArrowRight))
        - Number(Boolean(keysDown.KeyA || keysDown.ArrowLeft)) + analogMove.x;
      const length = Math.hypot(forward, strafe);
      if (length > 1) { forward /= length; strafe /= length; }
      forwardIntent = forward;
      strafeIntent = strafe;
      isRunning = Boolean(keysDown.ShiftLeft || keysDown.ShiftRight);
      const moveSpeed = player.speed * (isRunning ? settings.runMultiplier : 1);
      const dx = (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * strafe) * moveSpeed * dt;
      const dz = (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * strafe) * moveSpeed * dt;
      movePlayer(dx, dz);
      bodySpeed = dt > 0 ? Math.hypot(player.x - previousX, player.z - previousZ) / dt : 0;
      if (player.jumpHeight > 0 || jumpVelocity > 0) {
        jumpVelocity -= settings.gravity * dt;
        player.jumpHeight += jumpVelocity * dt;
        if (player.jumpHeight <= 0) { player.jumpHeight = 0; jumpVelocity = 0; }
      }
    }
    syncCamera(dt);
    return nearestInteractable();
  }
  function jump() {
    if (!state.started || state.paused || state.transitioning || player.jumpHeight > 0 || jumpVelocity > 0) return false;
    jumpVelocity = settings.jumpSpeed;
    return true;
  }

  return {
    player, keysDown, update, jump, doInteract, setSpawn, setWorld, setAnalogMove, syncCamera,
    getBlockingCollidersAt: (x, z) => blockingCollidersAt(x, z).map(collider => ({
      name: collider.name ?? "(unnamed collider)",
      minX: collider.minX, maxX: collider.maxX,
      minZ: collider.minZ, maxZ: collider.maxZ
    })),
    get isGrounded() { return player.jumpHeight === 0 && jumpVelocity <= 0; },
    get navigationHeight() { return player.elevation; }
  };
}
