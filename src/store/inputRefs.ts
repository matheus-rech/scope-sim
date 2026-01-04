/**
 * Mutable refs for 60 FPS physics - direct memory access, no React overhead
 * These are updated every frame by hand tracking and read by physics/rendering
 */

import { Vector3D } from '@/types/simulator';

export interface HandInputRef {
  x: number;
  y: number;
  z: number;
  rot: number;
}

export interface RightHandRef {
  x: number;
  y: number;
  z: number;
  pinch: boolean;
  pinchStrength: number;
}

export interface PhysicsOutputRef {
  position: Vector3D;
  rotation: { x: number; y: number; z: number; w: number };
}

/**
 * Non-reactive input refs for physics calculations
 * Updated directly by hand tracking, read by useFrame render loop
 */
export const inputRefs = {
  // LEFT HAND -> SCOPE control
  leftHand: { x: 0, y: 0, z: 0, rot: 0 } as HandInputRef,
  
  // RIGHT HAND -> TOOL control
  rightHand: { x: 0, y: 0, z: 0, pinch: false, pinchStrength: 0 } as RightHandRef,
  
  // 10x10 wall grid (100 cells) - Float32Array for performance
  // 1.0 = Intact, 0.0 = Removed
  wallGrid: new Float32Array(100).fill(1.0),
  
  // Physics output state (updated every frame, read by components)
  scopePosition: { x: 0, y: 0, z: 0 } as Vector3D,
  scopeRotation: { x: 0, y: 0, z: 0, w: 1 },
  toolPosition: { x: 0, y: 0, z: 0 } as Vector3D,
  
  // Collision state
  isColliding: false,
  collidingStructure: null as string | null,
  
  // Insertion depth and angle (cached for performance)
  insertionDepth: 0,
  scopeAngle: 0,
  
  // Calibration state
  isCalibrated: false,
};

/**
 * Reset all input refs to initial state
 */
export function resetInputRefs(): void {
  inputRefs.leftHand = { x: 0, y: 0, z: 0, rot: 0 };
  inputRefs.rightHand = { x: 0, y: 0, z: 0, pinch: false, pinchStrength: 0 };
  inputRefs.wallGrid.fill(1.0);
  inputRefs.scopePosition = { x: 0, y: 0, z: 0 };
  inputRefs.scopeRotation = { x: 0, y: 0, z: 0, w: 1 };
  inputRefs.toolPosition = { x: 0, y: 0, z: 0 };
  inputRefs.isColliding = false;
  inputRefs.collidingStructure = null;
  inputRefs.insertionDepth = 0;
  inputRefs.scopeAngle = 0;
}

/**
 * Get wall grid cell index from world position
 * Returns -1 if position is outside wall bounds
 */
export function getWallGridIndex(worldX: number, worldY: number): number {
  // Map world coordinates to 10x10 grid
  // World range: x [-1.5, 1.5], y [-1.5, 1.5]
  const gridX = Math.floor(((worldX + 1.5) / 3) * 10);
  const gridY = Math.floor(((worldY + 1.5) / 3) * 10);
  
  if (gridX < 0 || gridX >= 10 || gridY < 0 || gridY >= 10) {
    return -1;
  }
  
  return gridY * 10 + gridX;
}

/**
 * Get wall cell integrity at a grid index
 */
export function getWallIntegrity(index: number): number {
  if (index < 0 || index >= 100) return 1.0;
  return inputRefs.wallGrid[index];
}

/**
 * Reduce wall integrity at a grid index
 * Returns true if wall was removed (crossed 0 threshold)
 */
export function reduceWallIntegrity(index: number, amount: number): boolean {
  if (index < 0 || index >= 100) return false;
  
  const prev = inputRefs.wallGrid[index];
  if (prev <= 0) return false;
  
  inputRefs.wallGrid[index] = Math.max(0, prev - amount);
  return inputRefs.wallGrid[index] <= 0 && prev > 0;
}

/**
 * Count total removed wall cells
 */
export function getWallResectedCount(): number {
  let count = 0;
  for (let i = 0; i < 100; i++) {
    if (inputRefs.wallGrid[i] <= 0.01) count++;
  }
  return count;
}
