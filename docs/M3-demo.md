# M3 Demo Guide

This document outlines the features to demonstrate for the M3 milestone.

## What to Show (2-3 Minutes)

1. **Blinn-Phong Lighting (Fragment Shader)**
   - Open `shaders/scene.frag`.
   - Point out the **ambient**, **diffuse**, and **specular** calculations.
   - Explain that lighting is calculated per-pixel.
   - Show how the Sun is the main light source (`uLightPos`).

2. **Scene Graph**
   - Open `src/scene/create-solar-system.js`.
   - Point out the parent-child chain: `earthBodyNode.add(moonPivot)`.
   - Explain how `worldMatrix = parentWorld * localMatrix` in `scene-node.js` makes the Moon inherit Earth's movement automatically.
   - Mention there are 11 instances total (Sun, 8 planets, Moon, Surveyor).

3. **User Interactions**
   - **Click to focus:** Left-click a planet to make the camera follow it (uses ray-sphere intersection in `main.js`).
   - **Optical Classes:** Select a planet in the sidebar and click "Absorbing" or "Diffractive" to see the shader switch lighting branches.
   - **Move the Light:** Right-click anywhere in the scene to move the Sun's light source. Watch the Sun dim and the planets re-light from the new direction.

## What is NOT in M3
- **Bump Mapping:** The shader supports it, but it is disabled on Earth due to UV alignment issues, and only partially enabled on other planets. Do not claim it in the video.
- **Comets/Asteroids:** Replaced by the Surveyor probe hopping between planets.

## Running the Demo
1. `npm start`
2. Open `http://127.0.0.1:4173`
3. Follow the script above.
