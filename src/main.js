import { Mat4, Vec3 } from './math/index.js';
import { createSphere, createOrbit, createStars } from './geometry/index.js';
import { loadOBJ } from './loaders/obj-loader.js';
import { Mesh, createProgram } from './core/index.js';
import {
  OrbitCamera,
  createSolarSystem,
  updateSolarSystem,
} from './scene/index.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#renderer-status');
const loading = document.querySelector('#loading-screen');
const focusSelect = document.querySelector('#focus-select');
let contextLost = false;

function showError(error) {
  loading.hidden = true;
  document.querySelector('#error-panel').hidden = false;
  document.querySelector('#error-message').textContent = error.message;
  status.textContent = 'Renderer unavailable';
  document
    .querySelectorAll('.sidebar button, .sidebar select')
    .forEach((control) => {
      control.disabled = true;
    });

  console.error(error);
}

async function start() {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    showError(
      new Error(
        'The graphics context was lost. Reload the page to rebuild GPU resources.',
      ),
    );
  });

  const [program, spacecraftData] = await Promise.all([
    createProgram(gl, '/shaders/scene.vert', '/shaders/scene.frag'),
    loadOBJ('/assets/models/surveyor.obj'),
  ]);
  const sphere = new Mesh(gl, createSphere());
  const spacecraft = new Mesh(gl, spacecraftData);
  const orbit = new Mesh(gl, createOrbit(), gl.LINE_LOOP);
  const stars = new Mesh(gl, createStars(), gl.POINTS);
  const camera = new OrbitCamera(canvas);
  const bodies = createSolarSystem();
  const uniforms = Object.fromEntries(
    ['Model', 'View', 'Projection', 'Tint', 'PointSize'].map((name) => [
      name,
      gl.getUniformLocation(program, `u${name}`),
    ]),
  );
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(7 / 255, 12 / 255, 21 / 255, 1);

  let selected = 'overview';
  let frameCount = 0;
  let drawCalls = 0;
  const labels = new Map();
  for (const body of bodies) {
    const option = document.createElement('option');
    option.value = body.id;
    option.textContent = body.name + (body.mesh ? ' · loaded OBJ' : '');
    focusSelect.append(option);
    const label = document.createElement('button');
    label.className = 'body-label';
    label.dataset.id = body.id;
    label.textContent = body.name;
    label.setAttribute('aria-label', `Focus on ${body.name}`);
    label.setAttribute('aria-pressed', 'false');
    label.addEventListener('click', () => focus(body.id));
    document.querySelector('#scene-labels').append(label);
    labels.set(body.id, label);
  }

  function focus(id) {
    const body = bodies.find((item) => item.id === id);
    selected = body ? id : 'overview';
    if (body) camera.focus(body.position, body.radius);
    else camera.reset();
    focusSelect.value = selected;
    document.querySelector('#selection-kind').textContent =
      body?.kind ?? 'OVERVIEW';
    document.querySelector('#selection-name').textContent =
      body?.name ?? 'The solar system';
    document.querySelector('#selection-description').textContent =
      body?.description ??
      'Drag to discover the scene. Choose a destination to inspect the geometry up close.';
    document.querySelector('#view-title').textContent = body
      ? `${body.name} inspection`
      : 'System overview';
    for (const [labelId, label] of labels)
      label.setAttribute('aria-pressed', String(labelId === selected));
  }
  focusSelect.addEventListener('change', () => focus(focusSelect.value));
  document
    .querySelector('#earth-button')
    .addEventListener('click', () => focus('earth'));
  document
    .querySelector('#ship-button')
    .addEventListener('click', () => focus('surveyor'));
  document
    .querySelector('#reset-button')
    .addEventListener('click', () => focus('overview'));
  document
    .querySelectorAll('.sidebar button, .sidebar select')
    .forEach((control) => {
      control.disabled = false;
    });

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function draw(mesh, model, tint) {
    gl.uniformMatrix4fv(uniforms.Model, false, model);
    gl.uniform3fv(uniforms.Tint, tint);
    mesh.draw();
    drawCalls++;
  }

  function updateLabels(viewProjection) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const occupied = [];
    const ordered = [...bodies].sort(
      (a, b) => Number(b.id === selected) - Number(a.id === selected),
    );
    for (const body of ordered) {
      const label = labels.get(body.id);
      const anchor = Vec3.add(
        body.position,
        Vec3.create(0, body.radius + 0.35, 0),
      );
      const clip = Mat4.transform(viewProjection, anchor);
      const x = ((clip[0] / clip[3]) * 0.5 + 0.5) * width;
      let y = ((-clip[1] / clip[3]) * 0.5 + 0.5) * height;
      const halfWidth = (body.name.length * 7 + 16) / 2;
      const inFrustum = clip[3] > 0 && Math.abs(clip[2] / clip[3]) <= 1;
      let overlaps = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        overlaps = occupied.some(
          (box) =>
            Math.abs(x - box.x) < halfWidth + box.halfWidth + 4 &&
            Math.abs(y - box.y) < 23,
        );
        if (!overlaps) break;
        y -= 23;
      }
      label.hidden =
        !inFrustum ||
        overlaps ||
        x < halfWidth ||
        x > width - halfWidth ||
        y < 90 ||
        y > height - 42;
      if (!label.hidden) {
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        occupied.push({ x, y, halfWidth });
      }
    }
  }

  // Read-only diagnostics support the M1 demonstration and browser smoke test.
  window.solarExplorer = Object.freeze({
    getState: () => ({
      ready: !contextLost,
      milestone: 'M1',
      selected,
      frameCount,
      drawCalls,
      depthTest: gl.isEnabled(gl.DEPTH_TEST),
      canvasSize: [canvas.width, canvas.height],
      camera: {
        eye: [...camera.eye],
        target: [...camera.target],
        distance: camera.distance,
        yaw: camera.yaw,
        pitch: camera.pitch,
      },
      obj: {
        url: '/assets/models/surveyor.obj',
        vertices: spacecraft.vertexCount,
        indices: spacecraft.count,
        triangles: spacecraft.count / 3,
      },
      sphere: { vertices: sphere.vertexCount, indices: sphere.count },
      bodies: bodies.map((body) => ({
        id: body.id,
        position: [...body.position],
        radius: body.radius,
      })),
      webglError: gl.getError(),
    }),
  });
  status.textContent = 'WebGL2 ready';
  document.querySelector('#geometry-status').textContent =
    `Own Vec3 / Mat4 · Indexed spheres · Surveyor OBJ: ${spacecraft.count / 3} triangles`;
  loading.hidden = true;
  document.body.dataset.ready = 'true';

  let previousTime;
  function render(time) {
    if (contextLost) return;
    const deltaTime =
      previousTime === undefined
        ? 0
        : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    camera.update(deltaTime);
    updateSolarSystem(bodies, time);

    resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    const view = camera.view;
    const projection = camera.projection(canvas.width / canvas.height);
    gl.uniformMatrix4fv(uniforms.View, false, view);
    gl.uniformMatrix4fv(uniforms.Projection, false, projection);
    gl.uniform1f(
      uniforms.PointSize,
      Math.min(window.devicePixelRatio || 1, 2) * 1.5,
    );
    drawCalls = 0;

    // Camera-centered stars form a background and never write to the depth buffer.
    gl.depthMask(false);
    draw(stars, Mat4.translation(...camera.eye), [1, 1, 1]);
    gl.depthMask(true);
    for (const body of bodies) {
      if (body.orbitRadius && body.id != 'surveyor')
        draw(orbit, Mat4.scaling(body.orbitRadius), [0.15, 0.21, 0.3]);
    }
    for (const body of bodies)
      draw(body.mesh ? spacecraft : sphere, body.model, body.tint);
    gl.bindVertexArray(null);
    updateLabels(Mat4.multiply(projection, view));
    frameCount++;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

start().catch(showError);
