import { meshData } from './mesh-data.js';

/*
  Three-layer starfield on a large spherical shell around the origin.
  Stars are drawn as points with additive blending, so:
    - dust stars fill the empty space
    - mid stars read as normal stars
    - bright heroes give the sky depth and "landmark" points

  The shell radius (450) is chosen to sit inside the camera's far plane (500)
  but well outside the planet orbits (max ~72), so the field acts as a
  fixed background from any camera position.
*/
export function createStars(count = 4500) {
  const positions = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const dustCount = Math.floor(count * 0.85);
  const midCount = Math.floor(count * 0.12);
  const brightCount = count - dustCount - midCount;

  function pushStar(brightness, tint) {
    // Uniform point on a sphere (Marsaglia's method).
    const u = Math.random() * 2 - 1;
    const v = Math.random();
    const theta = 2 * Math.PI * v;
    const s = Math.sqrt(1 - u * u);
    const R = 450;

    const x = R * s * Math.cos(theta);
    const y = R * u;
    const z = R * s * Math.sin(theta);

    positions.push(x, y, z);
    colors.push(
      brightness * tint[0],
      brightness * tint[1],
      brightness * tint[2],
    );
    normals.push(0, 0, 0);
    uvs.push(0, 0);
  }

  // Dust: cold blue-white, very dim.
  for (let i = 0; i < dustCount; i++) {
    pushStar(0.22 + Math.random() * 0.18, [0.85, 0.92, 1.0]);
  }
  // Mid: neutral white.
  for (let i = 0; i < midCount; i++) {
    pushStar(0.70 + Math.random() * 0.25, [1.0, 1.0, 1.0]);
  }
  // Bright heroes: warm-white, brightest.
  for (let i = 0; i < brightCount; i++) {
    pushStar(1.30 + Math.random() * 0.45, [1.0, 0.95, 0.82]);
  }

  // Points use one index per vertex.
  for (let i = 0; i < positions.length / 3; i++) indices.push(i);

  return meshData(positions, colors, indices, normals, uvs);
}