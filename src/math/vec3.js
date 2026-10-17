export const Vec3 = {
  // create a new vector
  create(x = 0, y = 0, z = 0) {
    return new Float32Array([x, y, z]);
  },

  // add two vectors, return result
  add(a, b) {
    return Vec3.create(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
  },

  // subtract two vectors, return result
  subtract(a, b) {
    return Vec3.create(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  },

  // scale vector, return new vector
  scale(v, amount) {
    return Vec3.create(v[0] * amount, v[1] * amount, v[2] * amount);
  },

  // dot product two vectors, return result
  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  // cross product two vectors, return result
  cross(a, b) {
    return Vec3.create(
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    );
  },

  // returns the length of a vector
  length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  },

  // convert vector to unit vector
  normalize(v) {
    const length = Vec3.length(v);
    if (length < 1e-8)
      throw new Error('Cannot normalize a zero-length vector.');
    return Vec3.scale(v, 1 / length);
  },
};
