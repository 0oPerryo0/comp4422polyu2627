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
  document.querySelectorAll('.sidebar button, .sidebar select').forEach((c) => { c.disabled = true; });
  console.error(error);
}

async function start() {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    showError(new Error('The graphics context was lost. Reload the page to rebuild GPU resources.'));
  });

  const [program, glowProgram, backgroundProgram, spacecraftData] = await Promise.all([
    createProgram(gl, '/shaders/scene.vert', '/shaders/scene.frag'),
    createProgram(gl, '/shaders/glow.vert', '/shaders/glow.frag'),
    createProgram(gl, '/shaders/background.vert', '/shaders/background.frag'),
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
      'NormalMatrix', 'LightPos', 'CameraPos', 'IsSun', 'OpticalType', 'Time', 'SunPower',
    ].map((name) => [name, gl.getUniformLocation(program, `u${name}`)]),
  );
  const glowUniforms = {
    SunNdc: gl.getUniformLocation(glowProgram, 'uSunNdc'),
    Aspect: gl.getUniformLocation(glowProgram, 'uAspect'),
    Intensity: gl.getUniformLocation(glowProgram, 'uIntensity'),
    Time: gl.getUniformLocation(glowProgram, 'uTime'),
  };

  // Full-screen quad used for the glow.
  const glowMesh = new Mesh(gl, {
    positions: new Float32Array([
      -1, -1, 0, 1, -1, 0, -1, 1, 0,
      1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]),
    colors: new Float32Array(18),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
    normals: new Float32Array(18),
    indices: new Uint16Array([0, 1, 2, 3, 4, 5]),
  });

  const backgroundUniforms = {
    Aspect: gl.getUniformLocation(backgroundProgram, 'uAspect'),
    Time: gl.getUniformLocation(backgroundProgram, 'uTime'),
  };
  const backgroundMesh = new Mesh(gl, {
    positions: new Float32Array([
      -1, -1, 0, 1, -1, 0, -1, 1, 0,
      1, -1, 0, 1, 1, 0, -1, 1, 0,
    ]),
    colors: new Float32Array(18),
    uvs: new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
    normals: new Float32Array(18),
    indices: new Uint16Array([0, 1, 2, 3, 4, 5]),
  });

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(6 / 255, 10 / 255, 22 / 255, 1);

  const lightPos = [0, 0, 0];
  const LIGHT_ORB_RADIUS = 0.35;

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
    <p class="optical-hint">Tip: right-click anywhere in the scene to move the light.</p>
  `;
  document.querySelector('.sidebar').append(panel);

  function syncOpticalPanel() {
    const body = bodies.find((b) => b.id === selected);
    if (!body || body.isSun) { panel.hidden = true; return; }
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
      body?.description ?? 'Drag to discover the scene. Choose a destination to inspect the geometry up close.';
    document.querySelector('#view-title').textContent = body ? `${body.name} inspection` : 'System overview';
    for (const [labelId, label] of labels)
      label.setAttribute('aria-pressed', String(labelId === selected));
    syncOpticalPanel();
  }

  focusSelect.addEventListener('change', () => focus(focusSelect.value));
  document.querySelector('#earth-button').addEventListener('click', () => focus('earth'));
  document.querySelector('#ship-button').addEventListener('click', () => focus('surveyor'));
  document.querySelector('#reset-button').addEventListener('click', () => focus('overview'));
  document.querySelectorAll('.sidebar button, .sidebar select').forEach((c) => { c.disabled = false; });

  // ---- Ray helpers ----
  function rayFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const view = camera.view;
    const projection = camera.projection(canvas.width / canvas.height);
    const invVP = Mat4.invert(Mat4.multiply(projection, view));
    if (!invVP) return null;
    const nearW = Mat4.transform(invVP, [ndcX, ndcY, -1, 1], 1);
    const farW = Mat4.transform(invVP, [ndcX, ndcY, 1, 1], 1);
    const origin = [nearW[0] / nearW[3], nearW[1] / nearW[3], nearW[2] / nearW[3]];
    const farP = [farW[0] / farW[3], farW[1] / farW[3], farW[2] / farW[3]];
    const dir = Vec3.normalize(Vec3.create(farP[0] - origin[0], farP[1] - origin[1], farP[2] - origin[2]));
    return { origin, dir };
  }
  function rayToPlaneY0(ray) {
    if (!ray || Math.abs(ray.dir[1]) < 1e-5) return null;
    const t = -ray.origin[1] / ray.dir[1];
    if (t <= 0) return null;
    return [ray.origin[0] + ray.dir[0] * t, 0, ray.origin[2] + ray.dir[2] * t];
  }
  function raySpherePick(ray) {
    if (!ray) return null;
    let bestId = null, bestT = Infinity;
    for (const body of bodies) {
      const oc = Vec3.subtract(ray.origin, body.position);
      const b = Vec3.dot(oc, ray.dir);
      const c = Vec3.dot(oc, oc) - body.radius * body.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestT) { bestT = t; bestId = body.id; }
    }
    return bestId;
  }

  // ---- Left-click: focus ----
  let leftDown = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 0) leftDown = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !leftDown) { leftDown = null; return; }
    const dx = e.clientX - leftDown.x;
    const dy = e.clientY - leftDown.y;
    leftDown = null;
    if (Math.hypot(dx, dy) > 5) return;
    const hitId = raySpherePick(rayFromClient(e.clientX, e.clientY));
    if (hitId) focus(hitId);
  });

  // ---- Right-click: place light ----
  let rightDown = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 2) rightDown = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 2 || !rightDown) { rightDown = null; return; }
    const dx = e.clientX - rightDown.x;
    const dy = e.clientY - rightDown.y;
    rightDown = null;
    if (Math.hypot(dx, dy) > 5) return;
    const hit = rayToPlaneY0(rayFromClient(e.clientX, e.clientY));
    if (!hit) return;
    lightPos[0] = hit[0];
    lightPos[1] = hit[1];
    lightPos[2] = hit[2];
    status.textContent = 'WebGL2 · free light mode';
  });

  // ---- Reset-light button ----
  const resetLightBtn = document.createElement('button');
  resetLightBtn.id = 'reset-light-button';
  resetLightBtn.className = 'text-button';
  resetLightBtn.innerHTML = '<span aria-hidden="true">☀</span> Reset light to Sun';
  resetLightBtn.hidden = true;
  document.querySelector('.selection').append(resetLightBtn);
  resetLightBtn.addEventListener('click', () => {
    lightPos[0] = 0; lightPos[1] = 0; lightPos[2] = 0;
    resetLightBtn.hidden = true;
    status.textContent = 'WebGL2 ready';
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
    const ordered = [...bodies].sort((a, b) => Number(b.id === selected) - Number(a.id === selected));
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
        overlaps = occupied.some((box) => Math.abs(x - box.x) < halfWidth + box.halfWidth + 4 && Math.abs(y - box.y) < 23);
        if (!overlaps) break;
        y -= 23;
      }
      label.hidden = !inFrustum || overlaps || x < halfWidth || x > width - halfWidth || y < 90 || y > height - 42;
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
      selected, frameCount, drawCalls,
      depthTest: gl.isEnabled(gl.DEPTH_TEST),
      canvasSize: [canvas.width, canvas.height],
      camera: {
        eye: [...camera.eye], target: [...camera.target],
        distance: camera.distance, yaw: camera.yaw, pitch: camera.pitch,
        followBody: camera.followBody?.id ?? null,
      },
      obj: {
        url: '/assets/models/surveyor.obj',
        vertices: spacecraft.vertexCount, indices: spacecraft.count,
        triangles: spacecraft.count / 3,
      },
      sphere: { vertices: sphere.vertexCount, indices: sphere.count },
      lightPos: [...lightPos],
      bodies: bodies.map((body) => ({
        id: body.id,
        position: [...body.position],
        radius: body.radius,
        opticalType: body.opticalType,
        hostId: body.hostId ?? null,
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
    const deltaTime = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    camera.update(deltaTime);
    updateSolarSystem(scene, time);

    resize();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Full-screen background gradient + nebula
    gl.useProgram(backgroundProgram);
    gl.uniform1f(backgroundUniforms.Aspect, canvas.width / canvas.height);
    gl.uniform1f(backgroundUniforms.Time, time / 1000);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    backgroundMesh.draw();
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    drawCalls++;

    const view = camera.view;
    const projection = camera.projection(canvas.width / canvas.height);
    const viewProjection = Mat4.multiply(projection, view);

    // --- Sun power: how much light is still in the Sun ---
    // 1.0 = full, 0.15 = drained (user stole the light into the orb).
    const isLightFree = Math.hypot(lightPos[0], lightPos[1], lightPos[2]) > 0.001;
    const sunPower = isLightFree ? 0.15 : 1.0;

    // ---- Glow quad helper ----
    function drawGlowAt(worldPos, strength) {
      const clip = Mat4.transform(viewProjection, [worldPos[0], worldPos[1], worldPos[2], 1], 1);
      if (clip[3] <= 0) return;
      const ndc = [clip[0] / clip[3], clip[1] / clip[3]];
      const outside = Math.max(Math.abs(ndc[0]), Math.abs(ndc[1]));
      const fade = Math.max(0, 1.0 - (outside - 1.0));
      if (fade <= 0.01) return;

      gl.useProgram(glowProgram);
      gl.uniform2fv(glowUniforms.SunNdc, ndc);
      gl.uniform1f(glowUniforms.Aspect, canvas.width / canvas.height);
      gl.uniform1f(glowUniforms.Intensity, fade * strength);
      gl.uniform1f(glowUniforms.Time, time / 1000);

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      glowMesh.draw();
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
      drawCalls++;
    }

    // Sun glow — dims when the Sun is drained.
    drawGlowAt([0, 0, 0], 0.55 * sunPower);

    // Orb glow — brightens as the Sun's glow fades.
    if (isLightFree) {
      drawGlowAt(lightPos, 0.55 * (1 - sunPower) + 0.15);
    }

    // ---- Scene ----
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.View, false, view);
    gl.uniformMatrix4fv(uniforms.Projection, false, projection);
    gl.uniform3fv(uniforms.CameraPos, camera.eye);
    gl.uniform3fv(uniforms.LightPos, lightPos);
    gl.uniform1f(uniforms.PointSize, Math.min(window.devicePixelRatio || 1, 2) * 2.5);
    gl.uniform1f(uniforms.Time, time / 1000);
    gl.uniform1f(uniforms.SunPower, sunPower);   // <-- always set, once per frame
    drawCalls = 0;

    resetLightBtn.hidden = !isLightFree;

    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    draw(stars, Mat4.translation(...camera.eye), [1, 1, 1], Mat4.identity());
    gl.disable(gl.BLEND);
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
        draw(mesh, node.worldMatrix, b.tint, node.normalMatrix, texture, b.isSun === true, b.opticalType ?? 0);
      }
    });

    if (isLightFree) {
      const orbModel = Mat4.multiply(Mat4.translation(...lightPos), Mat4.scaling(LIGHT_ORB_RADIUS));
      const inv = Mat4.invert(orbModel);
      const normal = inv ? Mat4.transpose(inv) : Mat4.identity();
      draw(sphere, orbModel, [1.0, 0.85, 0.5], normal, null, true, 0);
    }

    gl.bindVertexArray(null);
    updateLabels(viewProjection);
    frameCount++;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

start().catch(showError);