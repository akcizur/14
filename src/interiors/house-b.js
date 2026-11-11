import { buildEmptyInterior } from "../world/interior-builder.js";

export function buildHouseB({ onExit, seed = null } = {}) {
  return buildEmptyInterior({
    id: "houseB",
    planId: "houseB",
    seed,
    centerZ: 17,
    frontSide: -1,
    streetSpawnKey: "outsideHouseB",
    onExit
  });
}
