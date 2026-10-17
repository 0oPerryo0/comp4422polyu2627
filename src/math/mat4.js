import { Vec3 } from './vec3.js';

export const Mat4 = {
  // column major order
  identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  // multiply two matrices
  multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 4; k++) {
          result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
        }
      }
    }
    return result;
  },

  // returns the translated result
  translation(x, y, z) {
    const result = Mat4.identity();
    result[12] = x;
    result[13] = y;
    result[14] = z;
    return result;
  },

  // returns the scaled result
  scaling(x, y = x, z = x) {
    const result = Mat4.identity();
    result[0] = x;
    result[5] = y;
    result[10] = z;
    return result;
  },

  // returns the rotated result (rotates on the x-axis)
  rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },

  // returns the rotated result (rotates on the y-axis)
  rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },

  // returns the rotated result (rotates on the z-axis)
  rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },

  // creates projection for the camera
  perspective(fieldOfView, aspect, near, far) {
    if (
      !(
        fieldOfView > 0 &&
        fieldOfView < Math.PI &&
        aspect > 0 &&
        near > 0 &&
        far > near
      )
    ) {
      throw new Error('Invalid perspective frustum.');
    }
    const f = 1 / Math.tan(fieldOfView / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (far + near) * range,
      -1,
      0,
      0,
      2 * far * near * range,
      0,
    ]);
  },

  // positions the camera
  lookAt(eye, target, up = Vec3.create(0, 1, 0)) {
    const backward = Vec3.normalize(Vec3.subtract(eye, target));
    const right = Vec3.normalize(Vec3.cross(up, backward));
    const cameraUp = Vec3.cross(backward, right);
    return new Float32Array([
      right[0],
      cameraUp[0],
      backward[0],
      0,
      right[1],
      cameraUp[1],
      backward[1],
      0,
      right[2],
      cameraUp[2],
      backward[2],
      0,
      -Vec3.dot(right, eye),
      -Vec3.dot(cameraUp, eye),
      -Vec3.dot(backward, eye),
      1,
    ]);
  },

  // apply transformation to point v
  transform(m, v, w = 1) {
    return new Float32Array([
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w,
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w,
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w,
      m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * w,
    ]);
  },
};
