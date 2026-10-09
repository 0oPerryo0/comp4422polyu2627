import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseOBJ } from '../src/obj-loader.js';
import { Vec3 } from '../src/math.js';

const vertices = 'v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\n';

test('OBJ triangle parses into indexed buffers', () => {
  const mesh = parseOBJ(`${vertices}f 1 2 3`);
  assert.deepEqual([...mesh.indices], [0, 1, 2]);
  assert.equal(mesh.positions.length, 9);
  assert.equal(mesh.sourceVertexCount, 4);
});

test('OBJ convex quad is fan-triangulated and shares vertices', () => {
  const mesh = parseOBJ(`${vertices}f 1 2 3 4`);
  assert.deepEqual([...mesh.indices], [0, 1, 2, 0, 2, 3]);
  assert.equal(mesh.positions.length / 3, 4);
  assert.equal(mesh.faceCount, 1);
});

test('OBJ handles negative indices, tabs, comments and CRLF', () => {
  const mesh = parseOBJ(`${vertices}f\t-4 -3 -2 -1 # quad\r\n`);
  assert.deepEqual([...mesh.indices], [0, 1, 2, 0, 2, 3]);
});

test('OBJ resolves position, UV, and normal indices into unique vertices', () => {
  const text = `${vertices}vt 0 0\nvt 1 0\nvn 0 0 1\nf 1/1/1 2/1/1 3/1/1\nf 1/2/1 3/1/1 4/1/1`;
  const mesh = parseOBJ(text);
  assert.equal(mesh.positions.length / 3, 5);
  assert.equal(mesh.uvs[6], 1);
  assert.deepEqual([...mesh.indices], [0, 1, 2, 3, 2, 4]);
  assert.deepEqual([...mesh.normals.subarray(0, 3)], [0, 0, 1]);
});

test('OBJ supports v//vn and negative normal indices', () => {
  const mesh = parseOBJ(`${vertices}vn 0 0 1\nf 1//-1 2//-1 3//-1`);
  assert.deepEqual([...mesh.normals.subarray(0, 3)], [0, 0, 1]);
});

test('OBJ duplicates complete vertices at group-color boundaries', () => {
  const mesh = parseOBJ(`${vertices}g hull\nf 1 2 3\ng cockpit\nf 1 3 4`);
  assert.equal(mesh.positions.length / 3, 6);
  assert.notDeepEqual([...mesh.colors.subarray(0, 3)], [...mesh.colors.subarray(9, 12)]);
});

test('OBJ rejects malformed and out-of-range indices', () => {
  for (const face of ['f 0 2 3', 'f 1 2 5', 'f -5 2 3', 'f 1x 2 3', 'f 1 2', 'f 1/1 2/1 3/1']) {
    assert.throws(() => parseOBJ(vertices + face), /OBJ line/);
  }
  assert.throws(() => parseOBJ('v not-a-number 0 0\nf 1 1 1'), /coordinates/);
  assert.throws(() => parseOBJ(vertices), /no drawable faces/);
});

test('original Surveyor OBJ is valid and contains shared indexed geometry', async () => {
  const text = await readFile(new URL('../assets/models/surveyor.obj', import.meta.url), 'utf8');
  const mesh = parseOBJ(text);
  assert.equal(mesh.sourceVertexCount, 41);
  assert.equal(mesh.faceCount, 31);
  assert.equal(mesh.indices.length, 174);
  assert.ok(mesh.positions.length / 3 < mesh.indices.length);
  assert.ok(mesh.indices.every(index => index < mesh.positions.length / 3));
  assert.ok(mesh.positions.every(Number.isFinite));
});

test('all spacecraft component faces point outward', async () => {
  const text = await readFile(new URL('../assets/models/surveyor.obj', import.meta.url), 'utf8');
  const points = [];
  let group;
  for (const line of text.split('\n')) {
    const [command, ...values] = line.trim().split(/\s+/);
    if (command === 'v') points.push(values.map(Number));
    if (command === 'g') group = values[0];
    if (command !== 'f') continue;
    const face = values.map(value => points[Number(value) - 1]);
    const centroid = Vec3.scale(face.reduce((sum, point) => Vec3.add(sum, point), Vec3.create()), 1 / face.length);
    const centers = { hull: [0, 0, -0.15], nose: [0, 0, -1.25], cockpit: [0, 0.38, -0.3], engine: [0, 0, 0.895] };
    const center = group === 'panels' ? [Math.sign(centroid[0]) * 1.325, 0.005, -0.1] : centers[group];
    const normal = Vec3.cross(Vec3.subtract(face[1], face[0]), Vec3.subtract(face[2], face[0]));
    assert.ok(Vec3.dot(normal, Vec3.subtract(centroid, center)) > 0, `${group}: ${line}`);
  }
});
