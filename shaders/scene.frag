#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vColor;

uniform sampler2D uTexture;
uniform vec3 uTint;
uniform int uUseTexture;

out vec4 outColor;

void main() {
    if (uUseTexture == 1) {
        outColor = texture(uTexture, vUV) * vec4(uTint, 1.0);
    } else {
        outColor = vec4(vColor, 1.0) * vec4(uTint, 1.0);
    }
}
