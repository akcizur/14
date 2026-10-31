// Unified keyboard, mouse, touch and Gamepad API input.
// Input sources are tracked independently so one device cannot cancel another.
export function bindInput({
  element,
  controller,
  state = { started: true, paused: false },
  onInteract = () => {},
  onPauseChange = () => {},
  touchRoot = document
}) {
  if (!element || !controller) {
    throw new TypeError("bindInput requires a render element and player controller.");
  }

  const { player, keysDown } = controller;
  const movementCodes = [
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
  ];
  const sources = {
    keyboard: Object.create(null),
    touchButtons: Object.create(null),
    gamepad: Object.create(null)
  };
  const knownCodes = new Set([...movementCodes, "ShiftLeft", "ShiftRight"]);
  const listeners = [];
  const runPointers = new Set();
  const sensitivity = {
    mouseX: 0.001,
    mouseY: 0.0009,
    touchX: 0.003,
    touchY: 0.002,
    gamepadLook: 2.2
  };

  let stickPointer = null;
  let lookPointer = null;
  let previousGamepadButtons = [];
  let animationFrame = 0;
  let destroyed = false;

  const moveStick = touchRoot.getElementById?.("moveStick") ?? touchRoot.querySelector?.("#moveStick");
  const moveKnob = touchRoot.getElementById?.("moveKnob") ?? touchRoot.querySelector?.("#moveKnob");
  const lookZone = touchRoot.getElementById?.("touchLookZone") ?? touchRoot.querySelector?.("#touchLookZone");
  const resumeButton = touchRoot.getElementById?.("resumeButton") ?? touchRoot.querySelector?.("#resumeButton");

  function listen(target, type, callback, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    try {
      if (moveStick?.hasPointerCapture?.(pointerId)) moveStick.releasePointerCapture(pointerId);
    } catch {}
    controller.setAnalogMove?.(0, 0);
    if (moveKnob) moveKnob.style.transform = "translate(0, 0)";
    moveStick?.classList.remove("active");
  }

  function endLook(event) {
    if (!lookPointer || (event && event.pointerId !== lookPointer.id)) return;
    const pointerId = lookPointer.id;
    lookPointer = null;
    lookZone?.classList.remove("active");
    try {
      if (lookZone?.hasPointerCapture?.(pointerId)) lookZone.releasePointerCapture(pointerId);
    } catch {}
  }

  function clearInput() {
    for (const source of Object.keys(sources)) clearSource(source);
    for (const code of knownCodes) keysDown[code] = false;
    runPointers.clear();
    touchRoot.querySelector?.('[data-touch-action="run"]')?.classList.remove("is-held");
    controller.setAnalogMove?.(0, 0);
    releaseStick();
    endLook();
  }

  function setPaused(paused) {
    if (state.paused === paused) return;
    state.paused = paused;
    if (paused) {
      clearInput();
      if (document.pointerLockElement === element) document.exitPointerLock?.();
    }
    onPauseChange(paused);
  }

  function togglePause() {
    setPaused(!state.paused);
  }

  function requestPointerLock() {
    if (state.paused || !state.started || !element.requestPointerLock) return;
    const result = element.requestPointerLock();
    if (result?.catch) result.catch(() => {});
  }

  function onKeyDown(event) {
    const target = event.target;
    if (target instanceof Element && (
      target.matches("input, textarea, select") || target.isContentEditable
    )) return;

    if (event.code === "Escape") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.code === "Enter" && state.paused) {
      event.preventDefault();
      setPaused(false);
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat && !state.paused) controller.jump?.();
      return;
    }
    if (event.code === "KeyE") {
      if (!event.repeat && !state.paused) onInteract();
      return;
    }
    if (movementCodes.includes(event.code)) {
      event.preventDefault();
      setKey(event.code, !state.paused);
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      setKey(event.code, !state.paused);
    }
  }

  function onKeyUp(event) {
    if (movementCodes.includes(event.code)) event.preventDefault();
    if (knownCodes.has(event.code)) setKey(event.code, false);
  }

  listen(window, "keydown", onKeyDown, { capture: true });
  listen(window, "keyup", onKeyUp, { capture: true });
  listen(window, "blur", clearInput);
  listen(window, "pagehide", clearInput);
  listen(document, "visibilitychange", () => {
    if (document.hidden) clearInput();
  });

  listen(element, "click", () => {
    if (matchMedia("(pointer:fine)").matches && !document.pointerLockElement) requestPointerLock();
  });

  listen(document, "mousemove", event => {
    if (document.pointerLockElement !== element || state.paused) return;
    player.yaw -= event.movementX * sensitivity.mouseX;
    player.pitch = clamp(player.pitch - event.movementY * sensitivity.mouseY, -1.35, 1.35);
  });

  // Touch joystick: vertical up is positive forward intent.
  function updateStick(event) {
    if (!moveStick) return;
    const rect = moveStick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const x = clamp(dx / radius, -1, 1);
    const y = clamp(-dy / radius, -1, 1);
    const length = Math.hypot(x, y);
    const deadZone = 0.16;
    const scale = length <= deadZone ? 0 : Math.min(1, (length - deadZone) / (1 - deadZone)) / Math.max(length, 0.001);
    controller.setAnalogMove?.(x * scale, y * scale);

    if (moveKnob) {
      const px = clamp(dx, -radius, radius);
      const py = clamp(dy, -radius, radius);
      moveKnob.style.transform = "translate(" + px + "px, " + py + "px)";
    }
  }

  if (moveStick) {
    listen(moveStick, "pointerdown", event => {
      if (event.pointerType === "mouse" || state.paused || stickPointer !== null) return;
      event.preventDefault();
      stickPointer = event.pointerId;
      moveStick.setPointerCapture?.(event.pointerId);
      moveStick.classList.add("active");
      updateStick(event);
    });
    listen(moveStick, "pointermove", event => {
      if (event.pointerId !== stickPointer) return;
      event.preventDefault();
      updateStick(event);
    });
    listen(moveStick, "pointerup", releaseStick);
    listen(moveStick, "pointercancel", releaseStick);
    listen(moveStick, "lostpointercapture", releaseStick);
  }

  if (lookZone) {
    listen(lookZone, "pointerdown", event => {
      if (event.pointerType === "mouse" || state.paused || lookPointer) return;
      event.preventDefault();
      lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      lookZone.setPointerCapture?.(event.pointerId);
      lookZone.classList.add("active");
    });
    listen(lookZone, "pointermove", event => {
      if (!lookPointer || lookPointer.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - lookPointer.x;
      const dy = event.clientY - lookPointer.y;
      lookPointer.x = event.clientX;
      lookPointer.y = event.clientY;
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
        if (event.pointerType === "mouse" || state.paused) return;
        event.preventDefault();
        if (action === "jump") controller.jump?.();
        if (action === "interact") onInteract();
        if (action === "pause") togglePause();
      });
    }

    if (action === "run") {
      const releaseRun = event => {
        if (event && !runPointers.has(event.pointerId)) return;
        if (event) runPointers.delete(event.pointerId);
        else runPointers.clear();
        setKey("ShiftLeft", runPointers.size > 0, "touchButtons");
        button.classList.toggle("is-held", runPointers.size > 0);
      };
      listen(button, "pointerdown", event => {
        if (event.pointerType === "mouse" || state.paused) return;
        event.preventDefault();
        runPointers.add(event.pointerId);
        setKey("ShiftLeft", true, "touchButtons");
        button.classList.add("is-held");
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

  function pollGamepad() {
    if (destroyed) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(item => item?.connected);

    if (pad && !state.paused) {
      const leftX = deadZone(pad.axes[0]);
      const leftY = deadZone(pad.axes[1]);
      controller.setAnalogMove?.(leftX, -leftY);

      const rightX = deadZone(pad.axes[2]);
      const rightY = deadZone(pad.axes[3]);
      player.yaw -= rightX * sensitivity.gamepadLook / 60;
      player.pitch = clamp(player.pitch + rightY * sensitivity.gamepadLook / 60, -1.25, 1.25);

      const pressed = index => Boolean(pad.buttons[index]?.pressed);
      const edge = index => pressed(index) && !previousGamepadButtons[index];
      if (edge(0)) controller.jump?.();
      if (edge(2)) onInteract();
      if (edge(9) || edge(1)) togglePause();
      setKey("ShiftLeft", pressed(6) || pressed(7), "gamepad");

      previousGamepadButtons = pad.buttons.map(button => button.pressed);
    } else {
      controller.setAnalogMove?.(0, 0);
      clearSource("gamepad");
      previousGamepadButtons = [];
    }

    animationFrame = requestAnimationFrame(pollGamepad);
  }

  listen(window, "gamepaddisconnected", () => {
    clearSource("gamepad");
    controller.setAnalogMove?.(0, 0);
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