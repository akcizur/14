import { buildEmptyInterior } from "../world/interior-builder.js";

export function buildHouseB({ onExit } = {}) {
  return buildEmptyInterior({
    id: "houseB",
    planId: "houseB",
    centerZ: 17,
    frontSide: -1,
    streetSpawnKey: "outsideHouseB",
    onExit
  });
}
