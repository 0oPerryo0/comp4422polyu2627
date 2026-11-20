import { ObjectKind, PlanetDefinitions, MoonData, SpacecraftData } from '../consts/index.js';
import { Vec3, Mat4 } from '../math/index.js';
import { loadTexture } from '../loaders/texture-loader.js';
import { SceneNode } from './scene-node.js';

const DEFAULT_OPTICAL = {
  mercury: 2, venus: 1, earth: 0, mars: 2,
  jupiter: 3, saturn: 3, uranus: 1, neptune: 1,
  moon: 0, surveyor: 0,
};

// Planets the surveyor can hop between (excludes the Sun).
const SURVEYOR_HOSTS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

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
    opticalType: -1,
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

  // ---- Surveyor (child of ROOT, not Earth; hops between hosts) ----
  {
    const surveyorBody = {
      id: 'surveyor',
      name: 'Surveyor',
      kind: ObjectKind.LOADED_OBJ,
      radius: SpacecraftData.RADIUS,
      // Dynamic state, updated each frame by update-solar-system.js:
      hostId: 'earth',
      orbitRadius: SpacecraftData.ORBIT_RADIUS,
      speed: SpacecraftData.SPEED,
      angle: SpacecraftData.INITIAL_ANGLE,
      selfSpeed: 0,
      tint: SpacecraftData.TINT,
      mesh: 'spacecraft',
      position: [0, 0, 0],
      description: 'A low-poly spacecraft that hops between planets.',
      isSun: false,
      opticalType: DEFAULT_OPTICAL.surveyor,
      // How long (in seconds) to stay with each host before moving on.
      hopEvery: 14,
      hopTimer: 0,
      orbitRadiusFactor: 2.6,   // orbit distance = host.radius × this
    };
    bodies.push(surveyorBody);

    // The surveyor lives under the ROOT node (not Earth) so it can re-parent freely.
    // Its position is fully driven by update-solar-system.js each frame, so we
    // don't need pivot/child structure — just a single body node we mutate.
    const surveyorBodyNode = new SceneNode('surveyor-body', surveyorBody);
    surveyorBodyNode.baseLocal = Mat4.identity();
    surveyorBodyNode.localMatrix = surveyorBodyNode.baseLocal;
    root.add(surveyorBodyNode);

    // Expose helper data so update-solar-system.js can compute world position.
    surveyorBody._sceneHelpers = { root };
  }

  // Attach the list of hosts so main.js can show/cycle them if needed.
  return { root, bodies, orbitNodes, surveyorHosts: SURVEYOR_HOSTS };
}