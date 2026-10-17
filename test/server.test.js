import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createAppServer } from '../server.js';

let server;
let base;
before(async () => {
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('server provides HTML and JavaScript with correct MIME types', async () => {
  const index = await fetch(base);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  assert.match(await index.text(), /id="scene"/);
  // const script = await fetch(`${base}/src/math.js`);
  const script = await fetch(`${base}/src/math/vec3.js`);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(await script.text(), /export const Mat4/);
});

test('server provides OBJ and shader assets', async () => {
  for (const path of [
    '/assets/models/surveyor.obj',
    '/shaders/scene.vert',
    '/shaders/scene.frag',
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 100);
  }
});

test('server refuses private paths, traversal, missing files and invalid URLs', async () => {
  for (const path of [
    '/server.js',
    '/package.json',
    '/src/.secret',
    '/assets/%2e%2e/%2e%2e/server.js',
    '/src/missing.js',
  ]) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  assert.equal((await fetch(`${base}/src/%ZZ`)).status, 400);
});

test('server supports HEAD and refuses writes', async () => {
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
