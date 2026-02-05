uniform vec3 uCameraPosition;

varying vec3 vPosition;
varying vec3 vWorldPosition;

const int MAX_STEPS = 64;
const float MAX_DIST = 10.0;
const float SURF_DIST = 0.001;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float scene(vec3 p) {
    return sdSphere(p, 0.4);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        scene(p + e.xyy) - scene(p - e.xyy),
        scene(p + e.yxy) - scene(p - e.yxy),
        scene(p + e.yyx) - scene(p - e.yyx)
    ));
}

void main() {
    vec3 ro = uCameraPosition;
    vec3 rd = normalize(vWorldPosition - uCameraPosition);

    float t = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = scene(p);
        if (d < SURF_DIST) break;
        t += d;
        if (t > MAX_DIST) break;
    }

    if (t > MAX_DIST) {
        discard;
    }

    vec3 p = ro + rd * t;
    vec3 normal = calcNormal(p);

    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.15;
    vec3 color = vec3(0.4, 0.6, 0.9) * (diff + ambient);

    gl_FragColor = vec4(color, 1.0);
}
