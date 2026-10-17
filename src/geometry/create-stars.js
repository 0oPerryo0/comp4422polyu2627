import { meshData } from './mesh-data.js';

let seed = 4422;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

/*
  Generate the vertex data for some stars
*/

export function createStars(count = 650) {
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i < count; i++) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = 210 + random() * 30;
    const horizontal = Math.sqrt(1 - y * y);
    positions.push(
      radius * horizontal * Math.cos(angle),
      radius * y,
      radius * horizontal * Math.sin(angle),
    );
    const brightness = 0.25 + random() * 0.6;
    colors.push(brightness * 0.86, brightness * 0.92, brightness);
    indices.push(i);
  }

  return meshData(positions, colors, indices);
}
