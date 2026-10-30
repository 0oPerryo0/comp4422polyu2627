#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uNormalMatrix;
uniform float uPointSize;

out vec2 vUV;
out vec3 vColor;
out vec3 vNormal;
out vec3 vWorldPosition;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPosition = worldPos.xyz;

    vec3 worldNormal = mat3(uNormalMatrix) * aNormal;
    vNormal = length(worldNormal) > 0.001 ? normalize(worldNormal) : vec3(0.0);

    gl_Position = uProjection * uView * worldPos;
    gl_PointSize = uPointSize;
    vUV = aUV;
    vColor = aColor;
}