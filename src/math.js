export const Vec3 = {
  create(x = 0, y = 0, z = 0) {
    return new Float32Array([x, y, z]);
  },
  add(a, b) {
    return Vec3.create(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
  },
  subtract(a, b) {
    return Vec3.create(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  },
  scale(v, amount) {
    return Vec3.create(v[0] * amount, v[1] * amount, v[2] * amount);
  },
  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
  cross(a, b) {
    return Vec3.create(
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    );
  },
  length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  },
  normalize(v) {
    const length = Vec3.length(v);
    if (length < 1e-8) throw new Error('Cannot normalize a zero-length vector.');
    return Vec3.scale(v, 1 / length);
  },
};

export const Mat4 = {
  identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  },
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
  translation(x, y, z) {
    const result = Mat4.identity();
    result[12] = x;
    result[13] = y;
    result[14] = z;
    return result;
  },
  scaling(x, y = x, z = x) {
    const result = Mat4.identity();
    result[0] = x;
    result[5] = y;
    result[10] = z;
    return result;
  },
  rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ]);
  },
  rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ]);
  },
  rotationZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  },
  perspective(fieldOfView, aspect, near, far) {
    if (!(fieldOfView > 0 && fieldOfView < Math.PI && aspect > 0 && near > 0 && far > near)) {
      throw new Error('Invalid perspective frustum.');
    }
    const f = 1 / Math.tan(fieldOfView / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * range, -1,
      0, 0, 2 * far * near * range, 0,
    ]);
  },
  lookAt(eye, target, up = Vec3.create(0, 1, 0)) {
    const backward = Vec3.normalize(Vec3.subtract(eye, target));
    const right = Vec3.normalize(Vec3.cross(up, backward));
    const cameraUp = Vec3.cross(backward, right);
    return new Float32Array([
      right[0], cameraUp[0], backward[0], 0,
      right[1], cameraUp[1], backward[1], 0,
      right[2], cameraUp[2], backward[2], 0,
      -Vec3.dot(right, eye), -Vec3.dot(cameraUp, eye), -Vec3.dot(backward, eye), 1,
    ]);
  },
  transform(m, v, w = 1) {
    return new Float32Array([
      m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w,
      m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w,
      m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w,
      m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * w,
    ]);
  },
};
