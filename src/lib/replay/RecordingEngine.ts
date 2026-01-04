/**
 * SURGICAL PROCEDURE RECORDING ENGINE
 * 
 * Captures procedural data at 60 FPS with intelligent compression:
 * - Keyframes every 30 frames (full state snapshots)
 * - Delta frames between keyframes (only changed values)
 * - Event markers for significant moments (tool changes, complications)
 */

import type { 
  RecordingFrame, 
  RecordingEvent, 
  RecordingMetadata, 
  Recording,
  LevelId 
} from './types';
import type { TumorScenario, ToolType, SurgicalStep } from '@/types/simulator';

interface GameStateSnapshot {
  endoscope: {
    tipPosition: { x: number; y: number; z: number };
    currentAngle: number;
    rotation: number;
    insertionDepth: number;
  };
  tool: {
    activeTool: ToolType;
    isActive: boolean;
  };
  step: SurgicalStep;
  bloodLevel: number;
}

class RecordingEngine {
  private frames: RecordingFrame[] = [];
  private events: RecordingEvent[] = [];
  private metadata: RecordingMetadata | null = null;
  private isRecording: boolean = false;
  private startTime: number = 0;
  private lastState: Partial<RecordingFrame> = {};
  private frameCounter: number = 0;
  
  private readonly KEYFRAME_INTERVAL = 30;

  start(levelId: LevelId, scenario?: TumorScenario): void {
    this.frames = [];
    this.events = [];
    this.frameCounter = 0;
    this.lastState = {};
    this.startTime = Date.now();
    this.isRecording = true;
    
    this.metadata = {
      id: crypto.randomUUID(),
      levelId,
      scenario,
      startTime: this.startTime,
      duration: 0,
      frameCount: 0,
      keyframeCount: 0,
      complications: [],
    };
  }

  captureFrame(gameState: GameStateSnapshot): void {
    if (!this.isRecording) return;
    
    const timestamp = Date.now() - this.startTime;
    const isKeyframe = this.frameCounter % this.KEYFRAME_INTERVAL === 0;
    
    const frame: RecordingFrame = {
      timestamp,
      frameType: isKeyframe ? 'keyframe' : 'delta',
      scopePosition: [
        gameState.endoscope.tipPosition.x,
        gameState.endoscope.tipPosition.y,
        gameState.endoscope.tipPosition.z,
      ],
      scopeAngle: gameState.endoscope.currentAngle,
      scopeRotation: gameState.endoscope.rotation,
      insertionDepth: gameState.endoscope.insertionDepth,
    };
    
    // Delta compression: only include changed values
    if (isKeyframe || gameState.tool.activeTool !== this.lastState.activeTool) {
      frame.activeTool = gameState.tool.activeTool;
    }
    if (isKeyframe || gameState.tool.isActive !== this.lastState.isToolActive) {
      frame.isToolActive = gameState.tool.isActive;
    }
    if (isKeyframe || gameState.step !== this.lastState.surgicalStep) {
      frame.surgicalStep = gameState.step;
    }
    if (isKeyframe || Math.abs((gameState.bloodLevel || 0) - (this.lastState.bloodLevel || 0)) > 1) {
      frame.bloodLevel = gameState.bloodLevel;
    }
    
    this.frames.push(frame);
    this.frameCounter++;
    
    if (isKeyframe && this.metadata) {
      this.metadata.keyframeCount++;
    }
    
    // Cache last state for delta comparison
    this.lastState = {
      activeTool: gameState.tool.activeTool,
      isToolActive: gameState.tool.isActive,
      surgicalStep: gameState.step,
      bloodLevel: gameState.bloodLevel,
    };
  }

  recordEvent(type: RecordingEvent['type'], data: Record<string, unknown>): void {
    if (!this.isRecording) return;
    
    this.events.push({
      type,
      data,
      timestamp: Date.now() - this.startTime,
    });

    // Track complications
    if (type === 'complication' && this.metadata) {
      const complication = data.type as string;
      if (!this.metadata.complications.includes(complication)) {
        this.metadata.complications.push(complication);
      }
    }
  }

  stop(finalScore?: number): RecordingMetadata | null {
    if (!this.isRecording || !this.metadata) return null;
    
    this.isRecording = false;
    this.metadata.duration = Date.now() - this.startTime;
    this.metadata.frameCount = this.frames.length;
    this.metadata.finalScore = finalScore;
    
    return this.metadata;
  }

  exportRecording(): Recording | null {
    if (!this.metadata) return null;
    
    return {
      metadata: this.metadata,
      frames: [...this.frames],
      events: [...this.events],
    };
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  reset(): void {
    this.frames = [];
    this.events = [];
    this.metadata = null;
    this.isRecording = false;
    this.startTime = 0;
    this.lastState = {};
    this.frameCounter = 0;
  }
}

export const recordingEngine = new RecordingEngine();
