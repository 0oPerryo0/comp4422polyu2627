import { ObjectKind, PlanetDefinitions, MoonData, SpacecraftData } from '../consts/index.js';
import { Vec3, Mat4 } from '../math/index.js';
import { loadTexture } from '../loaders/texture-loader.js';
import { SceneNode } from './scene-node.js';

// Default optical class per planet so the demo shows all four at once.
//   0 = reflective, 1 = transmissive, 2 = absorbing, 3 = diffractive
const DEFAULT_OPTICAL = {
  mercury: 2,   // absorbing — dark rocky body
  venus: 1,   // transmissive — thick cloudy atmosphere
  earth: 0,   // reflective — oceans
  mars: 2,   // absorbing — dusty red surface
  jupiter: 3,   // diffractive — banded gas giant
  saturn: 3,   // diffractive — rings
  uranus: 1,   // transmissive — pale icy giant
  neptune: 1,   // transmissive — deep blue
  moon: 0,   // reflective — dusty grey
  surveyor: 0,  // reflective — metal hull
};

export function createSolarSystem(gl) {
  const root = new SceneNode('root');
  const bodies = [];
  const orbitNodes = [];

  // ---- Sun ----
  const sunBody = {
    id: 'sun',
    name: 'Sun',
    kind: ObjectKind.STAR,
    radius: 2.2,
    position: [0, 0, 0],
    tint: [1, 0.72, 0.3],
    texture: loadTexture(gl, './assets/sun.jpg'),
    description: 'The center of our scene.',
    isSun: true,
    opticalType: -1,   // Sun is emissive; never affected by optical type
  };
  const sunNode = new SceneNode('sun', sunBody);
  sunNode.localMatrix = Mat4.scaling(sunBody.radius);
  sunNode.baseLocal = sunNode.localMatrix;
  root.add(sunNode);
  bodies.push(sunBody);

  // ---- Planets ----
  const planetNodes = new Map();

  for (const [
    id, name, radius, orbitRadius, angle, tint, speed, selfSpeed, texture,
  ] of PlanetDefinitions) {
    const body = {
      id, name,
      kind: ObjectKind.PLANET,
      radius, orbitRadius, tint, speed, selfSpeed, angle,
      texture: loadTexture(gl, texture),
      position: [0, 0, 0],
      description: 'An instance of the shared indexed sphere mesh.',
      isSun: false,
      opticalType: DEFAULT_OPTICAL[id] ?? 0,
    };
    bodies.push(body);

    const pivot = new SceneNode(`${id}-pivot`, body);
    pivot.userData = { type: 'planet-pivot' };

    const bodyNode = new SceneNode(`${id}-body`, body);
    bodyNode.baseLocal = Mat4.multiply(
      Mat4.translation(orbitRadius, 0, 0),
      Mat4.scaling(radius),
    );
    bodyNode.localMatrix = bodyNode.baseLocal;
    pivot.add(bodyNode);

    root.add(pivot);
    planetNodes.set(id, { pivot, bodyNode });
    orbitNodes.push({ orbitRadius });
  }

  // ---- Moon (child of Earth's body node) ----
  {
    const earth = bodies.find((b) => b.id === 'earth');
    const moonBody = {
      id: 'moon',
      name: 'Moon',
      kind: ObjectKind.SATELLITE,
      radius: MoonData.RADIUS,
      orbitRadius: MoonData.ORBIT_RADIUS,
      speed: MoonData.SPEED,
      selfSpeed: MoonData.SELF_SPEED,
      angle: 0,
      tint: MoonData.TINT,
      texture: loadTexture(gl, MoonData.TEXTURE_URL),
      position: [0, 0, 0],
      description: 'A separate sphere orbiting Earth.',
      isSun: false,
      opticalType: DEFAULT_OPTICAL.moon,
    };
    bodies.push(moonBody);

    const earthBodyNode = planetNodes.get('earth').bodyNode;
    const moonPivot = new SceneNode('moon-pivot', moonBody);
    moonPivot.userData = { type: 'moon-pivot' };

    const moonBodyNode = new SceneNode('moon-body', moonBody);
    const scaledOrbit = MoonData.ORBIT_RADIUS / earth.radius;
    moonBodyNode.baseLocal = Mat4.multiply(
      Mat4.translation(scaledOrbit, 0, 0),
      Mat4.scaling(MoonData.RADIUS / earth.radius),
    );
    moonBodyNode.localMatrix = moonBodyNode.baseLocal;
    moonPivot.add(moonBodyNode);
    earthBodyNode.add(moonPivot);
  }

  // ---- Surveyor (orbit around Earth) ----
  {
    const earth = bodies.find((b) => b.id === 'earth');
    const surveyorBody = {
      id: 'surveyor',
      name: 'Surveyor',
      kind: ObjectKind.LOADED_OBJ,
      radius: SpacecraftData.RADIUS,
      orbitRadius: SpacecraftData.ORBIT_RADIUS,
      speed: SpacecraftData.SPEED,
      angle: SpacecraftData.INITIAL_ANGLE,
      selfSpeed: 0,
      tint: SpacecraftData.TINT,
      mesh: 'spacecraft',
      position: [0, 0, 0],
      description: 'A low-poly spacecraft following Earth.',
      isSun: false,
      opticalType: DEFAULT_OPTICAL.surveyor,
    };
    bodies.push(surveyorBody);

    const earthBodyNode = planetNodes.get('earth').bodyNode;
    const surveyorPivot = new SceneNode('surveyor-pivot', surveyorBody);
    surveyorPivot.userData = { type: 'surveyor-pivot' };

    const surveyorBodyNode = new SceneNode('surveyor-body', surveyorBody);
    const scaledOrbit = SpacecraftData.ORBIT_RADIUS / earth.radius;
    const scaledShip = SpacecraftData.RADIUS / earth.radius;
    surveyorBodyNode.baseLocal = Mat4.multiply(
      Mat4.translation(scaledOrbit, 0, 0),
      Mat4.multiply(Mat4.rotationY(-0.65), Mat4.scaling(scaledShip)),
    );
    surveyorBodyNode.localMatrix = surveyorBodyNode.baseLocal;
    surveyorPivot.add(surveyorBodyNode);
    earthBodyNode.add(surveyorPivot);
  }

  return { root, bodies, orbitNodes };
}