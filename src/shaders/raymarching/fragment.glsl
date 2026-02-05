precision highp float;
precision highp sampler3D;

// cameraPosition is a Three.js built-in, auto-updated by the renderer
uniform sampler3D uVoxelData;
uniform vec3 uBoxSize;

in vec3 vPosition;
in vec3 vWorldPosition;

out vec4 fragColor;

const int MAX_STEPS = 128;

vec3 toUVW(vec3 p) {
    return p / uBoxSize + 0.5;
}

bool outsideBox(vec3 uvw) {
    return any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)));
}

float sampleDensity(vec3 p) {
    vec3 uvw = toUVW(p);
    if (outsideBox(uvw)) return 0.0;
    // local X -> texture X (grid col), local Z -> texture Y (grid row), local Y -> texture Z (slice height)
    return texture(uVoxelData, vec3(uvw.x, uvw.z, uvw.y)).r;
}

vec3 calcNormal(vec3 p) {
    float e = 0.02 * max(uBoxSize.x, max(uBoxSize.y, uBoxSize.z));
    return -normalize(vec3(
        sampleDensity(p + vec3(e, 0, 0)) - sampleDensity(p - vec3(e, 0, 0)),
        sampleDensity(p + vec3(0, e, 0)) - sampleDensity(p - vec3(0, e, 0)),
        sampleDensity(p + vec3(0, 0, e)) - sampleDensity(p - vec3(0, 0, e))
    ));
}

void main() {
    vec3 rd = normalize(vWorldPosition - cameraPosition);
    float stepSize = length(uBoxSize) / float(MAX_STEPS);
    vec3 p = vPosition;

    bool hit = false;
    for (int i = 0; i < MAX_STEPS; i++) {
        if (sampleDensity(p) > 0.5) {
            hit = true;
            break;
        }
        p += rd * stepSize;
        if (outsideBox(toUVW(p))) break;
    }

    if (!hit) {
        discard;
    }

    vec3 normal = calcNormal(p);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.15;
    vec3 color = vec3(0.4, 0.6, 0.9) * (diff + ambient);

    fragColor = vec4(color, 1.0);
}
