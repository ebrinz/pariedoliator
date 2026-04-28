export const VHS_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
out vec2 vUV;
void main() {
  vUV = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const VHS_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUV;

  // Layer 6: Barrel distortion
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);
  uv = 0.5 + centered * (1.0 + 0.08 * r2);

  // Layer 3: Tracking distortion (bottom 20%)
  float trackingZone = smoothstep(0.2, 0.0, uv.y);
  float trackingWave = sin(uv.y * 60.0 + uTime * 2.0) * 0.5 + 0.5;
  float trackingNoise = hash(vec2(floor(uv.y * 200.0), uTime * 10.0));
  float trackingOffset = trackingZone * (trackingWave * 0.02 + trackingNoise * 0.015);
  vec2 trackUV = vec2(uv.x + trackingOffset, uv.y);

  // Layer 2: Chromatic aberration
  float caAmount = 1.5 / uResolution.x;
  float r = texture(uTexture, trackUV + vec2(-caAmount, 0.0)).r;
  float g = texture(uTexture, trackUV).g;
  float b = texture(uTexture, trackUV + vec2(caAmount, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Layer 1: Scanlines
  float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
  color *= 0.85 + 0.15 * scanline;

  // Layer 4: Horizontal noise bars
  float barY = fract(uTime * 0.7);
  float barDist = abs(uv.y - barY);
  float bar = smoothstep(0.01, 0.0, barDist) * hash(vec2(uv.x * 100.0, uTime));
  float barY2 = fract(uTime * 1.3 + 0.5);
  float barDist2 = abs(uv.y - barY2);
  float bar2 = smoothstep(0.008, 0.0, barDist2) * hash(vec2(uv.x * 80.0, uTime + 5.0));
  color += vec3(bar + bar2) * 0.4;

  // Layer 5: Phosphor glow (3-tap box approximation)
  vec2 texel = 1.0 / uResolution;
  vec3 bloomSample = texture(uTexture, trackUV + vec2(texel.x, 0.0)).rgb
                   + texture(uTexture, trackUV - vec2(texel.x, 0.0)).rgb
                   + texture(uTexture, trackUV).rgb;
  bloomSample /= 3.0;
  float bloomBright = dot(bloomSample, vec3(0.299, 0.587, 0.114));
  color += bloomSample * smoothstep(0.5, 1.0, bloomBright) * 0.15;

  // Layer 6: Vignette
  float vignette = 1.0 - r2 * 1.5;
  color *= clamp(vignette, 0.0, 1.0);

  // Layer 7: Film grain
  float grain = (hash(uv * uResolution + uTime * 1000.0) - 0.5) * 0.06;
  color += grain;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
