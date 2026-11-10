// Pure input helpers kept separate so analogue and edge-trigger behavior can be tested.
export function combineAnalogSources(...sources) {
  let x = 0, y = 0;
  for (const source of sources) {
    x += Number(source?.x) || 0;
    y += Number(source?.y) || 0;
  }
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y };
}

export function getGamepadButtonEdges(buttons = [], previousButtons = []) {
  return buttons.map((button, index) =>
    Boolean(button?.pressed) && !Boolean(previousButtons[index])
  );
}

// Unified keyboard, mouse, touch and Gamepad API input.
export function bindInput({
  element, controller,
  state = { started: true, paused: false, transitioning: false },
  onInteract = () => {}, onPauseChange = () => {}, touchRoot = document
}) {
  if (!element || !controller) throw new TypeError("bindInput requires a render element and player controller.");
  const { player, keysDown } = controller;
  const movementCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  const sources = {
    keyboard: Object.create(null), touchButtons: Object.create(null), gamepad: Object.create(null)
  };
  const knownCodes = new Set([...movementCodes, "ShiftLeft", "ShiftRight"]);
  const listeners = [], runPointers = new Set();
  const analogSources = {
    touch: { x: 0, y: 0 },
    gamepad: { x: 0, y: 0 }
  };
  const sensitivity = { mouseX: 0.001, mouseY: 0.0009, touchX: 0.003, touchY: 0.002, gamepadLook: 2.2 };
  let stickPointer = null, lookPointer = null, previousGamepadButtons = [];
  let animationFrame = 0, destroyed = false, lastGamepadFrame = null, wasTransitioning = false;
  const moveStick = touchRoot.getElementById?.("moveStick") ?? touchRoot.querySelector?.("#moveStick");
  const moveKnob = touchRoot.getElementById?.("moveKnob") ?? touchRoot.querySelector?.("#moveKnob");
  const lookZone = touchRoot.getElementById?.("touchLookZone") ?? touchRoot.querySelector?.("#touchLookZone");
  const resumeButton = touchRoot.getElementById?.("resumeButton") ?? touchRoot.querySelector?.("#resumeButton");

  function listen(target, type, callback, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function setAnalogSource(source, x, y) {
    if (!analogSources[source]) analogSources[source] = { x: 0, y: 0 };
    analogSources[source].x = clamp(Number(x) || 0, -1, 1);
    analogSources[source].y = clamp(Number(y) || 0, -1, 1);
    const combined = combineAnalogSources(...Object.values(analogSources));
    controller.setAnalogMove?.(combined.x, combined.y);
  }
  function clearAnalogSources() {
    for (const source of Object.values(analogSources)) {
      source.x = 0;
      source.y = 0;
    }
    controller.setAnalogMove?.(0, 0);
  }
  function setKey(code, pressed, source = "keyboard") {
    if (!sources[source]) sources[source] = Object.create(null);
    knownCodes.add(code);
    sources[source][code] = Boolean(pressed);
    keysDown[code] = Object.values(sources).some(sourceKeys => Boolean(sourceKeys[code]));
  }
  function clearSource(source) {
    const sourceKeys = sources[source];
    if (!sourceKeys) return;
    for (const code of Object.keys(sourceKeys)) {
      sourceKeys[code] = false;
      keysDown[code] = Object.values(sources).some(entry => Boolean(entry[code]));
    }
  }
  function releaseStick(event) {
    if (stickPointer === null || (event && event.pointerId !== stickPointer)) return;
    const pointerId = stickPointer;
    stickPointer = null;
    try { if (moveStick?.hasPointerCapture?.(pointerId)) moveStick.releasePointerCapture(pointerId); } catch {}
    setAnalogSource("touch", 0, 0);
    if (moveKnob) moveKnob.style.transform = "translate(0, 0)";
    moveStick?.classList.remove("active");
  }
  function endLook(event) {
    if (!lookPointer || (event && event.pointerId !== lookPointer.id)) return;
    const pointerId = lookPointer.id;
    lookPointer = null;
    lookZone?.classList.remove("active");
    try { if (lookZone?.hasPointerCapture?.(pointerId)) lookZone.releasePointerCapture(pointerId); } catch {}
  }
  function clearInput() {
    for (const source of Object.keys(sources)) clearSource(source);
    for (const code of knownCodes) keysDown[code] = false;
    runPointers.clear();
    touchRoot.querySelector?.('[data-touch-action="run"]')?.classList.remove("is-held");
    clearAnalogSources();
    releaseStick();
    endLook();
  }
  function setPaused(paused) {
    if (state.transitioning || state.paused === paused) return;
    state.paused = paused;
    if (paused) {
      clearInput();
      if (document.pointerLockElement === element) document.exitPointerLock?.();
    }
    onPauseChange(paused);
  }
  function togglePause() { setPaused(!state.paused); }
  function requestPointerLock() {
    if (state.paused || state.transitioning || !state.started || !element.requestPointerLock) return;
    const result = element.requestPointerLock();
    if (result?.catch) result.catch(() => {});
  }
  function onKeyDown(event) {
    const target = event.target;
    if (target instanceof Element && (target.matches("input, textarea, select") || target.isContentEditable)) return;
    if (event.code === "Escape") { event.preventDefault(); togglePause(); return; }
    if (event.code === "Enter" && state.paused) { event.preventDefault(); setPaused(false); return; }
    if (state.transitioning) return;
    if (event.code === "Space") { event.preventDefault(); if (!event.repeat && !state.paused) controller.jump?.(); return; }
    if (event.code === "KeyE") { if (!event.repeat && !state.paused) onInteract(); return; }
    if (movementCodes.includes(event.code)) { event.preventDefault(); setKey(event.code, !state.paused); return; }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") setKey(event.code, !state.paused);
  }
  function onKeyUp(event) {
    if (movementCodes.includes(event.code)) event.preventDefault();
    if (knownCodes.has(event.code)) setKey(event.code, false);
  }
  listen(window, "keydown", onKeyDown, { capture: true });
  listen(window, "keyup", onKeyUp, { capture: true });
  listen(window, "blur", clearInput);
  listen(window, "pagehide", clearInput);
  listen(document, "visibilitychange", () => { if (document.hidden) clearInput(); });
  listen(element, "click", () => {
    if (matchMedia("(pointer:fine)").matches && !document.pointerLockElement) requestPointerLock();
  });
  listen(document, "mousemove", event => {
    if (document.pointerLockElement !== element || state.paused || state.transitioning) return;
    player.yaw -= event.movementX * sensitivity.mouseX;
    player.pitch = clamp(player.pitch - event.movementY * sensitivity.mouseY, -1.35, 1.35);
  });

  function updateStick(event) {
    if (!moveStick) return;
    const rect = moveStick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const x = clamp(dx / radius, -1, 1), y = clamp(-dy / radius, -1, 1);
    const length = Math.hypot(x, y), deadZone = 0.16;
    const scale = length <= deadZone ? 0 : Math.min(1, (length - deadZone) / (1 - deadZone)) / Math.max(length, 0.001);
    setAnalogSource("touch", x * scale, y * scale);
    if (moveKnob) moveKnob.style.transform = "translate(" + clamp(dx, -radius, radius) + "px, " + clamp(dy, -radius, radius) + "px)";
  }
  if (moveStick) {
    listen(moveStick, "pointerdown", event => {
      if (event.pointerType === "mouse" || state.paused || state.transitioning || stickPointer !== null) return;
      event.preventDefault(); stickPointer = event.pointerId; moveStick.setPointerCapture?.(event.pointerId);
      moveStick.classList.add("active"); updateStick(event);
    });
    listen(moveStick, "pointermove", event => {
      if (event.pointerId !== stickPointer || state.transitioning) return;
      event.preventDefault(); updateStick(event);
    });
    listen(moveStick, "pointerup", releaseStick);
    listen(moveStick, "pointercancel", releaseStick);
    listen(moveStick, "lostpointercapture", releaseStick);
  }
  if (lookZone) {
    listen(lookZone, "pointerdown", event => {
      if (event.pointerType === "mouse" || state.paused || state.transitioning || lookPointer) return;
      event.preventDefault(); lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      lookZone.setPointerCapture?.(event.pointerId); lookZone.classList.add("active");
    });
    listen(lookZone, "pointermove", event => {
      if (!lookPointer || lookPointer.id !== event.pointerId || state.transitioning) return;
      event.preventDefault();
      const dx = event.clientX - lookPointer.x, dy = event.clientY - lookPointer.y;
      lookPointer.x = event.clientX; lookPointer.y = event.clientY;
      player.yaw -= dx * sensitivity.touchX;
      player.pitch = clamp(player.pitch - dy * sensitivity.touchY, -1.25, 1.25);
    });
    listen(lookZone, "pointerup", endLook);
    listen(lookZone, "pointercancel", endLook);
    listen(lookZone, "lostpointercapture", endLook);
  }

  const touchButtons = touchRoot.querySelectorAll?.("[data-touch-action]") ?? [];
  for (const button of touchButtons) {
    const action = button.dataset.touchAction;
    if (action === "jump" || action === "interact" || action === "pause") {
      listen(button, "pointerdown", event => {
        if (event.pointerType === "mouse" || state.paused || state.transitioning) return;
        event.preventDefault();
        if (action === "jump") controller.jump?.();
        if (action === "interact") onInteract();
        if (action === "pause") togglePause();
      });
    }
    if (action === "run") {
      const releaseRun = event => {
        if (event && !runPointers.has(event.pointerId)) return;
        if (event) runPointers.delete(event.pointerId); else runPointers.clear();
        setKey("ShiftLeft", runPointers.size > 0, "touchButtons");
        button.classList.toggle("is-held", runPointers.size > 0);
      };
      listen(button, "pointerdown", event => {
        if (event.pointerType === "mouse" || state.paused || state.transitioning) return;
        event.preventDefault(); runPointers.add(event.pointerId);
        setKey("ShiftLeft", true, "touchButtons"); button.classList.add("is-held");
        button.setPointerCapture?.(event.pointerId);
      });
      listen(button, "pointerup", releaseRun);
      listen(button, "pointercancel", releaseRun);
      listen(button, "lostpointercapture", releaseRun);
    }
  }
  listen(resumeButton, "click", () => setPaused(false));

  function deadZone(value) {
    const magnitude = Math.abs(value || 0);
    return magnitude < 0.16 ? 0 : Math.sign(value) * ((magnitude - 0.16) / 0.84);
  }
  function pollGamepad(timestamp = 0) {
    if (destroyed) return;

    if (state.transitioning && !wasTransitioning) clearInput();
    wasTransitioning = Boolean(state.transitioning);

    let frameDelta = 1 / 60;
    if (Number.isFinite(timestamp)) {
      if (lastGamepadFrame !== null) frameDelta = clamp((timestamp - lastGamepadFrame) / 1000, 0, 0.05);
      lastGamepadFrame = timestamp;
    }

    let pad = null;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      pad = Array.from(pads).find(item => item?.connected) ?? null;
    } catch {
      // Browser privacy settings can temporarily deny access to gamepads.
    }

    if (!pad) {
      setAnalogSource("gamepad", 0, 0);
      clearSource("gamepad");
      previousGamepadButtons = [];
      animationFrame = requestAnimationFrame(pollGamepad);
      return;
    }

    const currentButtons = pad.buttons.map(button => Boolean(button?.pressed));
    const edges = getGamepadButtonEdges(pad.buttons, previousGamepadButtons);
    previousGamepadButtons = currentButtons;

    // Pause buttons must be processed even while paused, otherwise the gamepad
    // could enter the pause screen but could never leave it.
    if (edges[9] || edges[1]) togglePause();

    if (!state.paused && !state.transitioning && state.started) {
      const leftX = deadZone(pad.axes[0]), leftY = deadZone(pad.axes[1]);
      setAnalogSource("gamepad", leftX, -leftY);

      const rightX = deadZone(pad.axes[2]), rightY = deadZone(pad.axes[3]);
      player.yaw -= rightX * sensitivity.gamepadLook * frameDelta;
      player.pitch = clamp(
        player.pitch + rightY * sensitivity.gamepadLook * frameDelta,
        -1.25, 1.25
      );

      if (edges[0]) controller.jump?.();
      if (edges[2]) onInteract();
      setKey("ShiftLeft", Boolean(pad.buttons[6]?.pressed || pad.buttons[7]?.pressed), "gamepad");
    } else {
      setAnalogSource("gamepad", 0, 0);
      clearSource("gamepad");
    }

    animationFrame = requestAnimationFrame(pollGamepad);
  }
  listen(window, "gamepaddisconnected", () => {
    clearSource("gamepad");
    setAnalogSource("gamepad", 0, 0);
  });
  animationFrame = requestAnimationFrame(pollGamepad);

  return {
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(animationFrame);
      clearInput();
      for (const dispose of listeners) dispose();
    }
  };
}
