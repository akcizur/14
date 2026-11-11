export const DEFAULT_ROOF_PITCH = 0.34;

/**
 * Returns a symmetric gable-roof layout for a house whose ridge runs along X
 * and whose roof slopes across Z. The panel depth is measured along the roof
 * plane; its horizontal projection includes the eave overhang exactly.
 */
export function createGableRoofLayout({
  centerZ,
  halfDepth,
  wallHeight,
  pitch = DEFAULT_ROOF_PITCH,
  panelOverhang = 0.8
}) {
  if (![centerZ, halfDepth, wallHeight, pitch, panelOverhang].every(Number.isFinite)) {
    throw new TypeError("Roof dimensions must be finite numbers.");
  }
  if (halfDepth <= 0 || wallHeight <= 0 || pitch <= 0 || pitch >= Math.PI / 2 || panelOverhang < 0) {
    throw new RangeError("Invalid gable roof dimensions or pitch.");
  }

  const cosPitch = Math.cos(pitch);
  const panelOffset = (halfDepth + panelOverhang) / 2;
  const panelLength = (halfDepth + panelOverhang) / cosPitch;
  const panelCenterY = wallHeight + Math.tan(pitch) * (halfDepth - panelOffset);
  const ridgeY = wallHeight + Math.tan(pitch) * halfDepth;

  return {
    pitch,
    eaveY: wallHeight,
    ridgeY,
    panels: [
      {
        side: -1,
        centerZ: centerZ - panelOffset,
        centerY: panelCenterY,
        rotationX: -pitch,
        depth: panelLength
      },
      {
        side: 1,
        centerZ: centerZ + panelOffset,
        centerY: panelCenterY,
        rotationX: pitch,
        depth: panelLength
      }
    ]
  };
}
