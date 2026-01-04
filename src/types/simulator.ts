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
  type: 'bone' | 'tissue' | 'vessel' | 'nerve' | 'tumor' | 'landmark' | 'dura' | 'gland';
  bounds: {
    center: Vector3D;
    radius: number;
  };
  isCritical: boolean; // e.g., ICA, optic nerve
  visibleAtDepth: [number, number]; // [min, max] depth percentage
  visibleAtAngles: ScopeAngle[];
  tissueProperties?: TissueProperties;
}

// Tissue-specific properties for realistic simulation
export interface TissueProperties {
  thickness: 'thin' | 'medium' | 'thick';
  resistance: number; // 0-1, higher = harder to penetrate
  vascularized: boolean;
  pulsating?: boolean;
  color?: string; // Override default color
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

// Knosp Classification for cavernous sinus invasion
export type KnospGrade = 0 | 1 | 2 | '3A' | '3B' | 4;

export interface KnospClassification {
  grade: KnospGrade;
  description: string;
  surgicalApproach: 'resection' | 'decompression' | 'palliative';
  expectedRemission: number; // percentage
}

export const KNOSP_GRADES: Record<KnospGrade, KnospClassification> = {
  0: {
    grade: 0,
    description: 'No cavernous sinus involvement',
    surgicalApproach: 'resection',
    expectedRemission: 95,
  },
  1: {
    grade: 1,
    description: 'Tumor does not extend beyond medial tangent of ICA',
    surgicalApproach: 'resection',
    expectedRemission: 85,
  },
  2: {
    grade: 2,
    description: 'Tumor extends beyond medial tangent but not lateral tangent',
    surgicalApproach: 'resection',
    expectedRemission: 70,
  },
  '3A': {
    grade: '3A',
    description: 'Tumor extends beyond lateral tangent (superior compartment)',
    surgicalApproach: 'resection',
    expectedRemission: 50,
  },
  '3B': {
    grade: '3B',
    description: 'Tumor extends beyond lateral tangent (inferior compartment)',
    surgicalApproach: 'decompression',
    expectedRemission: 30,
  },
  4: {
    grade: 4,
    description: 'Complete ICA encasement',
    surgicalApproach: 'palliative',
    expectedRemission: 10,
  },
};

// Scenario types for FA vs NFA dichotomy
export type AdenomaType = 'functioning' | 'non-functioning';
export type FunctioningSubtype = 'GH' | 'ACTH' | 'PRL' | 'TSH' | 'FSH-LH';

export interface TumorScenario {
  type: AdenomaType;
  subtype?: FunctioningSubtype;
  knospGrade: KnospGrade;
  size: 'micro' | 'macro' | 'giant'; // <10mm, 10-40mm, >40mm
  invasive: boolean;
  goal: 'biochemical_cure' | 'decompression' | 'biopsy';
  description: string;
}

// Doppler state for ICA localization
export interface DopplerState {
  isActive: boolean;
  signalStrength: number; // 0-1
  nearestICADistance: number; // cm
  audioPlaying: boolean;
}

// Surgical workflow steps
export type SurgicalStep = 'APPROACH' | 'DOPPLER' | 'INCISION' | 'RESECTION' | 'CLOSURE';

// Wall interaction zone for precise tracking
export interface WallInteractionZone {
  superior: number;  // 0-1 integrity for superior segment
  middle: number;    // 0-1 integrity for middle segment
  inferior: number;  // 0-1 integrity for inferior segment (near CN VI - dangerous)
}

// Medial wall state for dynamic resection tracking
export interface MedialWallState {
  leftIntegrity: number;  // 0.0 (resected) to 1.0 (intact)
  rightIntegrity: number;
  leftZones: WallInteractionZone;
  rightZones: WallInteractionZone;
  technique: 'peeling' | 'resection' | null;
  lastToolUsed: 'curette' | 'dissector' | null;
  interactionCount: number; // Total tool contacts
}

// Tool movement tracking for anatomical safety rules
export interface ToolVector {
  direction: Vector3D;
  magnitude: number;
  verticalComponent: number; // Y-axis for "go superior" rule
}

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
  dopplerUsed?: boolean;
}

export interface LevelState {
  id: LevelId;
  name: string;
  objectives: LevelObjective[];
  metrics: LevelMetrics;
  isCompleted: boolean;
  score: number;
  scenario?: TumorScenario;
}

export interface AttendingMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  timestamp: number;
}

// Tool types for dual-hand control
export type ToolType = 'scope' | 'drill' | 'suction' | 'cautery' | 'irrigation' | 'doppler' | 'dissector' | 'curette';

export interface ToolState {
  activeTool: ToolType;
  isActive: boolean;
  secondaryHandDetected: boolean;
  pinchStrength: number; // 0-1 for tool activation
  dopplerState: DopplerState;
}

// Vitals monitor
export interface VitalsState {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  isStable: boolean;
}

// Complication types from the surgical guide
export type ComplicationType = 
  | 'venous_bleeding'
  | 'arterial_bleeding'
  | 'cn6_stretch'
  | 'cn3_injury'
  | 'csf_leak'
  | 'ica_injury'
  | 'loss_of_plane';

export interface Complication {
  type: ComplicationType;
  severity: 'minor' | 'major' | 'critical';
  managed: boolean;
  timestamp: number;
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
  complications: Complication[];
  scenario?: TumorScenario;
  // Dynamic surgical state
  surgicalStep: SurgicalStep;
  medialWall: MedialWallState;
  toolVector: ToolVector;
  bloodLevel: number; // 0-100 for dynamic blood overlay
}

// Hand gesture types
export type GestureType = 'open' | 'pinch' | 'fist' | 'point' | 'unknown';

export interface GestureState {
  dominant: GestureType;
  secondary: GestureType;
}
