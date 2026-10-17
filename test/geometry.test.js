import assert from 'node:assert/strict';
import { test } from 'node:test';
// import { createSphere, createOrbit, createStars } from "../src/geometry.js";
import { createStars } from '../src/geometry/create-stars.js';
import { createOrbit } from '../src/geometry/create-orbit.js';
import { createSphere } from '../src/geometry/create-sphere.js';
// import { Vec3 } from '../src/math.js';
import { Vec3 } from '../src/math/vec3.js';

function validate(data) {
  const count = data.positions.length / 3;
  assert.equal(data.colors.length, data.positions.length);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.colors.every(Number.isFinite));
  assert.ok(data.indices.every((index) => index >= 0 && index < count));
}

test('sphere is an indexed unit sphere with normals and UVs', () => {
  const sphere = createSphere(12, 18);
  validate(sphere);
  assert.equal(sphere.positions.length / 3, 13 * 19);
  assert.equal(sphere.indices.length, 12 * 18 * 6);
  assert.equal(sphere.normals.length, sphere.positions.length);
  assert.equal(sphere.uvs.length, 13 * 19 * 2);
  assert.ok(sphere.uvs.every((value) => value >= 0 && value <= 1));
  for (let i = 0; i < sphere.positions.length; i += 3) {
    assert.ok(
      Math.abs(Vec3.length(sphere.positions.subarray(i, i + 3)) - 1) < 1e-6,
    );
  }
});

test('sphere triangle winding faces outward for back-face culling', () => {
  const sphere = createSphere(12, 18);
  for (let i = 0; i < sphere.indices.length; i += 3) {
    const triangle = [...sphere.indices.subarray(i, i + 3)].map((index) =>
      sphere.positions.subarray(index * 3, index * 3 + 3),
    );
    const normal = Vec3.cross(
      Vec3.subtract(triangle[1], triangle[0]),
      Vec3.subtract(triangle[2], triangle[0]),
    );
    if (Vec3.length(normal) < 1e-7) continue; // Pole triangles can be degenerate.
    assert.ok(Vec3.dot(normal, triangle[0]) > 0);
  }
});

test('sphere duplicates the UV seam without opening the surface', () => {
  const sphere = createSphere(8, 12);
  for (let row = 0; row <= 8; row++) {
    const a = row * 13;
    const b = a + 12;
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(
        Math.abs(
          sphere.positions[a * 3 + axis] - sphere.positions[b * 3 + axis],
        ) < 1e-6,
      );
    }
    assert.equal(sphere.uvs[a * 2], 0);
    assert.equal(sphere.uvs[b * 2], 1);
  }
});

test('invalid sphere subdivisions are rejected', () => {
  assert.throws(() => createSphere(1, 3), /segments/);
  assert.throws(() => createSphere(8, 2), /segments/);
  assert.throws(() => createSphere(3.5, 12), /segments/);
});

test('large indexed sphere selects unsigned 32-bit indices', () => {
  const sphere = createSphere(256, 256);
  assert.ok(sphere.indices instanceof Uint32Array);
  validate(sphere);
});

test('orbit is an indexed unit circle in the XZ plane', () => {
  const orbit = createOrbit(100);
  validate(orbit);
  assert.equal(orbit.indices.length, 100);
  for (let i = 0; i < orbit.positions.length; i += 3) {
    assert.equal(orbit.positions[i + 1], 0);
    assert.ok(
      Math.abs(Vec3.length(orbit.positions.subarray(i, i + 3)) - 1) < 1e-6,
    );
  }
});

test('star geometry is deterministic and outside the system', () => {
  const stars = createStars(50);
  validate(stars);
  assert.deepEqual(stars, createStars(50));
  for (let i = 0; i < stars.positions.length; i += 3) {
    const radius = Vec3.length(stars.positions.subarray(i, i + 3));
    assert.ok(radius >= 209.99 && radius <= 240.01);
  }
});
