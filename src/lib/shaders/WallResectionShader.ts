import * as THREE from 'three';

// Vertex shader - passes UV and world position to fragment
export const wallVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec4 mvPosition = viewMatrix * worldPos;
    vViewDirection = normalize(-mvPosition.xyz);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader - alpha masking based on wall grid texture
export const wallFragmentShader = `
  precision highp float;
  
  uniform sampler2D uWallGridTexture;
  uniform vec3 uBaseColor;
  uniform vec3 uEdgeColor;
  uniform float uWetness;
  uniform float uTime;
  uniform float uToolActive;
  uniform vec2 uToolUV;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  
  void main() {
    // Sample the 10x10 wall grid at this UV position
    float integrity = texture2D(uWallGridTexture, vUv).r;
    
    // Smooth edge for organic peeling (not hard cutoff)
    float alpha = smoothstep(0.0, 0.2, integrity);
    
    // Discard fully resected pixels
    if (alpha < 0.01) discard;
    
    // Base tissue color
    vec3 color = uBaseColor;
    
    // Add edge glow for active resection zones (tissue is partially removed)
    float edgeFactor = smoothstep(0.5, 0.1, integrity) * smoothstep(0.0, 0.1, integrity);
    color = mix(color, uEdgeColor, edgeFactor * 0.6);
    
    // Wetness/specular effect - fresnel-like rim lighting
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), 3.0);
    color += vec3(1.0) * fresnel * uWetness * 0.3;
    
    // Subtle breathing/pulsation animation
    float pulse = 1.0 + sin(uTime * 1.5) * 0.02;
    color *= pulse;
    
    // Tool proximity glow when actively resecting
    if (uToolActive > 0.5) {
      float toolDist = distance(vUv, uToolUV);
      float toolGlow = smoothstep(0.15, 0.0, toolDist) * 0.3;
      color = mix(color, vec3(1.0, 0.8, 0.7), toolGlow);
    }
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// ICA pulsation shader for realistic arterial appearance
export const icaVertexShader = `
  uniform float uHeartbeatPhase;
  uniform float uPulseMagnitude;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Pulsate outward along normal
    float pulse = 1.0 + sin(uHeartbeatPhase) * uPulseMagnitude;
    vec3 pulsedPosition = position + normal * (pulse - 1.0) * 0.02;
    
    vec4 worldPos = modelMatrix * vec4(pulsedPosition, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const icaFragmentShader = `
  precision highp float;
  
  uniform vec3 uBaseColor;
  uniform float uHeartbeatPhase;
  uniform float uEmissiveStrength;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    // Base arterial red
    vec3 color = uBaseColor;
    
    // Pulsating brightness
    float pulse = 0.9 + sin(uHeartbeatPhase) * 0.1;
    color *= pulse;
    
    // Add slight emissive glow
    color += uBaseColor * uEmissiveStrength * 0.2;
    
    // Simple lighting
    vec3 lightDir = normalize(vec3(0.0, 0.0, -1.0));
    float diffuse = max(dot(vNormal, lightDir), 0.3);
    color *= diffuse;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Grid dimensions matching inputRefs.wallGrid
const GRID_SIZE = 10;

/**
 * Creates a DataTexture from the Float32Array wallGrid.
 * The texture stores integrity values in the Red channel.
 */
export function createWallGridTexture(wallGrid: Float32Array): THREE.DataTexture {
  // Create RGBA data (4 channels) for compatibility
  const data = new Float32Array(GRID_SIZE * GRID_SIZE * 4);
  
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const value = wallGrid[i];
    data[i * 4 + 0] = value; // R = integrity
    data[i * 4 + 1] = value; // G
    data[i * 4 + 2] = value; // B
    data[i * 4 + 3] = 1.0;   // A = always 1
  }
  
  const texture = new THREE.DataTexture(
    data,
    GRID_SIZE,
    GRID_SIZE,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Updates an existing DataTexture from the wallGrid without reallocating.
 * Call this every frame to reflect resection progress.
 */
export function updateWallGridTexture(
  texture: THREE.DataTexture,
  wallGrid: Float32Array
): void {
  const data = texture.image.data as Float32Array;
  
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const value = wallGrid[i];
    data[i * 4 + 0] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
  }
  
  texture.needsUpdate = true;
}

/**
 * Creates shader uniforms for the wall resection material
 */
export function createWallUniforms(wallGridTexture: THREE.DataTexture) {
  return {
    uWallGridTexture: { value: wallGridTexture },
    uBaseColor: { value: new THREE.Color(0.7, 0.68, 0.75) }, // Dura tissue color
    uEdgeColor: { value: new THREE.Color(0.9, 0.3, 0.25) },  // Exposed tissue edge
    uWetness: { value: 0.4 },
    uTime: { value: 0 },
    uToolActive: { value: 0 },
    uToolUV: { value: new THREE.Vector2(0.5, 0.5) },
  };
}

/**
 * Creates shader uniforms for the ICA pulsation material
 */
export function createICAUniforms() {
  return {
    uBaseColor: { value: new THREE.Color(0.8, 0.15, 0.1) }, // Arterial red
    uHeartbeatPhase: { value: 0 },
    uPulseMagnitude: { value: 0.03 },
    uEmissiveStrength: { value: 0.3 },
  };
}
