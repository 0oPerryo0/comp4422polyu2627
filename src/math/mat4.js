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

  // returns the transposed matrix
  transpose(m) {
    return new Float32Array([
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15],
    ]);
  },

  // returns the inverted matrix
  invert(m) {
    const out = new Float32Array(16);
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  },
};