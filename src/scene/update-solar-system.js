import { Mat4 } from '../math/index.js';

/*
  Create and update transformations about objects posiitons overtime

  including: planets, moon, and spacecraft.
*/

export function updateSolarSystem(bodies, time) {
  const t = time * 0.001;
  const earth = bodies.find((body) => body.id === 'earth');

  for (const body of bodies) {
    if (body.id == 'sun') continue;

    const angle = body.angle + t * body.speed;

    body.position[0] = body.orbitRadius * Math.sin(angle);
    body.position[2] = body.orbitRadius * Math.cos(angle);

    if (body.id === 'moon') {
      body.position[0] += earth.position[0];
      body.position[2] += earth.position[2];
    }

    // Recompute model matrix for this frame
    const translation = Mat4.translation(...body.position);
    body.model =
      body.mesh === 'spacecraft'
        ? Mat4.multiply(
            translation,
            Mat4.multiply(Mat4.rotationY(-0.65), Mat4.scaling(0.7)),
          )
        : Mat4.multiply(translation, Mat4.scaling(body.radius));
  }
}
