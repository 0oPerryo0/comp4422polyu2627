#version 300 es
precision highp float;

in vec3 vColor;
out vec4 outColor;

void main() {
    // M1 uses vertex colors only. Textures and lighting belong to M2/M3.
    outColor = vec4(vColor, 1.0);
}
