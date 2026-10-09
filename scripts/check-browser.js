// Dependency-free Chrome/Edge smoke test using the browser's DevTools protocol.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../server.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(read, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await delay(80);
  }
  throw new Error('Timed out waiting for the browser.');
}

async function findBrowser() {
  const candidates = process.env.BROWSER_PATH ? [process.env.BROWSER_PATH] : [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next installation. */ }
  }
  throw new Error('Chrome/Edge was not found. Set BROWSER_PATH to a Chromium browser executable.');
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) { this.events.push(message); return; }
      const call = this.pending.get(message.id);
      if (!call) return;
      clearTimeout(call.timer);
      this.pending.delete(message.id);
      if (message.error) call.reject(new Error(message.error.message));
      else call.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools timed out: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  }
}

const browserPath = await findBrowser();
const profile = await mkdtemp(join(tmpdir(), 'comp4422-browser-'));
const server = createAppServer();
let browser;
let tools;
let stderr = '';
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(browserPath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-6000); });
  let spawnError;
  browser.on('error', error => { spawnError = error; });
  const port = await waitFor(async () => {
    if (spawnError) throw spawnError;
    if (browser.exitCode !== null) throw new Error(`Browser exited: ${stderr}`);
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  tools = new DevTools(socket);
  await tools.send('Page.enable');
  await tools.send('Runtime.enable');
  await tools.send('Network.enable');
  await tools.send('Log.enable');
  await tools.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await tools.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.indexedDraws = { calls: 0, triangles: 0, lines: 0, points: 0, missingBuffers: 0 };
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function(mode, count, type, offset) {
      window.indexedDraws.calls++;
      if (mode === this.TRIANGLES) window.indexedDraws.triangles++;
      if (mode === this.LINE_LOOP) window.indexedDraws.lines++;
      if (mode === this.POINTS) window.indexedDraws.points++;
      if (!this.getParameter(this.ELEMENT_ARRAY_BUFFER_BINDING)) window.indexedDraws.missingBuffers++;
      return original.call(this, mode, count, type, offset);
    };
  ` });
  await tools.send('Page.navigate', { url });
  await waitFor(() => tools.evaluate('document.body?.dataset.ready === "true"'));
  const frame = () => tools.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
  const state = () => tools.evaluate('window.solarExplorer.getState()');
  const artifacts = join(root, 'artifacts');
  await mkdir(artifacts, { recursive: true });
  const screenshot = async name => {
    await frame();
    const image = await tools.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(artifacts, name), Buffer.from(image.data, 'base64'));
  };
  const click = async selector => {
    const point = await tools.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await tools.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await tools.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await frame();
  };

  await frame();
  const initial = await state();
  assert.equal(initial.depthTest, true);
  assert.equal(initial.obj.indices, 174);
  assert.equal(initial.obj.triangles, 58);
  assert.equal(initial.bodies.length, 11);
  assert.equal(initial.drawCalls, 20);
  assert.equal(initial.webglError, 0);
  const draws = await tools.evaluate('window.indexedDraws');
  assert.ok(draws.triangles > 0 && draws.lines > 0 && draws.points > 0);
  assert.equal(draws.missingBuffers, 0);
  console.log('PASS: WebGL2, depth testing, 11 bodies, loaded OBJ and indexed draw calls.');
  await screenshot('m1-overview.png');

  await click('#earth-button');
  assert.equal((await state()).selected, 'earth');
  assert.ok((await state()).camera.distance < initial.camera.distance);
  await screenshot('m1-earth.png');
  await click('#ship-button');
  assert.equal((await state()).selected, 'surveyor');
  await screenshot('m1-surveyor.png');
  console.log('PASS: Earth and OBJ destination controls update camera and selection.');

  const rectangle = await tools.evaluate('(() => { const r = document.querySelector("#scene").getBoundingClientRect(); return {x:r.x, y:r.y, width:r.width, height:r.height}; })()');
  const point = { x: rectangle.x + rectangle.width * 0.6, y: rectangle.y + rectangle.height * 0.72 };
  const beforeDrag = await state();
  await tools.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await tools.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + 85, y: point.y + 28, button: 'left', buttons: 1 });
  await tools.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + 85, y: point.y + 28, button: 'left', clickCount: 1 });
  await frame();
  const afterDrag = await state();
  assert.notEqual(afterDrag.camera.yaw, beforeDrag.camera.yaw);
  assert.notEqual(afterDrag.camera.pitch, beforeDrag.camera.pitch);
  await tools.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaY: -160, deltaX: 0 });
  await frame();
  assert.ok((await state()).camera.distance < afterDrag.camera.distance);
  const beforePan = await state();
  await tools.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1, modifiers: 8 });
  await tools.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + 50, y: point.y, buttons: 1, modifiers: 8 });
  await tools.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + 50, y: point.y, button: 'left', clickCount: 1 });
  await frame();
  assert.notDeepEqual((await state()).camera.target, beforePan.camera.target);
  const beforeKey = await state();
  await tools.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await delay(180);
  await tools.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await frame();
  assert.notEqual((await state()).camera.yaw, beforeKey.camera.yaw);
  console.log('PASS: Real pointer orbit, wheel zoom, Shift-drag pan and keyboard orbit.');

  await click('#reset-button');
  assert.equal((await state()).selected, 'overview');
  assert.equal((await state()).camera.distance, 90);
  await tools.evaluate('document.querySelector("#focus-select").value = "jupiter"; document.querySelector("#focus-select").dispatchEvent(new Event("change", {bubbles:true}))');
  assert.equal((await state()).selected, 'jupiter');
  await click('#reset-button');
  const firstPositions = (await state()).bodies;
  await delay(150);
  assert.deepEqual((await state()).bodies, firstPositions);
  console.log('PASS: Reset, dropdown focus and intentionally static M1 transforms.');

  const pixelEvidence = await tools.evaluate(`new Promise(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector('#scene');
    const gl = canvas.getContext('webgl2');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.max(pixels[i], pixels[i+1], pixels[i+2]) > 65 && Math.max(pixels[i], pixels[i+1], pixels[i+2]) - Math.min(pixels[i], pixels[i+1], pixels[i+2]) > 25) colored++;
    }
    resolve({ colored, error: gl.getError() });
  }))`);
  assert.ok(pixelEvidence.colored > 1000, `Expected visible planet pixels; got ${pixelEvidence.colored}`);
  assert.equal(pixelEvidence.error, 0);
  console.log(`PASS: Canvas is nonblank (${pixelEvidence.colored} colored geometry pixels).`);

  await tools.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await frame();
  const mobile = await tools.evaluate('({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, canvasWidth: document.querySelector("#scene").clientWidth, error: solarExplorer.getState().webglError })');
  assert.equal(mobile.documentWidth, mobile.width);
  assert.equal(mobile.canvasWidth, 390);
  assert.equal(mobile.error, 0);
  assert.equal(await tools.evaluate('document.querySelector(\'.body-label[data-id="neptune"]\').hidden'), false);
  assert.match(await tools.evaluate('document.querySelector("h1").textContent'), /space\s+to/);
  await screenshot('m1-mobile.png');
  console.log('PASS: Responsive 390px mobile layout and canvas resize.');

  const failures = tools.events.filter(event => event.method === 'Runtime.exceptionThrown'
    || (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error')
    || (event.method === 'Log.entryAdded' && event.params.entry.level === 'error')
    || (event.method === 'Network.responseReceived' && event.params.response.status >= 400));
  assert.deepEqual(failures, [], 'Unexpected browser or network errors.');
  console.log('PASS: No JavaScript, shader, WebGL or asset-loading errors.');

  const failureScript = await tools.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type === 'webgl2' ? null : getContext.call(this, type, ...args);
    };
  ` });
  await tools.send('Page.reload');
  await waitFor(() => tools.evaluate('document.querySelector("#error-panel")?.hidden === false'));
  assert.equal(await tools.evaluate('document.querySelector("#focus-select").disabled'), true);
  assert.match(await tools.evaluate('document.querySelector("#error-message").textContent'), /WebGL2 is not available/);
  await tools.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: failureScript.identifier });
  console.log('PASS: Missing WebGL2 produces a useful visible error, not a blank scene.');
  await writeFile(join(artifacts, 'browser-check.json'), JSON.stringify({ initial, draws, pixelEvidence, mobile, result: 'passed' }, null, 2));
  console.log(`Screenshots and report: ${artifacts}`);
} finally {
  if (tools) {
    await tools.send('Browser.close').catch(() => {});
    tools.socket.close();
  }
  if (browser && browser.exitCode === null) {
    await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(3000)]);
    if (browser.exitCode === null) browser.kill();
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  // Only the temporary browser profile created by this script is removed.
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(error => {
    console.warn(`Could not clean up temporary browser profile: ${error.message}`);
  });
}
