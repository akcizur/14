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

  activate(id) {
    const location = this.locations.get(id);
    if (!location) throw new Error("Unknown location: " + id);
    for (const entry of this.locations.values()) entry.group.visible = entry.id === id;
    this.controller.setWorld({
      colliders: location.colliders,
      interactables: location.interactables,
      navigation: location.navigation
    });
    if (!this.controller.setSpawn(location.spawn)) throw new Error("Invalid or obstructed spawn for location: " + id);
    this.currentId = id;
    this.onChange(id, location);
    return location;
  }

  async transition(targetId, sourceDoorId) {
    if (this.state.transitioning || this.state.paused) return false;
    const source = this.locations.get(this.currentId);
    const target = this.locations.get(targetId);
    const door = source?.doors?.[sourceDoorId];
    if (!source || !target || !door) throw new Error("Invalid scene transition: " + this.currentId + " → " + targetId);

    this.state.transitioning = true;
    try {
      await door.animateOpen(650);
      await this.fade(true);
      door.reset();
      source.group.visible = false;
      target.group.visible = true;
      this.controller.setWorld({
        colliders: target.colliders,
        interactables: target.interactables,
        navigation: target.navigation
      });

      if (!this.controller.setSpawn(target.spawn)) {
        target.group.visible = false;
        source.group.visible = true;
        this.controller.setWorld({
          colliders: source.colliders,
          interactables: source.interactables,
          navigation: source.navigation
        });
        this.controller.setSpawn(source.spawn);
        throw new Error("Target spawn is blocked: " + targetId);
      }

      this.currentId = targetId;
      this.onChange(targetId, target);
      await this.fade(false);
      return true;
    } catch (error) {
      door.reset();
      this.fadeElement?.classList.remove("is-visible");
      throw error;
    } finally {
      this.state.transitioning = false;
    }
  }

  fade(visible) {
    if (!this.fadeElement) return Promise.resolve();
    this.fadeElement.classList.toggle("is-visible", visible);
    return new Promise(resolve => window.setTimeout(resolve, 230));
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
