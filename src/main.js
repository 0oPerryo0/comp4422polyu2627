import { Mat4, Vec3 } from './math/index.js';
import { createSphere, createOrbit, createStars } from './geometry/index.js';
import { loadOBJ } from './loaders/obj-loader.js';
import { Mesh, createProgram } from './core/index.js';
import { OrbitCamera, createSolarSystem, updateSolarSystem } from './scene/index.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#renderer-status');
const loading = document.querySelector('#loading-screen');
const focusSelect = document.querySelector('#focus-select');
let contextLost = false;

const OPTICAL_LABELS = ['Reflective', 'Transmissive', 'Absorbing', 'Diffractive'];

function showError(error) {
  loading.hidden = true;
  document.querySelector('#error-panel').hidden = false;
  document.querySelector('#error-message').textContent = error.message;
  status.textContent = 'Renderer unavailable';
  document.querySelectorAll('.sidebar button, .sidebar select').forEach((control) => {
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
      new Error('The graphics context was lost. Reload the page to rebuild GPU resources.'),
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
  const scene = createSolarSystem(gl);
  const { root, bodies } = scene;

  const uniforms = Object.fromEntries(
    [
      'Model', 'View', 'Projection', 'Tint', 'PointSize', 'Texture', 'UseTexture',
      'NormalMatrix', 'LightPos', 'CameraPos', 'IsSun', 'OpticalType', 'Time',
    ].map((name) => [name, gl.getUniformLocation(program, `u${name}`)]),
  );

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(6 / 255, 10 / 255, 22 / 255, 1);

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

  // ---- Optical-type panel ----
  const panel = document.createElement('section');
  panel.id = 'optical-panel';
  panel.className = 'optical-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <p class="eyebrow">OPTICAL CLASS</p>
    <p class="optical-target" id="optical-target">—</p>
    <div class="optical-buttons">
      <button data-optical="0">Reflective</button>
      <button data-optical="1">Transmissive</button>
      <button data-optical="2">Absorbing</button>
      <button data-optical="3">Diffractive</button>
    </div>
    <p class="optical-hint">Tip: click a planet in the scene to inspect it, then choose how it interacts with the Sun's light.</p>
  `;
  document.querySelector('.sidebar').append(panel);

  function syncOpticalPanel() {
    const body = bodies.find((b) => b.id === selected);
    if (!body || body.isSun) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    document.querySelector('#optical-target').textContent =
      `${body.name} · currently ${OPTICAL_LABELS[body.opticalType] ?? '—'}`;
    panel.querySelectorAll('button').forEach((btn) => {
      const type = Number(btn.dataset.optical);
      btn.setAttribute('aria-pressed', String(type === body.opticalType));
    });
  }

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-optical]');
    if (!btn) return;
    const body = bodies.find((b) => b.id === selected);
    if (!body || body.isSun) return;
    body.opticalType = Number(btn.dataset.optical);
    syncOpticalPanel();
  });

  function focus(id) {
    const body = bodies.find((item) => item.id === id);
    selected = body ? id : 'overview';
    if (body) camera.focus(body);
    else camera.reset();
    focusSelect.value = selected;
    document.querySelector('#selection-kind').textContent = body?.kind ?? 'OVERVIEW';
    document.querySelector('#selection-name').textContent = body?.name ?? 'The solar system';
    document.querySelector('#selection-description').textContent =
      body?.description ??
      'Drag to discover the scene. Choose a destination to inspect the geometry up close.';
    document.querySelector('#view-title').textContent = body
      ? `${body.name} inspection`
      : 'System overview';
    for (const [labelId, label] of labels)
      label.setAttribute('aria-pressed', String(labelId === selected));
    syncOpticalPanel();
  }

  focusSelect.addEventListener('change', () => focus(focusSelect.value));
  document.querySelector('#earth-button').addEventListener('click', () => focus('earth'));
  document.querySelector('#ship-button').addEventListener('click', () => focus('surveyor'));
  document.querySelector('#reset-button').addEventListener('click', () => focus('overview'));
  document.querySelectorAll('.sidebar button, .sidebar select').forEach((control) => {
    control.disabled = false;
  });

  // ----- User Interaction: click a planet to focus it -----
  let pointerDown = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointerDown = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!pointerDown || e.button !== 0) { pointerDown = null; return; }
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if (Math.hypot(dx, dy) > 5) return;

    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const view = camera.view;
    const projection = camera.projection(canvas.width / canvas.height);
    const invViewProj = Mat4.invert(Mat4.multiply(projection, view));
    if (!invViewProj) return;

    const nearW = Mat4.transform(invViewProj, [ndcX, ndcY, -1, 1], 1);
    const farW = Mat4.transform(invViewProj, [ndcX, ndcY, 1, 1], 1);
    const origin = [nearW[0] / nearW[3], nearW[1] / nearW[3], nearW[2] / nearW[3]];
    const farP = [farW[0] / farW[3], farW[1] / farW[3], farW[2] / farW[3]];
    const dir = Vec3.normalize(Vec3.create(
      farP[0] - origin[0], farP[1] - origin[1], farP[2] - origin[2],
    ));

    let bestId = null;
    let bestT = Infinity;
    for (const body of bodies) {
      const oc = Vec3.subtract(origin, body.position);
      const b = Vec3.dot(oc, dir);
      const c = Vec3.dot(oc, oc) - body.radius * body.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestT) { bestT = t; bestId = body.id; }
    }

    if (bestId) focus(bestId);
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

  function draw(mesh, model, tint, normalMatrix, texture = null, isSun = false, opticalType = 0) {
    gl.uniformMatrix4fv(uniforms.Model, false, model);
    gl.uniformMatrix4fv(uniforms.NormalMatrix, false, normalMatrix);
    gl.uniform3fv(uniforms.Tint, tint);
    gl.uniform1i(uniforms.IsSun, isSun ? 1 : 0);
    gl.uniform1i(uniforms.OpticalType, opticalType);

    if (texture !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.Texture, 0);
      gl.uniform1i(uniforms.UseTexture, 1);
    } else {
      gl.uniform1i(uniforms.UseTexture, 0);
    }

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
      const anchor = Vec3.add(body.position, Vec3.create(0, body.radius + 0.35, 0));
      const clip = Mat4.transform(viewProjection, anchor);
      const x = ((clip[0] / clip[3]) * 0.5 + 0.5) * width;
      let y = ((-clip[1] / clip[3]) * 0.5 + 0.5) * height;
      const halfWidth = (body.name.length * 7 + 16) / 2;
      const inFrustum = clip[3] > 0 && Math.abs(clip[2] / clip[3]) <= 1;
      let overlaps = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        overlaps = occupied.some(
          (box) => Math.abs(x - box.x) < halfWidth + box.halfWidth + 4 && Math.abs(y - box.y) < 23,
        );
        if (!overlaps) break;
        y -= 23;
      }
      label.hidden =
        !inFrustum || overlaps ||
        x < halfWidth || x > width - halfWidth ||
        y < 90 || y > height - 42;
      if (!label.hidden) {
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        occupied.push({ x, y, halfWidth });
      }
    }
  }

  window.solarExplorer = Object.freeze({
    getState: () => ({
      ready: !contextLost,
      milestone: 'M3',
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
        followBody: camera.followBody?.id ?? null,
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
        opticalType: body.opticalType,
      })),
      webglError: gl.getError(),
    }),
  });
  status.textContent = 'WebGL2 ready';
  console.log('[M3] WebGL2 ready — solar system online');
  document.querySelector('#geometry-status').textContent =
    `Own Vec3 / Mat4 · Indexed spheres · Surveyor OBJ: ${spacecraft.count / 3} triangles`;
  loading.hidden = true;
  document.body.dataset.ready = 'true';

  let previousTime;
  function render(time) {
    if (contextLost) return;
    const deltaTime = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    camera.update(deltaTime);
    updateSolarSystem(scene, time);

    resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    const view = camera.view;
    const projection = camera.projection(canvas.width / canvas.height);
    gl.uniformMatrix4fv(uniforms.View, false, view);
    gl.uniformMatrix4fv(uniforms.Projection, false, projection);
    gl.uniform3fv(uniforms.CameraPos, camera.eye);
    gl.uniform3fv(uniforms.LightPos, [0, 0, 0]);
    gl.uniform1f(uniforms.PointSize, Math.min(window.devicePixelRatio || 1, 2) * 1.5);
    gl.uniform1f(uniforms.Time, time / 1000);
    drawCalls = 0;

    gl.depthMask(false);
    draw(stars, Mat4.translation(...camera.eye), [0.75, 0.85, 1.0], Mat4.identity());
    gl.depthMask(true);

    for (const { orbitRadius } of scene.orbitNodes) {
      draw(orbit, Mat4.scaling(orbitRadius), [0.15, 0.21, 0.3], Mat4.identity());
    }

    root.traverse((node) => {
      const b = node.body;
      if (!b) return;
      if (node.name === 'sun' || node.name.endsWith('-body')) {
        const mesh = b.mesh === 'spacecraft' ? spacecraft : sphere;
        const texture = b.isSun || !b.mesh ? b.texture ?? null : null;
        draw(
          mesh,
          node.worldMatrix,
          b.tint,
          node.normalMatrix,
          texture,
          b.isSun === true,
          b.opticalType ?? 0,
        );
      }
    });

    gl.bindVertexArray(null);
    updateLabels(Mat4.multiply(projection, view));
    frameCount++;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

start().catch(showError);