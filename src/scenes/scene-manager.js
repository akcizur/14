export class SceneManager {
  constructor({ root, controller, state, fadeElement, onChange = () => {} }) {
    if (!root || !controller || !state) throw new TypeError("SceneManager requires a scene root, controller and state.");
    this.root = root;
    this.controller = controller;
    this.state = state;
    this.fadeElement = fadeElement;
    this.onChange = onChange;
    this.locations = new Map();
    this.currentId = null;
  }

  register(location) {
    if (!location?.id || !location.group) throw new TypeError("A location needs an id and a Three.js group.");
    if (this.locations.has(location.id)) throw new Error("Location already registered: " + location.id);
    location.group.visible = false;
    this.root.add(location.group);
    this.locations.set(location.id, location);
  }

  getSpawn(location, spawnKey = "start") {
    const spawn = location.spawns?.[spawnKey] ?? (spawnKey === "start" || spawnKey === "default" ? location.spawn : null);
    if (!spawn || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.z)) {
      throw new Error("Missing spawn '" + spawnKey + "' in location '" + location.id + "'.");
    }
    return spawn;
  }

  setLocationWorld(location) {
    this.controller.setWorld({
      colliders: location.colliders,
      interactables: location.interactables,
      navigation: location.navigation
    });
  }

  activate(id, spawnKey = "start") {
    const location = this.locations.get(id);
    if (!location) throw new Error("Unknown location: " + id);
    const spawn = this.getSpawn(location, spawnKey);
    const previous = this.locations.get(this.currentId);
    const previousSpawn = previous ? {
      x: this.controller.player.x,
      z: this.controller.player.z,
      yaw: this.controller.player.yaw,
      pitch: this.controller.player.pitch
    } : null;

    this.setLocationWorld(location);
    if (!this.controller.setSpawn(spawn)) {
      if (previous) {
        this.setLocationWorld(previous);
        this.controller.setSpawn(previousSpawn);
      } else {
        this.controller.setWorld({});
      }
      throw new Error("Invalid or obstructed spawn '" + spawnKey + "' for location: " + id);
    }

    for (const entry of this.locations.values()) entry.group.visible = entry.id === id;
    this.currentId = id;
    this.onChange(id, location);
    return location;
  }

  async transition(targetId, sourceDoorId, targetSpawnKey = "default") {
    if (this.state.transitioning || this.state.paused) return false;

    const source = this.locations.get(this.currentId);
    const target = this.locations.get(targetId);
    const door = source?.doors?.[sourceDoorId];
    if (!source || !target || !door) {
      throw new Error("Invalid scene transition: " + this.currentId + " → " + targetId);
    }

    const targetSpawn = this.getSpawn(target, targetSpawnKey);
    const previousSpawn = {
      x: this.controller.player.x,
      z: this.controller.player.z,
      yaw: this.controller.player.yaw,
      pitch: this.controller.player.pitch
    };

    this.state.transitioning = true;
    let worldSwitched = false;

    try {
      await door.animateOpen(650);
      await this.fade(true);

      source.group.visible = false;
      target.group.visible = true;
      // Mark the switch before mutating controller data so a partial failure
      // also restores scene visibility and the active collision world.
      worldSwitched = true;
      this.setLocationWorld(target);

      if (!this.controller.setSpawn(targetSpawn)) {
        throw new Error("Target spawn '" + targetSpawnKey + "' is blocked in location: " + targetId);
      }

      this.currentId = targetId;
      this.onChange(targetId, target);
      door.reset();
      await this.fade(false);
      return true;
    } catch (error) {
      door.reset();
      if (worldSwitched) {
        target.group.visible = false;
        source.group.visible = true;
        this.setLocationWorld(source);
        this.controller.setSpawn(previousSpawn);
        this.currentId = source.id;
        this.onChange(source.id, source);
      }
      if (this.fadeElement?.classList.contains("is-visible")) {
        await this.fade(false);
      } else {
        this.fadeElement?.classList.remove("is-visible");
      }
      throw error;
    } finally {
      this.state.transitioning = false;
    }
  }

  fade(visible) {
    if (!this.fadeElement) return Promise.resolve();
    this.fadeElement.classList.toggle("is-visible", visible);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 0 : 230));
  }

  dispose() {
    for (const location of this.locations.values()) {
      location.group.traverse(object => {
        if (!object.isMesh) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose?.();
      });
      this.root.remove(location.group);
    }
    this.locations.clear();
  }
}
