import * as THREE from 'three';

/**
 * SURGICAL-GRADE ICA GEOMETRY
 * 
 * Anatomically accurate Internal Carotid Artery path through the cavernous sinus.
 * 
 * Coordinate System (matching existing scene):
 * - Origin (0,0,0) is the nostril entry point
 * - Z axis: Positive towards deep structures (Sella at ~10)
 * - Y axis: Superior (+) to Inferior (-)
 * - X axis: Right (+) to Left (-)
 * 
 * The ICA forms an "S-shaped Siphon" with the critical danger zone at the
 * Anterior Genu, which projects MEDIALLY towards the pituitary ("Medial Kiss").
 * 
 * Key anatomical points relative to scene coordinates:
 * - Nasal corridor: Z = 0-5
 * - Sphenoid sinus: Z = 5-7
 * - Sella/Cavernous: Z = 8-11
 */

// --- 1. ANATOMICAL TRUTH ---
export const createICACurve = (side: 'left' | 'right'): THREE.CatmullRomCurve3 => {
  const m = side === 'left' ? -1 : 1; // Mirror X-axis for left side

  return new THREE.CatmullRomCurve3([
    // C5 (Paraclival): Ascends vertically at deep skull base
    new THREE.Vector3(1.1 * m, -1.5, 8.0),
    
    // Posterior Genu: Sharp 90-degree bend forward
    new THREE.Vector3(1.15 * m, -0.5, 8.8),
    
    // C4 (Cavernous): Horizontal segment running alongside the pituitary
    new THREE.Vector3(1.0 * m, 0.0, 9.3),
    
    // C3 (Anterior Genu): The "Medial Kiss" - Deviates INWARD (0.65 vs 1.0)
    // This brings it dangerously close to the medial wall resection path.
    new THREE.Vector3(0.65 * m, 0.8, 9.8),
    
    // C2 (Clinoid): Exits the cavernous sinus roof
    new THREE.Vector3(0.9 * m, 1.8, 10.3),
  ], false, 'catmullrom', 0.5);
};

// --- 2. PERFORMANCE: LOOKUP TABLES (LUT) ---
// Generate geometry ONCE at startup, not every frame.
const LUT_RESOLUTION = 100; // High resolution for precise distance calculation

export const LEFT_ICA_CURVE = createICACurve('left');
export const RIGHT_ICA_CURVE = createICACurve('right');

// Pre-computed spaced points for O(n) distance lookup
const leftICAPoints = LEFT_ICA_CURVE.getSpacedPoints(LUT_RESOLUTION);
const rightICAPoints = RIGHT_ICA_CURVE.getSpacedPoints(LUT_RESOLUTION);

// Reusable vectors to prevent Garbage Collection stutter during 60 FPS loop
const _tempVec = new THREE.Vector3();
const _closestPoint = new THREE.Vector3();
const _segStart = new THREE.Vector3();
const _segEnd = new THREE.Vector3();
const _toolVec = new THREE.Vector3();
const _segDir = new THREE.Vector3();

// --- 3. PHYSICS: SEGMENT PROJECTION FOR INFINITE PRECISION ---
/**
 * Get ICA proximity metrics with smooth distance calculation.
 * Uses segment projection instead of discrete point sampling.
 * 
 * @param toolPos - Tool/endoscope tip position in world coordinates
 * @param time - Current time for heartbeat pulsatility (seconds)
 * @returns Object with signal strength, raw intensity, and distance
 */
export interface ICAMetrics {
  /** Signal strength for audio gain (0-1, includes pulsatility) */
  signal: number;
  /** Raw intensity without pulsatility (for visual bars) */
  rawIntensity: number;
  /** Actual distance to nearest ICA in cm */
  distance: number;
  /** Which artery is closer */
  nearestSide: 'left' | 'right';
  /** Danger level based on proximity */
  dangerLevel: 'safe' | 'caution' | 'warning' | 'critical';
}

export const getICAMetrics = (toolPos: THREE.Vector3, time: number): ICAMetrics => {
  // Optimization: Bounding box check. If in nasal cavity (Z < 7), skip expensive math.
  // ICA is only relevant in cavernous sinus region (Z > 7.5)
  if (toolPos.z < 7.5) {
    return { 
      signal: 0, 
      rawIntensity: 0, 
      distance: Infinity, 
      nearestSide: 'left',
      dangerLevel: 'safe',
    };
  }

  let minSqDist = Infinity;
  let nearestSide: 'left' | 'right' = 'left';

  // Check both arteries using segment projection
  const checkArtery = (points: THREE.Vector3[], side: 'left' | 'right') => {
    for (let i = 0; i < points.length - 1; i++) {
      _segStart.copy(points[i]);
      _segEnd.copy(points[i + 1]);

      // Get segment direction vector
      _segDir.subVectors(_segEnd, _segStart);
      const segLenSq = _segDir.lengthSq();

      // t = normalized projection (0 to 1 along segment)
      let t = 0;
      if (segLenSq > 0) {
        _toolVec.subVectors(toolPos, _segStart);
        t = _toolVec.dot(_segDir) / segLenSq;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment
      }

      // Get exact closest point on the line segment
      _closestPoint.copy(_segStart).addScaledVector(_segDir, t);

      const dSq = toolPos.distanceToSquared(_closestPoint);
      if (dSq < minSqDist) {
        minSqDist = dSq;
        nearestSide = side;
      }
    }
  };

  checkArtery(leftICAPoints, 'left');
  checkArtery(rightICAPoints, 'right');

  const distance = Math.sqrt(minSqDist);

  // --- 4. PHYSIOLOGICAL AUDIO LOGIC ---
  const MAX_RANGE = 1.5;  // cm - Audible range of micro-Doppler
  const PEAK_RANGE = 0.2; // cm - Touching dura

  if (distance > MAX_RANGE) {
    return { 
      signal: 0, 
      rawIntensity: 0, 
      distance, 
      nearestSide,
      dangerLevel: 'safe',
    };
  }

  // A. Inverse Square Law (Realistic Sound Falloff)
  // Sound swells dramatically as you approach - not linear fade
  const normalizedDist = (distance - PEAK_RANGE) / (MAX_RANGE - PEAK_RANGE);
  const rawIntensity = Math.pow(Math.max(0, 1 - normalizedDist), 2);

  // B. Pulsatility (Heartbeat Simulation at 70 BPM)
  // Doppler isn't a static beep; it swooshes with the arterial pulse
  const pulse = Math.sin(time * 2 * Math.PI * (70 / 60));
  const pulseFactor = 0.6 + (0.4 * pulse); // Never fully silent (diastolic flow)

  const signal = rawIntensity * pulseFactor;

  // Determine danger level
  let dangerLevel: 'safe' | 'caution' | 'warning' | 'critical' = 'safe';
  if (distance < 0.3) dangerLevel = 'critical';
  else if (distance < 0.5) dangerLevel = 'warning';
  else if (distance < 1.0) dangerLevel = 'caution';

  return {
    signal,
    rawIntensity,
    distance,
    nearestSide,
    dangerLevel,
  };
};

// --- LEGACY COMPATIBILITY ---
// These functions maintain backward compatibility with existing code

/**
 * @deprecated Use getICAMetrics() for precise calculation
 */
export const getDistanceToICA = (
  point: THREE.Vector3,
): { distance: number; nearestPoint: THREE.Vector3; side: 'left' | 'right' } => {
  const metrics = getICAMetrics(point, Date.now() / 1000);
  
  // Find the approximate nearest point for legacy API
  const nearestPoint = new THREE.Vector3();
  const points = metrics.nearestSide === 'left' ? leftICAPoints : rightICAPoints;
  let minDist = Infinity;
  
  for (const p of points) {
    const d = point.distanceTo(p);
    if (d < minDist) {
      minDist = d;
      nearestPoint.copy(p);
    }
  }
  
  return { 
    distance: metrics.distance, 
    nearestPoint, 
    side: metrics.nearestSide,
  };
};

/**
 * @deprecated Use getICAMetrics().rawIntensity for signal strength
 */
export const getICAdopplerStrength = (point: THREE.Vector3): number => {
  const metrics = getICAMetrics(point, Date.now() / 1000);
  return metrics.rawIntensity;
};
