// Core types for the Endoscopic Surgery Simulator

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmarks {
  wrist: Vector3D;
  indexTip: Vector3D;
  thumbTip: Vector3D;
  palmCenter: Vector3D;
  isTracking: boolean;
  confidence: number;
}

export type ScopeAngle = 0 | 30 | 45 | 70;

export interface EndoscopeState {
  tipPosition: Vector3D;
  handlePosition: Vector3D;
  insertionDepth: number; // 0-100% of max insertion
  currentAngle: ScopeAngle;
  rotation: number; // degrees around scope axis
  isColliding: boolean;
  collidingStructure: string | null;
}

export interface AnatomicalStructure {
  id: string;
  name: string;
  type: 'bone' | 'tissue' | 'vessel' | 'nerve' | 'tumor' | 'landmark';
  bounds: {
    center: Vector3D;
    radius: number;
  };
  isCritical: boolean; // e.g., ICA, optic nerve
  visibleAtDepth: [number, number]; // [min, max] depth percentage
  visibleAtAngles: ScopeAngle[];
}

export interface CollisionResult {
  isColliding: boolean;
  structure: AnatomicalStructure | null;
  penetrationDepth: number;
  normalVector: Vector3D;
}

export interface NasalCorridor {
  width: number;  // cm
  height: number; // cm
  length: number; // cm to sphenoid
}

export interface SimulatorConfig {
  scopeLength: number;       // cm (typically 18)
  leverageRatio: number;     // amplification factor (typically 3)
  maxInsertionDepth: number; // cm (typically 15)
  pivotPoint: Vector3D;      // nostril entrance
  nasalCorridor: NasalCorridor;
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  scopeLength: 18,
  leverageRatio: 3,
  maxInsertionDepth: 15,
  pivotPoint: { x: 0, y: 0, z: 0 },
  nasalCorridor: {
    width: 1.5,
    height: 2.0,
    length: 8.0,
  },
};

// Level system types
export type LevelId = 1 | 2 | 3 | 4 | 5;

export interface LevelObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  targetValue?: number;
  currentValue?: number;
}

export interface LevelMetrics {
  timeElapsed: number;
  mucosalContacts: number;
  bloodInField: boolean;
  scopeAngleChanges: number;
  complications: string[];
  extentOfResection?: number; // Level 4 only
}

export interface LevelState {
  id: LevelId;
  name: string;
  objectives: LevelObjective[];
  metrics: LevelMetrics;
  isCompleted: boolean;
  score: number;
}

export interface AttendingMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  timestamp: number;
}

// Tool types for dual-hand control
export type ToolType = 'scope' | 'drill' | 'suction' | 'cautery' | 'irrigation';

export interface ToolState {
  activeTool: ToolType;
  isActive: boolean;
  secondaryHandDetected: boolean;
  pinchStrength: number; // 0-1 for tool activation
}

// Vitals monitor
export interface VitalsState {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  isStable: boolean;
}

// Game state
export interface GameState {
  currentLevel: LevelId;
  levelState: LevelState;
  endoscope: EndoscopeState;
  tool: ToolState;
  vitals: VitalsState;
  attendingMessages: AttendingMessage[];
  isPaused: boolean;
  isCalibrating: boolean;
}

// Hand gesture types
export type GestureType = 'open' | 'pinch' | 'fist' | 'point' | 'unknown';

export interface GestureState {
  dominant: GestureType;
  secondary: GestureType;
}
