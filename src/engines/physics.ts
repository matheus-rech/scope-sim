/**
 * Physics Engine - Collision Detection and Tool Interactions
 * Matches Schema: src/engines/physics.ts
 */

import * as THREE from 'three';
import { inputRefs, getWallGridIndex, reduceWallIntegrity } from '../store';
import { getNearestICADistance, MEDIAL_WALL, ICA_PARAMS } from '../anatomy';

export interface PhysicsState {
  scopePosition: THREE.Vector3;
  toolPosition: THREE.Vector3;
  insertionDepth: number;
  isColliding: boolean;
  collidingStructure: string | null;
  icaDistance: number;
  icaSide: 'left' | 'right';
}

export interface ResectionResult {
  wallRemoved: boolean;
  gridIndex: number;
  totalResected: number;
}

/**
 * Physics Engine for surgical instrument simulation
 */
export class PhysicsEngine {
  private readonly _tempVec3 = new THREE.Vector3();
  private readonly _scopePos = new THREE.Vector3();
  private readonly _toolPos = new THREE.Vector3();
  
  /**
   * Update scope position from hand input
   * Maps hand coordinates to scope position in surgical field
   */
  updateScopeFromHand(
    handX: number,
    handY: number, 
    handZ: number,
    handRot: number
  ): void {
    // Map hand position to scope position
    // X: lateral movement (clamped to nasal passage width)
    const scopeX = THREE.MathUtils.clamp(handX * 1.5, -2, 2);
    
    // Y: vertical movement
    const scopeY = THREE.MathUtils.clamp(handY * 1.5, -2, 2);
    
    // Z: insertion depth (0-15 cm range)
    const scopeZ = THREE.MathUtils.clamp(handZ * 15, 0, 15);
    
    // Update input refs directly
    inputRefs.scopePosition.x = scopeX;
    inputRefs.scopePosition.y = scopeY;
    inputRefs.scopePosition.z = scopeZ;
    inputRefs.insertionDepth = scopeZ;
    inputRefs.scopeAngle = handRot;
  }

  /**
   * Update tool position relative to scope
   */
  updateToolFromHand(
    handX: number,
    handY: number,
    handZ: number,
    isPinching: boolean
  ): void {
    // Tool moves relative to scope position with additional offset
    const toolX = inputRefs.scopePosition.x + (handX - inputRefs.leftHand.x) * 0.5;
    const toolY = inputRefs.scopePosition.y + (handY - inputRefs.leftHand.y) * 0.5;
    const toolZ = inputRefs.scopePosition.z + 0.5; // Tool extends slightly beyond scope
    
    inputRefs.toolPosition.x = THREE.MathUtils.clamp(toolX, -2.5, 2.5);
    inputRefs.toolPosition.y = THREE.MathUtils.clamp(toolY, -2.5, 2.5);
    inputRefs.toolPosition.z = THREE.MathUtils.clamp(toolZ, 0, 15);
    
    inputRefs.rightHand.pinch = isPinching;
  }

  /**
   * Check for collisions with anatomical structures
   */
  checkCollisions(): { isColliding: boolean; structure: string | null } {
    this._toolPos.set(
      inputRefs.toolPosition.x,
      inputRefs.toolPosition.y,
      inputRefs.toolPosition.z
    );
    
    // Check ICA proximity
    const { distance, side } = getNearestICADistance(this._toolPos);
    
    if (distance < ICA_PARAMS.radius) {
      inputRefs.isColliding = true;
      inputRefs.collidingStructure = `ICA_${side.toUpperCase()}`;
      return { isColliding: true, structure: `ICA_${side.toUpperCase()}` };
    }
    
    // Check wall collision
    const wallDist = Math.abs(this._toolPos.z - MEDIAL_WALL.position.z);
    if (wallDist < MEDIAL_WALL.thickness) {
      const inWallBounds = 
        Math.abs(this._toolPos.x - MEDIAL_WALL.position.x) < MEDIAL_WALL.width / 2 &&
        Math.abs(this._toolPos.y - MEDIAL_WALL.position.y) < MEDIAL_WALL.height / 2;
      
      if (inWallBounds) {
        inputRefs.isColliding = true;
        inputRefs.collidingStructure = 'MEDIAL_WALL';
        return { isColliding: true, structure: 'MEDIAL_WALL' };
      }
    }
    
    inputRefs.isColliding = false;
    inputRefs.collidingStructure = null;
    return { isColliding: false, structure: null };
  }

  /**
   * Perform wall resection at tool position
   */
  resectWall(amount: number): ResectionResult {
    const gridIndex = getWallGridIndex(
      inputRefs.toolPosition.x,
      inputRefs.toolPosition.y
    );
    
    if (gridIndex < 0) {
      return { wallRemoved: false, gridIndex: -1, totalResected: 0 };
    }
    
    const wasRemoved = reduceWallIntegrity(gridIndex, amount);
    
    let totalResected = 0;
    for (let i = 0; i < 100; i++) {
      if (inputRefs.wallGrid[i] <= 0.01) totalResected++;
    }
    
    return { wallRemoved: wasRemoved, gridIndex, totalResected };
  }

  /**
   * Get current ICA distance from tool position
   */
  getICAProximity(): { distance: number; side: 'left' | 'right'; dangerLevel: string } {
    this._toolPos.set(
      inputRefs.toolPosition.x,
      inputRefs.toolPosition.y,
      inputRefs.toolPosition.z
    );
    
    const { distance, side } = getNearestICADistance(this._toolPos);
    
    let dangerLevel: string;
    if (distance < ICA_PARAMS.dangerRadius) dangerLevel = 'critical';
    else if (distance < ICA_PARAMS.warningRadius) dangerLevel = 'danger';
    else if (distance < ICA_PARAMS.safeRadius) dangerLevel = 'caution';
    else dangerLevel = 'safe';
    
    return { distance, side, dangerLevel };
  }

  /**
   * Get current physics state for rendering
   */
  getState(): PhysicsState {
    const { distance, side } = this.getICAProximity();
    
    return {
      scopePosition: new THREE.Vector3(
        inputRefs.scopePosition.x,
        inputRefs.scopePosition.y,
        inputRefs.scopePosition.z
      ),
      toolPosition: new THREE.Vector3(
        inputRefs.toolPosition.x,
        inputRefs.toolPosition.y,
        inputRefs.toolPosition.z
      ),
      insertionDepth: inputRefs.insertionDepth,
      isColliding: inputRefs.isColliding,
      collidingStructure: inputRefs.collidingStructure,
      icaDistance: distance,
      icaSide: side,
    };
  }

  /**
   * Reset physics state
   */
  reset(): void {
    inputRefs.scopePosition = { x: 0, y: 0, z: 0 };
    inputRefs.toolPosition = { x: 0, y: 0, z: 0 };
    inputRefs.insertionDepth = 0;
    inputRefs.isColliding = false;
    inputRefs.collidingStructure = null;
    inputRefs.wallGrid.fill(1.0);
  }
}

export const physicsEngine = new PhysicsEngine();
