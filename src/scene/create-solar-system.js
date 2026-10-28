import { ObjectKind, PlanetDefinitions, MoonData, SpacecraftData } from '../consts/index.js';
import { Vec3, Mat4 } from '../math/index.js';
import { loadTexture } from '../loaders/texture-loader.js';

/*
  Create and return the data for all the bodies in the solar system

  including: planets, spacecraft, moon, sun, and stars.
*/

export function createSolarSystem(gl) {
  const bodies = [
    {
      id: 'sun',
      name: 'Sun',
      kind: ObjectKind.STAR,
      radius: 2.2,
      position: Vec3.create(),
      tint: [1, 0.72, 0.3],
      texture: loadTexture(gl, './assets/sun.jpg'),
      description: 'The center of our scene.',
    },
  ];

  for (const [id, name, radius, orbitRadius, angle, tint, speed, texture] of PlanetDefinitions) {
    bodies.push({
      id,
      name,
      kind: ObjectKind.PLANET,
      radius,
      orbitRadius,
      tint,
      speed,
      angle,
      texture: loadTexture(gl, texture),
      position: Vec3.create(orbitRadius * Math.cos(angle), 0, orbitRadius * Math.sin(angle)),
      description: 'An instance of the shared indexed sphere mesh.',
    });
  }

  const earth = bodies.find((body) => body.id === 'earth');

  bodies.push({
    id: 'moon',
    name: 'Moon',
    kind: ObjectKind.SATELLITE,
    radius: MoonData.RADIUS,
    orbitRadius: MoonData.ORBIT_RADIUS,
    speed: MoonData.SPEED,
    angle: 0,
    position: Vec3.add(earth.position, Vec3.create(MoonData.ORBIT_RADIUS, 0, 0)),
    tint: MoonData.TINT,
    texture: loadTexture(gl, MoonData.TEXTURE_URL),
    description: 'A separate sphere orbiting Earth.',
  });

  bodies.push({
    id: 'surveyor',
    name: 'Surveyor',
    kind: ObjectKind.LOADED_OBJ,
    radius: SpacecraftData.RADIUS,
    orbitRadius: SpacecraftData.ORBIT_RADIUS,
    speed: SpacecraftData.SPEED,
    angle: SpacecraftData.INITIAL_ANGLE,
    position: Vec3.add(earth.position, Vec3.create(-1.4, 1.8, 3.7)),
    tint: SpacecraftData.TINT,
    mesh: 'spacecraft',
    description: 'A low-poly spacecraft following Earth.',
  });

  for (const body of bodies) {
    const translation = Mat4.translation(...body.position);
    body.model =
      body.mesh === 'spacecraft'
        ? Mat4.multiply(translation, Mat4.multiply(Mat4.rotationY(-0.65), Mat4.scaling(0.7)))
        : Mat4.multiply(translation, Mat4.scaling(body.radius));
  }

  return bodies;
}
