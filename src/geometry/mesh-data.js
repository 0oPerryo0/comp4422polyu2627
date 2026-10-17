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
