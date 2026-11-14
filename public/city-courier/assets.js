// Resolves the external GLB manifest before the game starts.
window.COURIER_ASSETS_READY = fetch("./assets/manifest.json", { cache: "no-cache" })
  .then(response => {
    if (!response.ok) throw new Error("Model manifest HTTP " + response.status);
    return response.json();
  })
  .then(manifest => {
    if (!manifest || typeof manifest !== "object" || Object.keys(manifest).length !== 32) {
      throw new Error("Invalid City Courier model manifest.");
    }
    return manifest;
  });
