import type { ToolType, SurgicalStep, TumorScenario } from '@/types/simulator';

export type ScopeAngle = 0 | 30 | 45 | 70;
export type LevelId = 1 | 2 | 3 | 4 | 5;
export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface RecordingFrame {
  timestamp: number;
  frameType: 'keyframe' | 'delta';
  scopePosition: [number, number, number];
  scopeAngle: number;
  scopeRotation: number;
  insertionDepth: number;
  activeTool?: ToolType;
  isToolActive?: boolean;
  pinchStrength?: number;
  surgicalStep?: SurgicalStep;
  bloodLevel?: number;
  wallGrid?: number[];
  events?: RecordingEvent[];
}

export interface RecordingEvent {
  type: 'tool_change' | 'complication' | 'step_change' | 'message' | 'collision';
  data: Record<string, unknown>;
  timestamp: number;
}

export interface RecordingMetadata {
  id: string;
  levelId: LevelId;
  scenario?: TumorScenario;
  startTime: number;
  duration: number;
  frameCount: number;
  keyframeCount: number;
  finalScore?: number;
  complications: string[];
}

export interface Recording {
  metadata: RecordingMetadata;
  frames: RecordingFrame[];
  events: RecordingEvent[];
}

export interface InterpolatedFrame {
  scopePosition: Vector3D;
  scopeAngle: number;
  scopeRotation: number;
  insertionDepth: number;
  activeTool?: ToolType;
  isToolActive?: boolean;
  surgicalStep?: SurgicalStep;
  bloodLevel: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: PlaybackSpeed;
  currentFrameIndex: number;
}

export interface SavedRecording {
  id: string;
  metadata: RecordingMetadata;
  savedAt: number;
}
