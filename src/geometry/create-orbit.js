import { meshData } from './mesh-data.js';

/*
  Generate the vertex data for a circular orbit
*/

export function createOrbit(segments = 180) {
  const positions = [];
  const colors = [];
  const indices = [];

  // draw a circle
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;

    positions.push(Math.cos(angle), 0, Math.sin(angle));
    colors.push(1, 1, 1); // white orbit
    indices.push(i);
  }

  return meshData(positions, colors, indices);
}
