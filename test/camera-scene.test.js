import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vec3, Mat4 } from '../src/math/index.js';
import { createSolarSystem, OrbitCamera } from '../src/scene/index.js';
import { ObjectKind } from '../src/consts/index.js';

function cameraWithoutDOM() {
  const camera = Object.create(OrbitCamera.prototype);
  camera.canvas = { clientWidth: 1200, clientHeight: 800 };
  camera.fieldOfView = (55 * Math.PI) / 180;
  camera.near = 0.1;
  camera.far = 500;
  camera.keys = new Set();
  camera.reset();
  return camera;
}

test('camera starts at the stated distance and looks at its target', () => {
  const camera = cameraWithoutDOM();
  assert.ok(Math.abs(Vec3.length(camera.eye) - camera.distance) < 1e-4);
  const target = Mat4.transform(camera.view, camera.target);
  assert.ok(Math.abs(target[0]) < 1e-4 && Math.abs(target[1]) < 1e-4);
  assert.ok(target[2] < 0);
});

test('camera focus, orbit clamps, zoom clamps and reset', () => {
  const camera = cameraWithoutDOM();
  const mockBody = { position: [10, 0, 4], radius: 1 };
  camera.focus(mockBody);
  assert.deepEqual([...camera.target], [10, 0, 4]);
  assert.equal(camera.distance, 6);
  camera.orbit(0, 1e6);
  assert.equal(camera.pitch, 1.35);
  camera.orbit(0, -1e6);
  assert.equal(camera.pitch, -1.35);
  camera.zoom(-100);
  assert.equal(camera.distance, camera.minDistance);
  camera.zoom(100);
  assert.equal(camera.distance, camera.maxDistance);
  camera.reset();
  assert.deepEqual([...camera.target], [0, 0, 0]);
  assert.equal(camera.distance, 130);
});

test('camera pan translates target while keeping eye distance fixed', () => {
  const camera = cameraWithoutDOM();
  camera.pan(50, 20);
  assert.ok(Vec3.length(camera.target) > 0);
  assert.ok(
    Math.abs(Vec3.length(Vec3.subtract(camera.eye, camera.target)) - 130) < 1e-4,
  );
});

test('keyboard camera movement is time-based', () => {
  const a = cameraWithoutDOM();
  const b = cameraWithoutDOM();
  a.keys.add('ArrowLeft');
  b.keys.add('ArrowLeft');
  a.update(1 / 30);
  b.update(1 / 60);
  b.update(1 / 60);
  assert.ok(Math.abs(a.yaw - b.yaw) < 1e-6);
});

test('portrait projection preserves horizontal framing', () => {
  const camera = cameraWithoutDOM();
  const square = camera.projection(1);
  const portrait = camera.projection(0.5);
  assert.ok(Math.abs(square[0] - portrait[0]) < 1e-6);
  assert.ok(Math.abs(portrait[5] * 2 - square[5]) < 1e-6);
  assert.ok(camera.verticalFieldOfView(0.5) > camera.fieldOfView);
});

test('scene has eight planets, the Moon, and a loaded OBJ instance', () => {
  // M3: createSolarSystem returns { root, bodies, orbitNodes }, not a bare array.
  const scene = createSolarSystem();
  const bodies = scene.bodies;
  assert.equal(bodies.length, 11);
  assert.equal(
    bodies.filter((body) => body.kind === ObjectKind.PLANET).length,
    8,
  );
  assert.equal(
    bodies.find((body) => body.id === 'surveyor').mesh,
    'spacecraft',
  );
  for (const body of bodies) {
    // Position is filled each frame by update-solar-system.js; on creation it's [0,0,0].
    assert.ok(Array.isArray(body.position));
    assert.equal(body.position.length, 3);
  }
});