import {
  Vector3D,
  EndoscopeState,
  ScopeAngle,
  SimulatorConfig,
  CollisionResult,
  AnatomicalStructure,
  DEFAULT_CONFIG,
} from '@/types/simulator';
import { inputRefs } from '@/store/inputRefs';

// Dual pivot points for binasal approach (nostrils)
export const PIVOT_LEFT: Vector3D = { x: -0.8, y: -2.5, z: 5.0 };
export const PIVOT_RIGHT: Vector3D = { x: 0.8, y: -2.5, z: 5.0 };

// Leverage ratio for fulcrum effect
const LEVERAGE_RATIO = 3.0;

// Vector math utilities
export const vec3 = {
  add: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),

  subtract: (a: Vector3D, b: Vector3D): Vector3D => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),

  scale: (v: Vector3D, s: number): Vector3D => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),

  magnitude: (v: Vector3D): number =>
    Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),

  normalize: (v: Vector3D): Vector3D => {
    const mag = vec3.magnitude(v);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return vec3.scale(v, 1 / mag);
  },

  dot: (a: Vector3D, b: Vector3D): number =>
    a.x * b.x + a.y * b.y + a.z * b.z,

  distance: (a: Vector3D, b: Vector3D): number =>
    vec3.magnitude(vec3.subtract(a, b)),

  lerp: (a: Vector3D, b: Vector3D, t: number): Vector3D => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }),

  clamp: (v: Vector3D, min: Vector3D, max: Vector3D): Vector3D => ({
    x: Math.max(min.x, Math.min(max.x, v.x)),
    y: Math.max(min.y, Math.min(max.y, v.y)),
    z: Math.max(min.z, Math.min(max.z, v.z)),
  }),

  negate: (v: Vector3D): Vector3D => ({
    x: -v.x,
    y: -v.y,
    z: -v.z,
  }),
};

export class EndoscopePhysics {
  private config: SimulatorConfig;
  private currentState: EndoscopeState;
  private structures: AnatomicalStructure[] = [];
  private smoothingBuffer: Vector3D[] = [];
  private readonly SMOOTHING_FRAMES = 5;

  constructor(config: SimulatorConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.currentState = {
      tipPosition: { x: 0, y: 0, z: 0 },
      handlePosition: { x: 0, y: 0, z: 0 },
      insertionDepth: 0,
      currentAngle: 0,
      rotation: 0,
      isColliding: false,
      collidingStructure: null,
    };
  }

  setAnatomicalStructures(structures: AnatomicalStructure[]): void {
    this.structures = structures;
  }

  /**
   * Calculate endoscope tip position based on handle position
   * Using inverse kinematics with pivot point mechanics
   */
  calculateTipPosition(handlePos: Vector3D): Vector3D {
    // Calculate offset from pivot point
    const offset = vec3.subtract(handlePos, this.config.pivotPoint);
    
    // Apply leverage amplification (inverse - moving handle one way moves tip the other)
    const amplifiedOffset = vec3.scale(offset, -this.config.leverageRatio);
    
    // Tip is on the opposite side of the pivot
    const tipPos = vec3.add(this.config.pivotPoint, amplifiedOffset);
    
    return tipPos;
  }

  /**
   * Calculate insertion depth as percentage
   */
  calculateInsertionDepth(tipPosition: Vector3D): number {
    // Depth is primarily along Z-axis (into the nasal cavity)
    const depth = Math.max(0, tipPosition.z);
    const percentage = (depth / this.config.maxInsertionDepth) * 100;
    return Math.min(100, Math.max(0, percentage));
  }

  /**
   * Determine scope angle from hand rotation
   * Snaps to standard endoscope angles
   */
  calculateScopeAngle(wristRotation: number): ScopeAngle {
    // Normalize rotation to 0-90 range
    const normalized = Math.abs(wristRotation) % 90;
    
    // Snap to nearest standard angle
    if (normalized < 15) return 0;
    if (normalized < 37) return 30;
    if (normalized < 57) return 45;
    return 70;
  }

  /**
   * Check if tip position is within nasal corridor bounds
   */
  isWithinCorridor(tipPos: Vector3D): boolean {
    const { width, height, length } = this.config.nasalCorridor;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return (
      tipPos.x >= -halfWidth &&
      tipPos.x <= halfWidth &&
      tipPos.y >= -halfHeight &&
      tipPos.y <= halfHeight &&
      tipPos.z >= 0 &&
      tipPos.z <= length
    );
  }

  /**
   * Clamp tip position to corridor boundaries
   */
  clampToCorridor(tipPos: Vector3D): Vector3D {
    const { width, height, length } = this.config.nasalCorridor;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return vec3.clamp(
      tipPos,
      { x: -halfWidth, y: -halfHeight, z: 0 },
      { x: halfWidth, y: halfHeight, z: length }
    );
  }

  /**
   * Check collision with anatomical structures
   */
  checkCollision(tipPos: Vector3D): CollisionResult {
    for (const structure of this.structures) {
      const distance = vec3.distance(tipPos, structure.bounds.center);
      
      if (distance < structure.bounds.radius) {
        const penetrationDepth = structure.bounds.radius - distance;
        const normalVector = vec3.normalize(
          vec3.subtract(tipPos, structure.bounds.center)
        );

        return {
          isColliding: true,
          structure,
          penetrationDepth,
          normalVector,
        };
      }
    }

    return {
      isColliding: false,
      structure: null,
      penetrationDepth: 0,
      normalVector: { x: 0, y: 0, z: 0 },
    };
  }

  /**
   * Apply position smoothing to reduce jitter
   */
  smoothPosition(pos: Vector3D): Vector3D {
    this.smoothingBuffer.push(pos);
    
    if (this.smoothingBuffer.length > this.SMOOTHING_FRAMES) {
      this.smoothingBuffer.shift();
    }

    const sum = this.smoothingBuffer.reduce(
      (acc, p) => vec3.add(acc, p),
      { x: 0, y: 0, z: 0 }
    );

    return vec3.scale(sum, 1 / this.smoothingBuffer.length);
  }

  /**
   * Main update function - called each frame with hand position
   * Reads from inputRefs for 60 FPS performance
   */
  update(
    handlePosition: Vector3D,
    wristRotation: number
  ): EndoscopeState {
    // Smooth the input position
    const smoothedHandle = this.smoothPosition(handlePosition);
    
    // Calculate tip position with pivot mechanics
    let tipPos = this.calculateTipPosition(smoothedHandle);
    
    // Check corridor bounds
    if (!this.isWithinCorridor(tipPos)) {
      tipPos = this.clampToCorridor(tipPos);
    }

    // Check collisions
    const collision = this.checkCollision(tipPos);
    
    // If colliding, push back along normal
    if (collision.isColliding && collision.structure) {
      tipPos = vec3.add(
        tipPos,
        vec3.scale(collision.normalVector, collision.penetrationDepth)
      );
    }

    // Calculate other state values
    const insertionDepth = this.calculateInsertionDepth(tipPos);
    const scopeAngle = this.calculateScopeAngle(wristRotation);

    // Update state
    this.currentState = {
      tipPosition: tipPos,
      handlePosition: smoothedHandle,
      insertionDepth,
      currentAngle: scopeAngle,
      rotation: wristRotation,
      isColliding: collision.isColliding,
      collidingStructure: collision.structure?.name || null,
    };

    // Also update inputRefs for other systems to read
    inputRefs.scopePosition = tipPos;
    inputRefs.insertionDepth = insertionDepth;
    inputRefs.scopeAngle = scopeAngle;
    inputRefs.isColliding = collision.isColliding;
    inputRefs.collidingStructure = collision.structure?.name || null;

    return this.currentState;
  }

  /**
   * Update using dual-pivot mechanics (for binasal approach)
   * Left hand controls scope through left nostril
   */
  updateFromInputRefs(): EndoscopeState {
    const lh = inputRefs.leftHand;
    
    // Map normalized input (0-1) to physical space (cm)
    const rawPos: Vector3D = {
      x: lh.x * 12,
      y: lh.y * 12,
      z: lh.z * 25,
    };
    
    // Calculate vector from pivot point
    const offset = vec3.subtract(rawPos, PIVOT_LEFT);
    
    // Apply leverage amplification (inverted - fulcrum effect)
    const amplifiedOffset = vec3.scale(vec3.negate(offset), LEVERAGE_RATIO);
    
    // Tip position is on opposite side of pivot
    let tipPos = vec3.add(PIVOT_LEFT, amplifiedOffset);
    
    // Smooth position
    tipPos = this.smoothPosition(tipPos);
    
    // Clamp to corridor
    if (!this.isWithinCorridor(tipPos)) {
      tipPos = this.clampToCorridor(tipPos);
    }
    
    // Check collisions
    const collision = this.checkCollision(tipPos);
    if (collision.isColliding && collision.structure) {
      tipPos = vec3.add(
        tipPos,
        vec3.scale(collision.normalVector, collision.penetrationDepth)
      );
    }
    
    const insertionDepth = this.calculateInsertionDepth(tipPos);
    const scopeAngle = this.calculateScopeAngle(lh.rot);
    
    this.currentState = {
      tipPosition: tipPos,
      handlePosition: rawPos,
      insertionDepth,
      currentAngle: scopeAngle,
      rotation: lh.rot,
      isColliding: collision.isColliding,
      collidingStructure: collision.structure?.name || null,
    };
    
    // Update inputRefs
    inputRefs.scopePosition = tipPos;
    inputRefs.insertionDepth = insertionDepth;
    inputRefs.scopeAngle = scopeAngle;
    inputRefs.isColliding = collision.isColliding;
    inputRefs.collidingStructure = collision.structure?.name || null;
    
    return this.currentState;
  }

  /**
   * Calculate tool position from right hand input (for dual-hand procedures)
   */
  updateToolFromInputRefs(): Vector3D {
    const rh = inputRefs.rightHand;
    
    // Map normalized input to physical space
    const rawPos: Vector3D = {
      x: rh.x * 12,
      y: rh.y * 12,
      z: rh.z * 25,
    };
    
    // Calculate vector from right pivot
    const offset = vec3.subtract(rawPos, PIVOT_RIGHT);
    const amplifiedOffset = vec3.scale(vec3.negate(offset), LEVERAGE_RATIO);
    const toolPos = vec3.add(PIVOT_RIGHT, amplifiedOffset);
    
    inputRefs.toolPosition = toolPos;
    
    return toolPos;
  }

  getState(): EndoscopeState {
    return this.currentState;
  }

  reset(): void {
    this.currentState = {
      tipPosition: { x: 0, y: 0, z: 0 },
      handlePosition: { x: 0, y: 0, z: 0 },
      insertionDepth: 0,
      currentAngle: 0,
      rotation: 0,
      isColliding: false,
      collidingStructure: null,
    };
    this.smoothingBuffer = [];
  }
}

export const endoscopePhysics = new EndoscopePhysics();
