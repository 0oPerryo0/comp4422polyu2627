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
uniform int uOpticalType;   // 0=reflective 1=transmissive 2=absorbing 3=diffractive
uniform float uTime;

out vec4 outColor;

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

    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vWorldPosition);
    vec3 V = normalize(uCameraPos - vWorldPosition);
    vec3 H = normalize(L + V);
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float fres  = pow(1.0 - NdotV, 3.0);

    // ================= SUN (emissive, always) =================
    if (uIsSun == 1) {
        float rim = pow(1.0 - NdotV, 2.0);
        float pulse = 0.5 + 0.5 * sin(uTime * 1.8 + vWorldPosition.x * 3.0);
        vec3 hot  = vec3(1.0, 0.98, 0.85);
        vec3 core = vec3(1.0, 0.72, 0.30);
        vec3 color = mix(core, hot, rim * pulse);
        color += vec3(0.6, 0.35, 0.1) * rim;
        outColor = vec4(color * 1.4, 1.0);
        return;
    }

    // ================= OPTICAL CLASSES =================
    vec3 color;

    if (uOpticalType == 0) {
        // ---- REFLECTIVE: sharp specular + metallic rim ----
        vec3 ambient = 0.08 * baseColor;
        vec3 diffuse = NdotL * baseColor * vec3(1.02, 0.96, 0.88);
        float spec = pow(NdotH, 96.0);
        vec3 specular = vec3(1.0) * spec * 0.9;
        vec3 rimColor = vec3(0.75, 0.85, 1.0) * fres * 0.35;
        color = ambient + diffuse + specular + rimColor;
    } else if (uOpticalType == 1) {
        // ---- TRANSMISSIVE: backlit glow bleeding through ----
        float backlight = max(-dot(N, L), 0.0);
        vec3 transmission = vec3(0.55, 0.85, 1.0) * backlight * 1.1;
        vec3 ambient = 0.10 * baseColor;
        vec3 diffuse = NdotL * baseColor * 0.55;
        float spec = pow(NdotH, 48.0);
        vec3 specular = vec3(0.7, 0.9, 1.0) * spec * 0.55;
        vec3 edgeGlow = vec3(0.4, 0.7, 1.0) * fres * 0.9;
        color = ambient + diffuse + transmission + specular + edgeGlow;
    } else if (uOpticalType == 2) {
        // ---- ABSORBING: dark body, faint warm rim on lit silhouette ----
        vec3 ambient = 0.03 * baseColor;
        vec3 diffuse = NdotL * baseColor * 0.25;

        vec3 hotRim = vec3(1.0, 0.45, 0.15) * fres * NdotL * 0.6;

        color = ambient + diffuse + hotRim;
    } else {
        // ---- DIFFRACTIVE: thin-film interference (iridescent rim) ----
        // Physically motivated: rainbow appears at grazing angles (fres),
        // shades of the rainbow shift with viewing angle, dark side stays dark.
        vec3 ambient = 0.06 * baseColor;
        vec3 diffuse = NdotL * baseColor * 0.55;

        // Thin-film band: use view angle. Higher frequency near silhouette
        // (fres grows as NdotV drops), so the rainbow "concentrates" at edges.
        float filmPhase = dot(N, V) * 5.0 + uTime * 0.15;
        vec3 iridescent = 0.5 + 0.5 * cos(6.2831 * (filmPhase + vec3(0.0, 0.33, 0.67)));

        // Rainbow only where the surface is grazing to the camera (fres).
        // Small NdotL factor so it's *lit* — but edges stay iridescent even in shadow.
        vec3 thinFilm = iridescent * fres * (0.35 + 0.65 * NdotL);

        // Small specular highlight stays light-dependent.
        float spec = pow(NdotH, 96.0);
        vec3 specular = iridescent * spec * 0.6;

        color = ambient + diffuse + thinFilm * 2.0 + specular;
    }

    // Universal cool atmosphere rim for readability across classes.
    color += vec3(0.25, 0.45, 0.85) * pow(1.0 - NdotV, 4.0) * 0.35;

    outColor = vec4(color, 1.0);
}