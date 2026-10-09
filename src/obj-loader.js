import { meshData } from './geometry.js';

const groupColors = {
  hull: [0.77, 0.84, 0.9],
  nose: [0.94, 0.95, 0.97],
  cockpit: [0.19, 0.72, 0.83],
  panels: [0.16, 0.3, 0.59],
  engine: [0.94, 0.57, 0.26],
};

export function parseOBJ(text) {
  const sourcePositions = [];
  const sourceUVs = [];
  const sourceNormals = [];
  const positions = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const vertices = new Map();
  let group = 'hull';
  let faceCount = 0;

  const resolveIndex = (token, source, label, line) => {
    if (!/^-?\d+$/.test(token)) throw new Error(`OBJ line ${line}: invalid ${label} index.`);
    const value = Number(token);
    const index = value > 0 ? value - 1 : source.length + value;
    if (value === 0 || index < 0 || index >= source.length) {
      throw new Error(`OBJ line ${line}: ${label} index is out of range.`);
    }
    return index;
  };

  for (const [lineIndex, rawLine] of text.split(/\r?\n/).entries()) {
    const line = lineIndex + 1;
    const clean = rawLine.split('#')[0].trim();
    if (!clean) continue;
    const [command, ...values] = clean.split(/\s+/);
    if (command === 'v' || command === 'vt' || command === 'vn') {
      const count = command === 'vt' ? 2 : 3;
      const components = values.slice(0, count).map(Number);
      if (components.length !== count || !components.every(Number.isFinite)) {
        throw new Error(`OBJ line ${line}: invalid ${command} coordinates.`);
      }
      const source = command === 'v' ? sourcePositions : command === 'vt' ? sourceUVs : sourceNormals;
      source.push(components);
    } else if (command === 'g') {
      group = values[0] ?? 'hull';
    } else if (command === 'f') {
      if (values.length < 3) throw new Error(`OBJ line ${line}: a face needs at least 3 vertices.`);
      const face = values.map(reference => {
        const parts = reference.split('/');
        if (parts.length > 3) throw new Error(`OBJ line ${line}: invalid face reference.`);
        const position = resolveIndex(parts[0], sourcePositions, 'position', line);
        const uv = parts[1] ? resolveIndex(parts[1], sourceUVs, 'UV', line) : -1;
        const normal = parts[2] ? resolveIndex(parts[2], sourceNormals, 'normal', line) : -1;
        const key = `${position}/${uv}/${normal}/${group}`;
        if (!vertices.has(key)) {
          vertices.set(key, positions.length / 3);
          positions.push(...sourcePositions[position]);
          colors.push(...(groupColors[group] ?? groupColors.hull));
          uvs.push(...(uv < 0 ? [0, 0] : sourceUVs[uv]));
          normals.push(...(normal < 0 ? [0, 0, 0] : sourceNormals[normal]));
        }
        return vertices.get(key);
      });
      for (let i = 1; i < face.length - 1; i++) indices.push(face[0], face[i], face[i + 1]);
      faceCount++;
    }
  }
  if (!indices.length) throw new Error('OBJ contains no drawable faces.');
  const result = meshData(positions, colors, indices, normals, uvs);
  result.sourceVertexCount = sourcePositions.length;
  result.faceCount = faceCount;
  return result;
}

export async function loadOBJ(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load OBJ (${response.status}): ${url}`);
  return parseOBJ(await response.text());
}
