import { PlanetDefinitions } from './planet-definitions.js';

export const SpacecraftData = {
  RADIUS: 1.8,
  ORBIT_RADIUS: PlanetDefinitions[2][3] + 0.8,
  SPEED: PlanetDefinitions[2][6],
  INITIAL_ANGLE: PlanetDefinitions[2][4],
  TINT: [1, 1, 1],
  Y_OFFSET: 1.8,
};
