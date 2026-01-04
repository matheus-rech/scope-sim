import * as THREE from 'three';

/**
 * Anatomically accurate ICA path through cavernous sinus
 * Based on: Paraclival -> Posterior Genu -> Horizontal -> Anterior Genu -> Clinoid
 */
export const createICACurve = (side: 'left' | 'right'): THREE.CatmullRomCurve3 => {
  const mirror = side === 'left' ? -1 : 1;
  
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.9 * mirror, -0.5, 8.5),   // Paraclival entry
    new THREE.Vector3(0.85 * mirror, -0.2, 9.0),  // Posterior genu
    new THREE.Vector3(0.8 * mirror, 0.0, 9.5),    // Horizontal segment
    new THREE.Vector3(0.7 * mirror, 0.2, 10.0),   // Anterior genu
    new THREE.Vector3(0.5 * mirror, 0.4, 10.5),   // Clinoid segment exit
  ]);
};

// Pre-computed ICA curves for both sides
export const LEFT_ICA_CURVE = createICACurve('left');
export const RIGHT_ICA_CURVE = createICACurve('right');

/**
 * Get distance from a point to nearest ICA point
 */
export const getDistanceToICA = (
  point: THREE.Vector3,
  icaCurves: THREE.CatmullRomCurve3[] = [LEFT_ICA_CURVE, RIGHT_ICA_CURVE]
): { distance: number; nearestPoint: THREE.Vector3; side: 'left' | 'right' } => {
  let minDistance = Infinity;
  let nearestPoint = new THREE.Vector3();
  let nearestSide: 'left' | 'right' = 'left';
  
  icaCurves.forEach((curve, index) => {
    for (let t = 0; t <= 1; t += 0.05) {
      const curvePoint = curve.getPoint(t);
      const dist = point.distanceTo(curvePoint);
      if (dist < minDistance) {
        minDistance = dist;
        nearestPoint = curvePoint.clone();
        nearestSide = index === 0 ? 'left' : 'right';
      }
    }
  });
  
  return { distance: minDistance, nearestPoint, side: nearestSide };
};

/**
 * Get Doppler signal strength based on ICA proximity
 * Returns 0-1 signal strength
 */
export const getICAdopplerStrength = (point: THREE.Vector3): number => {
  const { distance } = getDistanceToICA(point);
  
  // Signal strength falls off with distance squared
  // Full strength at 0.3cm, drops to 0 at 2cm
  if (distance < 0.3) return 1.0;
  if (distance > 2.0) return 0;
  
  return Math.pow(1 - (distance - 0.3) / 1.7, 2);
};
