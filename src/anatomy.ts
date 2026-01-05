/**
 * Anatomy Data - ICA Path and Anatomical Structure Definitions
 * Matches Schema: src/anatomy.ts
 */

import * as THREE from 'three';

/**
 * Internal Carotid Artery Logic Path
 * 
 * The ICA courses lateral to the sella turcica. This path represents
 * the 3D trajectory for collision detection and Doppler simulation.
 * 
 * Coordinates are in cm relative to the surgical field center (0,0,0):
 * - X: Left-Right (negative = left, positive = right)
 * - Y: Inferior-Superior (negative = inferior, positive = superior)
 * - Z: Anterior-Posterior (depth into nasal cavity)
 */

// Left ICA path (surgeon's right when viewing from anterior)
export const ICA_LEFT_PATH: THREE.Vector3[] = [
  new THREE.Vector3(-1.5, -1.2, 8),   // Petrous segment (inferior)
  new THREE.Vector3(-1.4, -0.6, 9),   // Cavernous segment
  new THREE.Vector3(-1.2, 0.0, 10),   // Parasellar segment
  new THREE.Vector3(-1.0, 0.5, 11),   // Clinoid segment
  new THREE.Vector3(-0.8, 1.0, 12),   // Ophthalmic segment (superior)
];

// Right ICA path (surgeon's left when viewing from anterior)
export const ICA_RIGHT_PATH: THREE.Vector3[] = [
  new THREE.Vector3(1.5, -1.2, 8),
  new THREE.Vector3(1.4, -0.6, 9),
  new THREE.Vector3(1.2, 0.0, 10),
  new THREE.Vector3(1.0, 0.5, 11),
  new THREE.Vector3(0.8, 1.0, 12),
];

// Combined path for both ICAs (for legacy compatibility)
export const ICA_LOGIC_PATH = [...ICA_LEFT_PATH, ...ICA_RIGHT_PATH];

/**
 * ICA physical parameters for realistic simulation
 */
export const ICA_PARAMS = {
  radius: 0.25,          // Vessel radius in cm (typical 4-5mm diameter)
  wallThickness: 0.1,    // Vessel wall thickness
  dangerRadius: 0.8,     // Critical proximity warning threshold
  warningRadius: 1.5,    // Caution proximity threshold
  safeRadius: 2.5,       // Safe distance threshold
};

/**
 * Medial Wall (Sphenoid Sinus) Parameters
 * The wall that must be removed to access the sella
 */
export const MEDIAL_WALL = {
  position: new THREE.Vector3(0, 0, 8),  // Center of sphenoid face
  width: 3.0,        // Width in cm
  height: 2.5,       // Height in cm
  thickness: 0.2,    // Wall thickness
  gridSize: 10,      // 10x10 grid for resection tracking
};

/**
 * Tumor location parameters (configurable per scenario)
 */
export interface TumorLocation {
  position: THREE.Vector3;
  radius: number;
  type: 'microadenoma' | 'macroadenoma' | 'invasive';
}

export const DEFAULT_TUMOR: TumorLocation = {
  position: new THREE.Vector3(0, 0, 10),  // Centered in sella
  radius: 0.8,
  type: 'microadenoma',
};

/**
 * Get nearest ICA distance from a given position
 * Uses linear interpolation between path points for smooth distance calculation
 */
export function getNearestICADistance(position: THREE.Vector3): {
  distance: number;
  side: 'left' | 'right';
  nearestPoint: THREE.Vector3;
} {
  let minDistance = Infinity;
  let nearestSide: 'left' | 'right' = 'left';
  const nearestPoint = new THREE.Vector3();
  
  const checkPath = (path: THREE.Vector3[], side: 'left' | 'right') => {
    for (let i = 0; i < path.length - 1; i++) {
      const segStart = path[i];
      const segEnd = path[i + 1];
      
      // Project position onto segment
      const segDir = new THREE.Vector3().subVectors(segEnd, segStart);
      const segLength = segDir.length();
      segDir.normalize();
      
      const toPoint = new THREE.Vector3().subVectors(position, segStart);
      const projection = Math.max(0, Math.min(segLength, toPoint.dot(segDir)));
      
      const closestOnSeg = new THREE.Vector3()
        .copy(segStart)
        .addScaledVector(segDir, projection);
      
      const dist = position.distanceTo(closestOnSeg) - ICA_PARAMS.radius;
      
      if (dist < minDistance) {
        minDistance = dist;
        nearestSide = side;
        nearestPoint.copy(closestOnSeg);
      }
    }
  };
  
  checkPath(ICA_LEFT_PATH, 'left');
  checkPath(ICA_RIGHT_PATH, 'right');
  
  return {
    distance: Math.max(0, minDistance),
    side: nearestSide,
    nearestPoint,
  };
}

/**
 * Check if a position is in the danger zone of the ICA
 */
export function isInICADangerZone(position: THREE.Vector3): boolean {
  const { distance } = getNearestICADistance(position);
  return distance < ICA_PARAMS.dangerRadius;
}

/**
 * Get danger level based on distance
 */
export function getDangerLevel(distance: number): 'critical' | 'danger' | 'caution' | 'safe' {
  if (distance < ICA_PARAMS.dangerRadius) return 'critical';
  if (distance < ICA_PARAMS.warningRadius) return 'danger';
  if (distance < ICA_PARAMS.safeRadius) return 'caution';
  return 'safe';
}
