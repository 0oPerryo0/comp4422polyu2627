import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Mat4, Vec3 } from '../src/math.js';

function near(actual, expected, epsilon = 1e-5) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < epsilon,
    `component ${i}: expected ${expected[i]}, got ${value}`));
}

test('Vec3 addition, subtraction, scaling and dot product', () => {
  const a = Vec3.create(1, 2, 3);
  const b = Vec3.create(4, -2, 1);
  near(Vec3.add(a, b), [5, 0, 4]);
  near(Vec3.subtract(a, b), [-3, 4, 2]);
  near(Vec3.scale(a, 2), [2, 4, 6]);
  assert.equal(Vec3.dot(a, b), 3);
  near(a, [1, 2, 3]);
});

test('Vec3 cross product uses a right-handed coordinate system', () => {
  near(Vec3.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  near(Vec3.cross([0, 1, 0], [1, 0, 0]), [0, 0, -1]);
});

test('Vec3 normalization and zero-vector guard', () => {
  near(Vec3.normalize([3, 0, 4]), [0.6, 0, 0.8]);
  assert.equal(Vec3.length([3, 0, 4]), 5);
  assert.throws(() => Vec3.normalize([0, 0, 0]), /zero-length/);
});

test('identity and translation distinguish points from directions', () => {
  near(Mat4.transform(Mat4.identity(), [1, 2, 3]), [1, 2, 3, 1]);
  near(Mat4.transform(Mat4.translation(4, 5, 6), [1, 2, 3]), [5, 7, 9, 1]);
  near(Mat4.transform(Mat4.translation(4, 5, 6), [1, 2, 3], 0), [1, 2, 3, 0]);
});

test('translation × scale applies scale before translation', () => {
  const model = Mat4.multiply(Mat4.translation(10, 20, 30), Mat4.scaling(2, 3, 4));
  near(Mat4.transform(model, [1, 1, 1]), [12, 23, 34, 1]);
  const reversed = Mat4.multiply(Mat4.scaling(2, 3, 4), Mat4.translation(10, 20, 30));
  near(Mat4.transform(reversed, [1, 1, 1]), [22, 63, 124, 1]);
});

test('axis rotations have the expected signs', () => {
  near(Mat4.transform(Mat4.rotationX(Math.PI / 2), [0, 1, 0]), [0, 0, 1, 1]);
  near(Mat4.transform(Mat4.rotationY(Math.PI / 2), [0, 0, 1]), [1, 0, 0, 1]);
  near(Mat4.transform(Mat4.rotationZ(Math.PI / 2), [1, 0, 0]), [0, 1, 0, 1]);
});

test('matrix multiplication preserves identity on both sides', () => {
  const m = Mat4.multiply(Mat4.translation(1, 2, 3), Mat4.rotationY(0.7));
  near(Mat4.multiply(m, Mat4.identity()), m);
  near(Mat4.multiply(Mat4.identity(), m), m);
});

test('lookAt maps the eye to origin and target onto negative Z', () => {
  const eye = Vec3.create(3, 4, 5);
  const target = Vec3.create(0, 0, 0);
  const view = Mat4.lookAt(eye, target);
  near(Mat4.transform(view, eye), [0, 0, 0, 1]);
  near(Mat4.transform(view, target), [0, 0, -Math.sqrt(50), 1]);
});

test('lookAt rejects degenerate camera directions', () => {
  assert.throws(() => Mat4.lookAt([0, 0, 0], [0, 0, 0]), /zero-length/);
  assert.throws(() => Mat4.lookAt([0, 1, 0], [0, 0, 0], [0, 1, 0]), /zero-length/);
});

test('perspective maps near and far planes to NDC -1 and +1', () => {
  const projection = Mat4.perspective(Math.PI / 2, 2, 0.1, 100);
  const nearPoint = Mat4.transform(projection, [0, 0, -0.1]);
  const farPoint = Mat4.transform(projection, [0, 0, -100]);
  assert.ok(Math.abs(nearPoint[2] / nearPoint[3] + 1) < 1e-5);
  assert.ok(Math.abs(farPoint[2] / farPoint[3] - 1) < 1e-5);
  const edge = Mat4.transform(projection, [2, 1, -1]);
  near([edge[0] / edge[3], edge[1] / edge[3]], [1, 1]);
});

test('perspective rejects invalid frustums', () => {
  for (const args of [[0, 1, 0.1, 100], [Math.PI, 1, 0.1, 100], [1, 0, 0.1, 100], [1, 1, 0, 100], [1, 1, 10, 1]]) {
    assert.throws(() => Mat4.perspective(...args), /frustum/);
  }
});

test('full MVP places an object at the center of the view', () => {
  const model = Mat4.translation(2, 0, 0);
  const view = Mat4.lookAt([2, 0, 10], [2, 0, 0]);
  const projection = Mat4.perspective(Math.PI / 3, 1.5, 0.1, 100);
  const mvp = Mat4.multiply(projection, Mat4.multiply(view, model));
  const clip = Mat4.transform(mvp, [0, 0, 0]);
  near([clip[0] / clip[3], clip[1] / clip[3]], [0, 0]);
  assert.ok(clip[2] / clip[3] > -1 && clip[2] / clip[3] < 1);
});
