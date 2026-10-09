# M1 — Video and demonstration guide

M1 is listed for **19 October 2026** in the supplied brief. The milestone owner records a narrated screen recording of **at most three minutes**, showing both the running scene and key code. Confirm the actual Canvas deadline with the teaching team.

## Before recording

1. Run `npm test` and fix any failures.
2. Run `npm start`; open http://127.0.0.1:4173.
3. Check that the header says **WebGL2 ready**.
4. Inspect Earth and Surveyor, then reset to the overview.
5. Keep the code editor open at `src/math.js`, `src/mesh.js`, `src/obj-loader.js`, and `shaders/scene.vert`.
6. Ensure browser zoom is 100%, there are no console errors, and text is readable in the recording.

## Suggested three-minute structure

| Time | Show | Explain in your own words |
|---|---|---|
| 0:00–0:20 | Whole-system view | Project theme; M1 is geometry and camera, with static objects |
| 0:20–0:45 | Drag, scroll, Shift-drag; focus Earth; reset | Eye/target, orbit, pan, zoom limits and perspective |
| 0:45–1:20 | `src/math.js` and `shaders/scene.vert` | Own column-major matrices; scale then translation; `P × V × M × position`; view versus projection |
| 1:20–1:45 | `src/geometry.js` and `src/mesh.js` | Shared sphere vertex/index buffers; VAO state; `drawElements` |
| 1:45–2:15 | Inspect Surveyor; show OBJ asset and loader | Asset fetched at runtime; quads triangulated; complete vertices deduplicated into one WebGL index |
| 2:15–2:40 | Orbit a close-up; show depth setup in `src/main.js` | Depth buffer distinguishes near/far surfaces; clear depth every frame; back-face culling is separate |
| 2:40–3:00 | Tests and final scene | Summarize M1 coverage and personal contribution; distinguish later textures/animation/lighting |

Rehearse and shorten explanations rather than exceeding three minutes. Avoid spending the video reading the entire source file.

## Requirements checklist

- [ ] Own Vec3/Mat4 library explained, not just a claim that a library exists.
- [ ] Indexed meshes rendered with `drawElements`.
- [ ] At least one loaded `.obj` shown and its loading path explained.
- [ ] Model, view and projection each have an explained purpose.
- [ ] Perspective camera demonstrated.
- [ ] Depth testing enabled and depth buffer cleared.
- [ ] User-controllable camera demonstrated.
- [ ] Narration is by the actual milestone owner.
- [ ] Personal implementation and AI assistance described honestly according to course rules.

## Useful questions to prepare for

**Why `translation × scale` rather than `scale × translation`?**
With column vectors, the rightmost operation happens first. Reversing the order would also scale the object's translation, changing its intended position.

**Why does an OBJ need conversion before `drawElements`?**
OBJ can index positions, UVs, and normals independently. WebGL uses one index for the full set of vertex attributes, so unique combinations must become unique render vertices.

**Why are there extra vertices at the sphere seam?**
The positions meet at the same place, but UV values must be both 0 and 1 on opposite sides of the texture seam. UVs are prepared but not sampled in M1.

**Is the color gradient lighting?**
No. It is a fixed object-space vertex color. It does not depend on a light or camera direction. Blinn–Phong arrives in M3.

**Why use a render loop for a static scene?**
The camera and UI still change. The loop redraws the scene and supports continuous keyboard input; it does not animate the planets yet.

**Are the planets physically accurate?**
No. Sizes and distances are deliberately adjusted for readability and labeled as illustrative.

**What remains for M2 and M3?**
M2: UV textures, developed custom shaders, and time-based spin/orbit animation. M3: fragment Blinn–Phong, a scene graph with an Earth–Moon parent–child chain, and further interaction. The initial camera/UI already provide interaction, but each owner must implement and explain their own assigned technique.
