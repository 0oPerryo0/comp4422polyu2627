#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec3 aNormal;

out vec2 vUV;

void main() {
    // Full-screen quad in NDC; z pushed just behind everything.
    vUV = aUV;
    gl_Position = vec4(aPosition.xy, 0.99999, 1.0);
}