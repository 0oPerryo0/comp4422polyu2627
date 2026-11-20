import { meshData } from './mesh-data.js';

/*
  Generate the vertex data for a sphere
*/

export function createSphere(latitudeSegments = 32, longitudeSegments = 48) {
  if (
    !Number.isInteger(latitudeSegments) ||
    !Number.isInteger(longitudeSegments) ||
    latitudeSegments < 2 ||
    longitudeSegments < 3
  ) {
    throw new Error(
      'A sphere needs at least 2 latitude and 3 longitude segments.',
    );
  }
  const positions = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let latitude = 0; latitude <= latitudeSegments; latitude++) {
    const theta = (latitude / latitudeSegments) * Math.PI;
    for (let longitude = 0; longitude <= longitudeSegments; longitude++) {
      const phi = (longitude / longitudeSegments) * Math.PI * 2;
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.cos(theta);
      const z = Math.sin(theta) * Math.sin(phi);
      positions.push(x, y, z);

      // Normal is the normalized position for a unit sphere
      const nx = Math.sin(theta) * Math.cos(phi);
      const ny = Math.cos(theta);
      const nz = Math.sin(theta) * Math.sin(phi);
      normals.push(x, y, z);
      uvs.push(longitude / longitudeSegments, 1 - latitude / latitudeSegments);
      const tone = 0.68 + 0.32 * ((y + 1) / 2);
      colors.push(tone, tone, tone);
    }
  }

  const row = longitudeSegments + 1;
  for (let latitude = 0; latitude < latitudeSegments; latitude++) {
    for (let longitude = 0; longitude < longitudeSegments; longitude++) {
      const a = latitude * row + longitude;
      const b = a + row;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  return meshData(positions, colors, indices, normals, uvs);
}
