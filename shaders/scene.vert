#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aUV;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uPointSize;

out vec2 vUV;
out vec3 vColor;

void main() {
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    gl_PointSize = uPointSize;
    vUV = aUV;
    vColor = aColor;
}
