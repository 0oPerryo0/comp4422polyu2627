#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform float uAspect;
uniform float uTime;

// Cheap pseudo-random hash for nebula wisps.
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
    vec2 uv = vUV;
    uv.x *= uAspect;

    // Base deep-space gradient: dark navy at top, near-black at bottom.
    vec3 top    = vec3(0.030, 0.045, 0.090);
    vec3 bottom = vec3(0.010, 0.010, 0.020);
    vec3 color = mix(bottom, top, vUV.y);

    // Soft purple nebula swirling slowly.
    float n1 = noise(uv * 1.5 + vec2(uTime * 0.008, 0.0));
    float n2 = noise(uv * 3.2 - vec2(0.0, uTime * 0.005));
    float nebula = smoothstep(0.45, 0.85, (n1 + n2) * 0.5);

    vec3 purple = vec3(0.14, 0.06, 0.22);
    vec3 teal   = vec3(0.05, 0.15, 0.18);
    vec3 nebulaColor = mix(purple, teal, n2);

    color = mix(color, nebulaColor, nebula * 0.55);

    // Vignette — darkened corners sell depth.
    vec2 c = uv - vec2(uAspect * 0.5, 0.5);
    float r = length(c);
    color *= 1.0 - smoothstep(0.65, 1.15, r) * 0.35;

    outColor = vec4(color, 1.0);
}