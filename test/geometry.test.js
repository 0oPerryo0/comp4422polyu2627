import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSphere } from '../src/geometry/create-sphere.js';
import { createOrbit } from '../src/geometry/create-orbit.js';
import { createStars } from '../src/geometry/create-stars.js';

// ---------------------------------------------------------------------------
// Small deterministic PRNG used to seed Math.random for the star test only.
// ---------------------------------------------------------------------------
function withSeededRandom(seed, fn) {
  const original = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  try { return fn(); }
  finally { Math.random = original; }
}

// ---------------------------------------------------------------------------
// Sphere
// ---------------------------------------------------------------------------
test('sphere is an indexed unit sphere with normals and UVs', () => {
  const sphere = createSphere(8, 12);
  const expectedVertices = (8 + 1) * (12 + 1);
  assert.equal(sphere.positions.length, expectedVertices * 3);
  assert.equal(sphere.normals.length, expectedVertices * 3);
  assert.equal(sphere.uvs.length, expectedVertices * 2);
  assert.equal(sphere.indices.length, 8 * 12 * 6);
  for (let i = 0; i < sphere.positions.length; i += 3) {
    const x = sphere.positions[i];
    const y = sphere.positions[i + 1];
    const z = sphere.positions[i + 2];
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-5);
  }
});

test('sphere triangle winding faces outward for back-face culling', () => {
  const sphere = createSphere(16, 24);
  let outwardCount = 0;
  let inwardCount = 0;
  for (let i = 0; i < sphere.indices.length; i += 3) {
    const a = sphere.indices[i];
    const b = sphere.indices[i + 1];
    const c = sphere.indices[i + 2];
    const ax = sphere.positions[a * 3], ay = sphere.positions[a * 3 + 1], az = sphere.positions[a * 3 + 2];
    const bx = sphere.positions[b * 3], by = sphere.positions[b * 3 + 1], bz = sphere.positions[b * 3 + 2];
    const cx = sphere.positions[c * 3], cy = sphere.positions[c * 3 + 1], cz = sphere.positions[c * 3 + 2];
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const cxAvg = (ax + bx + cx) / 3;
    const cyAvg = (ay + by + cy) / 3;
    const czAvg = (az + bz + cz) / 3;
    if (nx * cxAvg + ny * cyAvg + nz * czAvg > 0) outwardCount++;
    else inwardCount++;
  }
  // Majority of triangles must face outward. Degenerate pole triangles
  // (which collapse to zero area) are the reason this isn't 100%.
  assert.ok(outwardCount > inwardCount * 10,
    `Outward: ${outwardCount}, inward: ${inwardCount}`);
});

test('sphere duplicates the UV seam without opening the surface', () => {
  const sphere = createSphere(4, 8);
  const row = 8 + 1;
  for (let lat = 0; lat <= 4; lat++) {
    const left = (lat * row) * 2;
    const right = (lat * row + 8) * 2;
    assert.equal(sphere.uvs[left], 0);
    assert.equal(sphere.uvs[right], 1);
    assert.ok(Math.abs(sphere.positions[(lat * row) * 3] - sphere.positions[(lat * row + 8) * 3]) < 1e-5);
  }
});

test('invalid sphere subdivisions are rejected', () => {
  assert.throws(() => createSphere(1, 12));
  assert.throws(() => createSphere(8, 2));
  assert.throws(() => createSphere(8.5, 12));
});

test('large indexed sphere selects unsigned 32-bit indices', () => {
  // 65,536 vertices is the Uint16 cutoff. Use a sphere above it.
  const sphere = createSphere(256, 256);
  assert.ok(sphere.positions.length / 3 > 65536);
  assert.ok(sphere.indices instanceof Uint32Array);
});

// ---------------------------------------------------------------------------
// Orbit
// ---------------------------------------------------------------------------
test('orbit is an indexed unit circle in the XZ plane', () => {
  const orbit = createOrbit(64);
  assert.equal(orbit.positions.length, 64 * 3);
  for (let i = 0; i < orbit.positions.length; i += 3) {
    const x = orbit.positions[i];
    const y = orbit.positions[i + 1];
    const z = orbit.positions[i + 2];
    assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-5);
    assert.ok(Math.abs(y) < 1e-6);
  }
});

// ---------------------------------------------------------------------------
// Stars (deterministic via seeded Math.random)
// ---------------------------------------------------------------------------
test('star geometry is deterministic and outside the system', () => {
  const run = () => withSeededRandom(12345, () => createStars(50));
  const a = run();
  const b = run();

  // Seeded runs should produce identical data.
  assert.deepEqual(Array.from(a.positions), Array.from(b.positions));
  assert.deepEqual(Array.from(a.colors), Array.from(b.colors));
  assert.deepEqual(Array.from(a.indices), Array.from(b.indices));

  // Stars sit on a large shell (R = 450) far outside the planets.
  for (let i = 0; i < a.positions.length; i += 3) {
    const r = Math.hypot(a.positions[i], a.positions[i + 1], a.positions[i + 2]);
    assert.ok(Math.abs(r - 450) < 1e-3);
  }
});