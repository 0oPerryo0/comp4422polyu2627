import { Mat4, Vec3 } from '../math/index.js';

const SURVEYOR_HOSTS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const TRAVEL_SECONDS = 3.0;   // how long the journey takes

export function updateSolarSystem(scene, time) {
  const { root, bodies } = scene;
  const t = time / 1000;

  // --- Normal pivot/body update (planets, moon, everything except surveyor) ---
  root.traverse((node) => {
    const body = node.body;
    if (!body) return;
    const type = node.userData?.type;
    if (type === 'planet-pivot' || type === 'moon-pivot') {
      const angle = (body.angle ?? 0) + t * (body.speed ?? 0);
      node.localMatrix = Mat4.rotationY(angle);
    } else if (node.name.endsWith('-body') && node.baseLocal && body.id !== 'surveyor') {
      const spin = Mat4.rotationY(t * (body.selfSpeed ?? 0));
      node.localMatrix = Mat4.multiply(node.baseLocal, spin);
    }
  });

  // --- Surveyor: orbits host, and flies to a new host on hop ---
  const surveyor = bodies.find((b) => b.id === 'surveyor');
  const surveyorNode = (() => {
    let found = null;
    root.traverse((n) => { if (n.body === surveyor) found = n; });
    return found;
  })();

  if (surveyor && surveyorNode) {
    // Initialize state
    if (surveyor._lastT === undefined) surveyor._lastT = t;
    if (surveyor.travel === undefined) {
      surveyor.travel = null;
      surveyor.hopTimer = 0;
    }

    const dt = Math.max(0, t - surveyor._lastT);
    surveyor._lastT = t;

    // Orbit angle always advances so it looks alive
    surveyor.angle = (surveyor.angle ?? 0) + dt * surveyor.speed;

    const host = bodies.find((b) => b.id === surveyor.hostId);

    if (surveyor.travel) {
      // ---- In transit between hosts ----
      surveyor.travel.t += dt / TRAVEL_SECONDS;
      const k = Math.min(surveyor.travel.t, 1);
      // Smoothstep easing — gentle start, gentle stop
      const e = k * k * (3 - 2 * k);

      // Orbital position on the *old* host continues as the "from" anchor
      const fromHost = bodies.find((b) => b.id === surveyor.travel.fromHostId);
      const toHost = bodies.find((b) => b.id === surveyor.travel.toHostId);
      if (!fromHost || !toHost) { surveyor.travel = null; return; }

      const fromR = fromHost.radius * (surveyor.orbitRadiusFactor ?? 2.6);
      const toR = toHost.radius * (surveyor.orbitRadiusFactor ?? 2.6);
      const a = surveyor.travel.startAngle + surveyor.travel.t * Math.PI * 2;
      const fromPos = Vec3.add(fromHost.position, Vec3.create(Math.cos(a) * fromR, 0, Math.sin(a) * fromR));

      // Interpolate position from old orbit to new host's orbit-ring location.
      const endAngle = surveyor.travel.endAngle;
      const toPos = Vec3.add(toHost.position, Vec3.create(Math.cos(endAngle) * toR, 0, Math.sin(endAngle) * toR));

      const lerped = Vec3.create(
        fromPos[0] + (toPos[0] - fromPos[0]) * e,
        0,
        fromPos[2] + (toPos[2] - fromPos[2]) * e,
      );

      // During flight, orient toward direction of travel
      const dx = toPos[0] - fromPos[0];
      const dz = toPos[2] - fromPos[2];
      const yaw = Math.atan2(dx, dz);

      surveyorNode.baseLocal = Mat4.multiply(
        Mat4.translation(...lerped),
        Mat4.multiply(Mat4.rotationY(yaw + Math.PI), Mat4.scaling(surveyor.radius)),
      );
      surveyorNode.localMatrix = surveyorNode.baseLocal;

      // Landing
      if (k >= 1) {
        surveyor.hostId = surveyor.travel.toHostId;
        surveyor.travel = null;
        surveyor.hopTimer = 0;
        surveyor.angle = surveyor.travel?.endAngle ?? 0;
      }
    } else if (host) {
      // ---- Orbiting current host ----
      const orbitR = host.radius * (surveyor.orbitRadiusFactor ?? 2.6);
      const localPos = Vec3.create(Math.cos(surveyor.angle) * orbitR, 0, Math.sin(surveyor.angle) * orbitR);
      const worldPos = Vec3.add(host.position, localPos);
      surveyorNode.baseLocal = Mat4.multiply(
        Mat4.translation(...worldPos),
        Mat4.multiply(Mat4.rotationY(-surveyor.angle + Math.PI / 2), Mat4.scaling(surveyor.radius)),
      );
      surveyorNode.localMatrix = surveyorNode.baseLocal;

      surveyor.hopTimer += dt;
      if (surveyor.hopTimer >= (surveyor.hopEvery ?? 14)) {
        // Start a flight
        const choices = SURVEYOR_HOSTS.filter((id) => id !== surveyor.hostId);
        const nextHostId = choices[Math.floor(Math.random() * choices.length)];
        surveyor.travel = {
          fromHostId: surveyor.hostId,
          toHostId: nextHostId,
          t: 0,
          startAngle: surveyor.angle,
          endAngle: Math.random() * Math.PI * 2,
        };
        surveyor.hopTimer = 0;
      }
    }
  }

  // Propagate world matrices and sync body.position
  root.updateWorldMatrix();
  root.traverse((node) => {
    if (node.body && (node.name === 'sun' || node.name.endsWith('-body'))) {
      node.body.position = [
        node.worldMatrix[12],
        node.worldMatrix[13],
        node.worldMatrix[14],
      ];
    }
  });
}