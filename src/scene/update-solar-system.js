import { Mat4 } from '../math/index.js';

export function updateSolarSystem(scene, time) {
  const { root, bodies } = scene;
  const t = time / 1000;

  root.traverse((node) => {
    const body = node.body;
    if (!body) return;

    const type = node.userData?.type;

    if (type === 'planet-pivot' || type === 'moon-pivot' || type === 'surveyor-pivot') {
      const angle = (body.angle ?? 0) + t * (body.speed ?? 0);
      node.localMatrix = Mat4.rotationY(angle);
    } else if (node.name.endsWith('-body') && node.baseLocal) {
      const spin = Mat4.rotationY(t * (body.selfSpeed ?? 0));
      node.localMatrix = Mat4.multiply(node.baseLocal, spin);
    }
  });

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

  void bodies;
}