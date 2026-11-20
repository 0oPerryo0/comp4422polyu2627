#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform vec2  uSunNdc;
uniform float uAspect;
uniform float uIntensity;
uniform float uTime;

void main() {
    vec2 d = vUV * 2.0 - 1.0;
    d.x *= uAspect;
    vec2 sun = uSunNdc;
    sun.x *= uAspect;
    float r = length(d - sun);

    // Stronger core + halo than before, tighter haze.
    float core  = smoothstep(0.18, 0.01, r) * 1.2;
    float halo  = smoothstep(0.55, 0.02, r) * 0.25;
    float haze  = smoothstep(1.00, 0.20, r) * 0.06;

    vec2 sd = d - sun;
    float streakX = smoothstep(0.030, 0.0, abs(sd.y)) * smoothstep(0.80, 0.05, abs(sd.x)) * 0.09;
    float streakY = smoothstep(0.030, 0.0, abs(sd.x)) * smoothstep(0.80, 0.05, abs(sd.y)) * 0.09;

    float pulse = 0.94 + 0.06 * sin(uTime * 1.3);

    vec3 warm = vec3(1.0, 0.68, 0.28);
    vec3 hot  = vec3(1.0, 0.95, 0.80);
    vec3 tint = mix(warm, hot, clamp(core, 0.0, 1.0));

    float total = (core + halo + haze + streakX + streakY) * pulse * uIntensity;
    outColor = vec4(tint * total, 1.0);
}