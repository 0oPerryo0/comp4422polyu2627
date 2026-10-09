export function createSphere(latitudeSegments = 32, longitudeSegments = 48) {
  if (!Number.isInteger(latitudeSegments) || !Number.isInteger(longitudeSegments)
    || latitudeSegments < 2 || longitudeSegments < 3) {
    throw new Error('A sphere needs at least 2 latitude and 3 longitude segments.');
  }
  const positions = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let latitude = 0; latitude <= latitudeSegments; latitude++) {
    const theta = latitude / latitudeSegments * Math.PI;
    for (let longitude = 0; longitude <= longitudeSegments; longitude++) {
      const phi = longitude / longitudeSegments * Math.PI * 2;
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.cos(theta);
      const z = Math.sin(theta) * Math.sin(phi);
      positions.push(x, y, z);
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

export function createOrbit(segments = 180) {
  const positions = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2;
    positions.push(Math.cos(angle), 0, Math.sin(angle));
    colors.push(1, 1, 1);
    indices.push(i);
  }
  return meshData(positions, colors, indices);
}

export function createStars(count = 650) {
  let seed = 4422;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = 210 + random() * 30;
    const horizontal = Math.sqrt(1 - y * y);
    positions.push(radius * horizontal * Math.cos(angle), radius * y, radius * horizontal * Math.sin(angle));
    const brightness = 0.25 + random() * 0.6;
    colors.push(brightness * 0.86, brightness * 0.92, brightness);
    indices.push(i);
  }
  return meshData(positions, colors, indices);
}

export function meshData(positions, colors, indices, normals = [], uvs = []) {
  const IndexArray = positions.length / 3 > 65536 ? Uint32Array : Uint16Array;
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new IndexArray(indices),
  };
}
