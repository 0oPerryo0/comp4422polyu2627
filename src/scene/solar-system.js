import { Mat4, Vec3 } from '../math/index.js';

/*
  information about the planets
*/
const planetDefinitions = [
  ['mercury', 'Mercury', 0.32, 4.4, 2.8, [0.65, 0.61, 0.56]],
  ['venus', 'Venus', 0.54, 6.6, 1.1, [0.92, 0.74, 0.43]],
  ['earth', 'Earth', 0.68, 9.2, 0.35, [0.3, 0.65, 0.94]],
  ['mars', 'Mars', 0.46, 12.1, -1.2, [0.88, 0.38, 0.23]],
  ['jupiter', 'Jupiter', 1.7, 17.2, 2.0, [0.88, 0.71, 0.53]],
  ['saturn', 'Saturn', 1.35, 23, -0.85, [0.88, 0.79, 0.55]],
  ['uranus', 'Uranus', 0.96, 29, -2.0, [0.49, 0.81, 0.84]],
  ['neptune', 'Neptune', 0.92, 35.5, 2.75, [0.32, 0.47, 0.9]],
];

/*
  Create and return the data for all the bodies in the solar system

  including: planets, spacecraft, moon, sun, and stars.
*/
export function createSolarSystem() {
  const bodies = [
    {
      id: 'sun',
      name: 'Sun',
      kind: 'STAR',
      radius: 2.2,
      position: Vec3.create(),
      tint: [1, 0.72, 0.3],
      description:
        'The center of our scene. This sphere uses vertex colors, not a light source yet.',
    },
  ];

  // add the planets to the solar system bodies
  for (const [
    id,
    name,
    radius,
    orbitRadius,
    angle,
    tint,
  ] of planetDefinitions) {
    bodies.push({
      id,
      name,
      kind: 'PLANET',
      radius,
      orbitRadius,
      tint,
      position: Vec3.create(
        orbitRadius * Math.cos(angle),
        0,
        orbitRadius * Math.sin(angle),
      ),
      description:
        'An instance of the shared indexed sphere mesh. Its model matrix sets its position and size.',
    });
  }

  const earth = bodies.find((body) => body.id === 'earth');

  // add the moon, relative to the earth's location
  bodies.push({
    id: 'moon',
    name: 'Moon',
    kind: 'SATELLITE',
    radius: 0.22,
    position: Vec3.add(earth.position, Vec3.create(1.45, 0.12, 0.7)),
    tint: [0.75, 0.79, 0.84],
    description:
      'A separate sphere beside Earth. Parent–child orbital animation is reserved for M3.',
  });

  // addthe spacecraft relative to the earth's position
  bodies.push({
    id: 'surveyor',
    name: 'Surveyor',
    kind: 'LOADED OBJ',
    radius: 1.8,
    position: Vec3.add(earth.position, Vec3.create(-1.4, 1.8, 3.7)),
    tint: [1, 1, 1],
    mesh: 'spacecraft',
    description:
      'An original low-poly spacecraft loaded from assets/models/surveyor.obj and drawn with an index buffer.',
  });

  for (const body of bodies) {
    const translation = Mat4.translation(...body.position);
    body.model =
      body.mesh === 'spacecraft'
        ? Mat4.multiply(
            translation,
            Mat4.multiply(Mat4.rotationY(-0.65), Mat4.scaling(0.7)),
          )
        : Mat4.multiply(translation, Mat4.scaling(body.radius));
  }

  return bodies;
}
