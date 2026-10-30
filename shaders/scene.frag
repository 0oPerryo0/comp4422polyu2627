#version 300 es
precision highp float;

in vec2 vUV;
in vec3 vColor;
in vec3 vNormal;
in vec3 vWorldPosition;

uniform sampler2D uTexture;
uniform vec3 uTint;
uniform int uUseTexture;

uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform int uIsSun;
uniform int uOpticalType;
uniform float uTime;
uniform float uSunPower;

out vec4 outColor;

vec3 filmicContrast(vec3 x) {
    vec3 y = x / (x + vec3(0.9));
    return mix(y, x, 0.25);
}

void main() {
    vec3 baseColor;
    if (uUseTexture == 1) {
        vec2 uv = vUV;
        if (uIsSun == 0) {
            uv.x += sin(uTime * 0.03 + uv.y * 6.0) * 0.003;
            uv.y += cos(uTime * 0.02 + uv.x * 5.0) * 0.002;
        }
        baseColor = texture(uTexture, uv).rgb * uTint;
    } else {
        baseColor = vColor * uTint;
    }

    // ---- Guard: fragments without a real normal (stars, orbit lines) ----
    // Skip lighting entirely and output the base color. Prevents NaN
    // propagation from normalize(vec3(0.0)) through all the dot products.
    if (length(vNormal) < 0.001) {
        outColor = vec4(baseColor, 1.0);
        return;
    }

    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vWorldPosition);
    vec3 V = normalize(uCameraPos - vWorldPosition);
    vec3 H = normalize(L + V);
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float fres  = pow(1.0 - NdotV, 3.0);

    float edgeDarken = 0.55 + 0.45 * pow(NdotV, 0.4);

    vec3 warmKey = vec3(1.00, 0.92, 0.78);
    vec3 coolFill = vec3(0.30, 0.42, 0.62);

    vec3 ambient = mix(
        baseColor * vec3(0.22, 0.17, 0.14),
        baseColor * coolFill * 0.55,
        0.5 + 0.5 * N.y
    );

    // ================= SUN =================
    if (uIsSun == 1) {
        float rim = pow(1.0 - NdotV, 2.0);
        float pulse = 0.5 + 0.5 * sin(uTime * 1.8 + vWorldPosition.x * 3.0);
        vec3 hot  = vec3(1.0, 0.98, 0.85);
        vec3 core = vec3(1.0, 0.72, 0.30);

        vec3 dimHot  = vec3(0.55, 0.42, 0.28);
        vec3 dimCore = vec3(0.38, 0.20, 0.08);

        vec3 activeHot  = mix(dimHot,  hot,  uSunPower);
        vec3 activeCore = mix(dimCore, core, uSunPower);

        vec3 color = mix(activeCore, activeHot, rim * pulse);
        color += vec3(0.5, 0.30, 0.10) * rim * uSunPower;
        color *= mix(0.45, 1.0, uSunPower);

        float drain = 1.0 - uSunPower;
        float ember = (0.5 + 0.5 * sin(uTime * 0.8)) * drain;
        color += vec3(0.35, 0.12, 0.02) * ember * (1.0 - NdotV);

        outColor = vec4(color, 1.0);
        return;
    }

    vec3 color;

    if (uOpticalType == 0) {
        vec3 diffuse = NdotL * baseColor * warmKey;
        float spec = pow(NdotH, 128.0);
        vec3 specular = vec3(1.0, 0.92, 0.78) * spec * 1.1;
        vec3 rimColor = coolFill * fres * 0.75;
        vec3 shadowFill = baseColor * coolFill * 0.20 * (1.0 - NdotL);
        color = ambient + diffuse + specular + rimColor + shadowFill;
    } else if (uOpticalType == 1) {
        float backlight = max(-dot(N, L), 0.0);
        vec3 transmission = vec3(0.5, 0.8, 1.0) * backlight * 0.9;
        vec3 diffuse = NdotL * baseColor * warmKey * 0.55;
        float spec = pow(NdotH, 48.0);
        vec3 specular = vec3(0.75, 0.9, 1.0) * spec * 0.5;
        vec3 edgeGlow = vec3(0.4, 0.7, 1.0) * fres * 0.7;
        color = ambient + diffuse + transmission + specular + edgeGlow;
    } else if (uOpticalType == 2) {
        vec3 diffuse = NdotL * baseColor * warmKey * 0.3;
        vec3 hotRim = vec3(1.0, 0.45, 0.15) * fres * NdotL * 0.7;
        color = ambient * 0.5 + diffuse + hotRim;
    } else {
        vec3 diffuse = NdotL * baseColor * warmKey * 0.55;
        float filmPhase = dot(N, V) * 5.0 + uTime * 0.15;
        vec3 iridescent = 0.5 + 0.5 * cos(6.2831 * (filmPhase + vec3(0.0, 0.33, 0.67)));
        vec3 thinFilm = iridescent * fres * (0.35 + 0.65 * NdotL);
        float spec = pow(NdotH, 96.0);
        vec3 specular = iridescent * spec * 0.5;
        color = ambient + diffuse + thinFilm * 1.0 + specular;
    }

    color *= edgeDarken;
    color += coolFill * pow(1.0 - NdotV, 4.0) * 0.35;
    color = filmicContrast(color);

    outColor = vec4(color, 1.0);
}