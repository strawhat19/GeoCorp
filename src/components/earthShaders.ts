// One sphere handles both loading and the landing page. The camera's view-space
// coordinates keep the water surface level as the geographic view rotates.
export const globeVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
  }
`;

// The endpoints extend beyond the silhouette: an empty globe has no stray
// liquid at its foot, and a full globe has no remaining glass cap or wave.
const liquidField = `
  float progress = clamp(fillProgress, 0.0, 1.0);
  float edgeFade = smoothstep(0.0, 0.06, progress) * (1.0 - smoothstep(0.94, 1.0, progress));
  float wave = (
    sin(vViewPosition.x * 6.4 + liquidTime * 1.9) * 0.026 +
    sin(vViewPosition.x * 11.2 - liquidTime * 1.25 + 0.7) * 0.012
  ) * edgeFade;
  float liquidHeight = mix(-1.065, 1.065, progress) + wave;
  float liquidDepth = liquidHeight - vViewPosition.y;
  float filled = smoothstep(-0.014, 0.014, liquidDepth);
`;

export const surfaceFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  uniform float fillProgress;
  uniform float launchMix;
  uniform float liquidTime;
  uniform float texturesReady;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  void main() {
    vec3 detail = texture2D(detailMap, vUv).rgb;
    float heightX = texture2D(detailMap, vUv + vec2(0.0005, 0.0)).r - detail.r;
    float heightY = texture2D(detailMap, vUv + vec2(0.0, 0.0005)).r - detail.r;
    vec3 tangent = normalize(vec3(-vNormal.z, 0.0, vNormal.x));
    vec3 bitangent = normalize(cross(vNormal, tangent));
    vec3 normal = normalize(vNormal + tangent * heightX * 1.8 + bitangent * heightY * 1.8);
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float light = dot(normal, sunDirection);
    float daylight = smoothstep(-0.16, 0.22, light);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float diffuse = max(light, 0.0) * 1.15 + 0.11;
    vec3 color = day * diffuse * mix(0.035, 1.0, daylight);
    color += night * (1.0 - smoothstep(-0.24, 0.18, light)) * 1.4;
    float specular = pow(max(dot(normal, normalize(sunDirection + viewDirection)), 0.0), 70.0);
    color += vec3(0.6, 0.82, 1.0) * specular * (1.0 - detail.g) * 0.45;
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5);
    color += vec3(0.10, 0.36, 0.63) * fresnel * daylight * 0.48;

    ${liquidField}
    float loading = clamp(launchMix, 0.0, 1.0);
    float ready = clamp(texturesReady, 0.0, 1.0);
    float finish = 1.0 - smoothstep(0.86, 1.0, progress);
    float facing = max(dot(normalize(vNormal), viewDirection), 0.0);
    float glassRim = pow(1.0 - facing, 3.2);
    float meridians = 1.0 - smoothstep(0.025, 0.07, abs(sin(vUv.x * 75.398224)));
    float parallels = 1.0 - smoothstep(0.025, 0.07, abs(sin(vUv.y * 37.699112)));
    float grid = max(meridians, parallels) * (0.35 + facing * 0.65);
    vec3 glass = vec3(0.002, 0.008, 0.016);
    glass += day * ready * 0.032;
    glass += vec3(0.018, 0.071, 0.105) * grid;
    glass += vec3(0.12, 0.42, 0.59) * glassRim * 0.5;

    // A quiet watery sphere is available even before the texture requests have
    // completed; the actual continents emerge when those textures arrive.
    float waterLight = 0.46 + facing * 0.54;
    vec3 water = vec3(0.008, 0.16, 0.27) * waterLight;
    water += vec3(0.08, 0.34, 0.47) * glassRim * 0.36;
    water += vec3(0.012, 0.053, 0.066) * grid;
    vec3 submerged = color + vec3(0.006, 0.032, 0.041) * finish;
    submerged = mix(water, submerged, ready);
    vec3 loadingColor = mix(glass, submerged, filled);

    // A narrow highlight and a soft band below it suggest the curved meniscus
    // without drawing a rigid line through the entire globe.
    float meniscus = (1.0 - smoothstep(0.0, 0.018, abs(liquidDepth))) * edgeFade;
    float surfaceGlow = exp(-max(liquidDepth, 0.0) * 22.0) * filled * edgeFade;
    loadingColor += vec3(0.30, 0.81, 0.91) * meniscus * 0.7;
    loadingColor += vec3(0.018, 0.12, 0.16) * surfaceGlow;
    color = mix(color, loadingColor, loading);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const cloudsFragment = `
  uniform sampler2D detailMap;
  uniform vec3 sunDirection;
  uniform float fillProgress;
  uniform float launchMix;
  uniform float liquidTime;
  uniform float texturesReady;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  void main() {
    float cloud = smoothstep(0.22, 0.95, texture2D(detailMap, vUv).b);
    float light = dot(normalize(vNormal), sunDirection);
    float brightness = max(light, 0.0) * 0.9 + 0.16;
    ${liquidField}
    float loading = clamp(launchMix, 0.0, 1.0);
    float cloudReveal = mix(1.0, filled * clamp(texturesReady, 0.0, 1.0), loading);
    gl_FragColor = vec4(vec3(0.87, 0.94, 1.0) * brightness, cloud * 0.85 * cloudReveal);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const atmosphereFragment = `
  uniform vec3 sunDirection;
  uniform float fillProgress;
  uniform float launchMix;
  uniform float liquidTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 4.5);
    float daylight = smoothstep(-0.45, 0.8, dot(normalize(vNormal), sunDirection));
    ${liquidField}
    float loading = clamp(launchMix, 0.0, 1.0) * (1.0 - smoothstep(0.86, 1.0, progress));
    vec3 atmosphereColor = mix(vec3(0.12, 0.48, 0.9), vec3(0.10, 0.54, 0.68), loading);
    float landingAlpha = rim * daylight * 0.52;
    float glassAlpha = rim * (0.12 + filled * 0.16);
    gl_FragColor = vec4(atmosphereColor, mix(landingAlpha, glassAlpha, loading));
  }
`;
