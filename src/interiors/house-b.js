import { buildEmptyInterior } from "../world/interior-builder.js";
export function buildHouseB({ onExit } = {}) {
  return buildEmptyInterior({
    id: "houseB", centerZ: 17, frontSide: -1,
    wallColor: 0xc6ceca, floorColor: 0x858c88,
    doorColor: 0x536d69, streetSpawnKey: "outsideHouseB", onExit
  });
}
