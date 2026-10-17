# Solar Explorer — COMP4422 M1

An interactive, **static** solar-system scene built with JavaScript and **raw WebGL2**. No rendering framework, matrix library, external JavaScript package, or build step is used.

## Run

Install Node.js 22 or newer, then run from this folder:

```sh
npm start
```

Open **http://127.0.0.1:4173** in Chrome, Edge, Firefox, or another WebGL2-capable browser. Stop the server with Ctrl+C. You do **not** need `npm install`.

Do not open `index.html` directly: the application fetches GLSL files and an OBJ over HTTP. The server only listens on your own machine.

If port 4173 is occupied, set the `PORT` environment variable before starting. In PowerShell:

```powershell
$env:PORT = 4174
npm start
```

## Explore

- **Left-drag:** orbit around the camera target.
- **Scroll:** zoom, with minimum/maximum distance limits.
- **Shift-drag, right-drag, or middle-drag:** pan the camera target.
- **Arrow keys:** orbit; **WASD:** pan; **+ / −:** zoom. Click/focus the canvas first.
- **Destination dropdown / object labels:** focus a body.
- **Visit Earth / Inspect OBJ:** jump to useful inspection views.
- **Reset view:** restore the whole-system composition.
- **Touch:** one-finger drag orbits. Destination controls remain usable on narrow screens.

There are eight planets, the Sun, the Moon, and an original loaded spacecraft. Planet sizes, distances, and positions are illustrative, not astronomical measurements.

## M1 coverage

| Brief requirement     | Implementation                                               | What to demonstrate                                                              |
| --------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Own Vec3/Mat4 library | `src/math/vec3.js`: `Vec3`; `src/math/mat4.js`: `Mat4`                   | Vector operations, matrix multiplication, perspective and look-at                |
| Indexed meshes        | `src/geometry/create-sphere.js`: `createSphere`; `src/core/mesh.js`: `Mesh` | Shared sphere vertex/index buffers, VAOs                                       |
| Loaded `.obj`         | `src/loaders/obj-loader.js`, `src/loaders/obj-parser.js`; `assets/models/surveyor.obj` | Fetch, parse, triangulate and inspect the spacecraft                |
| `drawElements`        | `src/core/mesh.js`: `draw`                                               | One index buffer supplies the triangle indices                                   |
| Model–view–projection | `src/scene/solar-system.js`, `src/scene/camera.js`, `shaders/scene.vert` | CPU model/view/projection matrices and their shader multiplication               |
| Perspective camera    | `Mat4.perspective` and `OrbitCamera.projection`                          | Perspective changes as you inspect different objects                             |
| Depth testing         | `src/main.js`: `gl.enable(gl.DEPTH_TEST)`                                | Correct near/far visibility as you orbit; color **and depth** cleared each frame |
| Controllable camera   | `src/scene/camera.js`: `OrbitCamera`                                     | Orbit, zoom, pan, focus and reset                                                |

**M2/M3 are deliberately not finished.** M1 needs simple shaders to draw anything, so starter GLSL ES 3.00 shaders and a render loop exist. However, there is no texture sampling, orbital/spin animation, Blinn–Phong illumination, or scene graph yet. The sphere's modest color gradient is assigned to vertices; it is not lighting. The Sun is not yet a light source. UVs and normals are stored on the CPU for later work but are not bound to shader attributes in M1.

The scene renders continuously for responsive camera controls. Object transforms remain fixed.

## How the graphics work

### Math conventions

- Right-handed coordinates, +Y up, planets arranged in the XZ plane.
- Matrices are `Float32Array(16)` in **column-major** order.
- Vectors are column vectors.
- `Mat4.multiply(a, b)` computes **a × b**, applying `b` first.
- A planet model matrix is `translation × scale`.
- `lookAt` returns the world-to-camera **view** matrix, not a camera world matrix.
- The vertex shader uses `projection × view × model × position`.
- `uniformMatrix4fv` is called with `transpose = false`, as WebGL requires.

The camera stores a target, distance, yaw, and pitch. It computes its eye position using spherical coordinates and derives its view matrix with the project's own `lookAt`. Pitch is clamped away from the poles to avoid a degenerate camera-up vector. Perspective uses a 55-degree vertical field of view in landscape and preserves a 55-degree horizontal field of view in portrait, with near/far planes of 0.1/500.

### Indexed sphere

`createSphere()` generates a unit sphere with 32 latitude and 48 longitude subdivisions:

- **1,617 vertices** including the duplicated UV seam.
- **9,216 indices**, or **3,072 triangles** (including degenerate pole triangles).
- Outward triangle winding suitable for back-face culling.

One sphere VAO and its buffers are reused for all ten spherical bodies. Each draw supplies a different model matrix and tint. This is ordinary mesh reuse with separate indexed draw calls, **not** GPU instanced drawing.

Orbit paths and the deterministic star background are also indexed, using `LINE_LOOP` and `POINTS`. Each frame has 20 draw calls: one star field, eight orbit paths, and eleven bodies.

### OBJ loader

The spacecraft is genuinely fetched from `assets/models/surveyor.obj`; it is not reconstructed procedurally by the application.

The loader supports:

- `v`, `vt`, `vn`, `g`, and `f` records.
- Positive and negative OBJ indices.
- `v`, `v/vt`, `v//vn`, and `v/vt/vn` face references.
- Triangle and **convex polygon** faces, triangulated with a fan.
- Deduplication of complete position/UV/normal/group-color tuples into WebGL's single-index format.
- Clear errors for missing faces and malformed/out-of-range indices.

It does not load `.mtl` materials, triangulate concave polygons, or generate missing normals. Missing normals are zero placeholders and are unused by M1. Before lighting the spacecraft in M3, generate suitable normals or supply `vn` records.

The original model has **41 source positions, 31 faces, and 58 rendered triangles**. Per-group colors distinguish the hull, nose, cockpit, solar panels, and engine.

### Depth and background

WebGL depth testing uses `LESS`. The depth buffer is cleared every frame. Back-face culling is also enabled. The star shell moves with the camera eye and does not write depth, so it behaves like a distant background while objects still occlude it.

## Files

```text
index.html                  Accessible UI and canvas
styles.css                  Responsive explorer layout
server.js                   Dependency-free localhost HTTP server
src/
  main.js                   Setup, draw loop, UI, projection of labels
  core/
    mesh.js                 VAO/VBO/EBO setup and drawElements
    read-shader.js          Shader source fetch
    compile-shader.js       Shader compilation
    create-program.js       Shader program linking
  geometry/
    create-sphere.js        Indexed unit sphere
    create-orbit.js         Orbit circle
    create-stars.js         Deterministic star background
    mesh-data.js            Typed-array mesh data helper
  loaders/
    obj-loader.js           OBJ fetch
    obj-parser.js           OBJ parser
  math/
    vec3.js                 Own Vec3 library
    mat4.js                 Own Mat4 library
  scene/
    camera.js               Perspective orbit camera and input
    solar-system.js         Static body definitions and model matrices
  */index.js                Re-exports for each folder
shaders/
  scene.vert                Model–view–projection and vertex colors
  scene.frag                Simple color output, no textures/lighting
assets/models/surveyor.obj   Original spacecraft asset
scripts/check-browser.js    Real-browser integration checks
test/                       Node unit/integration tests
docs/M1-demo.md              Three-minute walkthrough and checklist
```

## Verify

```sh
npm test
npm run test:browser
```

`npm test` runs dependency-free tests for math, matrix conventions, camera calculations, mesh topology/winding, OBJ parsing, the original asset, and HTTP serving.

`npm run test:browser` starts a temporary localhost server and a fresh **headless Chrome/Edge profile** using the browser's default graphics settings. It checks actual WebGL2 rendering and GPU errors, intercepts indexed draw calls, drives camera controls, checks mobile layout and missing-WebGL2 handling, and saves screenshots/report under `artifacts/`. It closes its own server/browser and removes only its own temporary browser profile.

On another machine, set `BROWSER_PATH` if Chrome/Edge cannot be located. Browser tests require working WebGL2/GPU support in that environment. No sandbox-disabling or unsafe-renderer flags are used.

For future automated sessions, `/run-skill-generator` can capture this local-server and browser-verification workflow as a reusable project skill.

In the application's browser console you can also inspect a read-only snapshot:

```js
solarExplorer.getState();
```

This reports camera values, body positions, loaded OBJ counts, depth-test state, draw calls, and `gl.getError()`. It does not provide controls for mutating the scene.

## Submission and attribution

- Application code and the original Surveyor OBJ were created with **Claude AI assistance**. Declare this in the report, as the project brief requires; do not present AI-generated work as unaided personal implementation.
- No third-party model, image, font, rendering library, or math library is included.
- Each milestone owner should understand, test, and explain the techniques they submit, and follow the course's AI-use policy.
- M1's narrated video must be made by the milestone owner. See `docs/M1-demo.md` for a suggested structure.
- This repository is the M1 source implementation, not a submitted milestone video or final report.
