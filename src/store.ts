/**
 * Unified Store - Matching Schema Structure
 * Combines mutable refs for 60 FPS physics with zustand for reactive UI
 */

import { create } from 'zustand';
import {
  ToolType,
  SurgicalStep,
  LevelState,
  AttendingMessage,
  Complication,
  TumorScenario,
  LevelId,
  VitalsState,
  DopplerState,
  MedialWallState,
  ToolVector,
  Vector3D,
} from '@/types/simulator';
import { createLevelState, getIntroMessage, resetLevelHints } from '@/lib/levels/LevelManager';

// ============================================================================
// INPUT REFS - Direct Memory Access for 60 FPS Physics (No React Overhead)
// ============================================================================

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

/**
 * Non-reactive input refs for physics calculations
 * Updated directly by hand tracking, read by useFrame render loop
 */
export const inputRefs = {
  leftHand: { x: 0, y: 0, z: 0, rot: 0 } as HandInputRef,
  rightHand: { x: 0, y: 0, z: 0, pinch: false, pinchStrength: 0 } as RightHandRef,
  
  wallGrid: new Float32Array(100).fill(1.0),
  
  scopePosition: { x: 0, y: 0, z: 0 } as Vector3D,
  scopeRotation: { x: 0, y: 0, z: 0, w: 1 },
  toolPosition: { x: 0, y: 0, z: 0 } as Vector3D,
  
  isColliding: false,
  collidingStructure: null as string | null,
  
  insertionDepth: 0,
  scopeAngle: 0,
  
  isCalibrated: false,
  
  dopplerSweep: {
    samples: new Float32Array(600),
    writeIndex: 0,
    count: 0,
  },
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
  
  inputRefs.dopplerSweep.samples.fill(0);
  inputRefs.dopplerSweep.writeIndex = 0;
  inputRefs.dopplerSweep.count = 0;
}

export function addDopplerSample(x: number, y: number, intensity: number): void {
  const { dopplerSweep } = inputRefs;
  const i = dopplerSweep.writeIndex * 3;
  
  dopplerSweep.samples[i] = x;
  dopplerSweep.samples[i + 1] = y;
  dopplerSweep.samples[i + 2] = intensity;
  
  dopplerSweep.writeIndex = (dopplerSweep.writeIndex + 1) % 200;
  dopplerSweep.count = Math.min(200, dopplerSweep.count + 1);
}

export function getWallGridIndex(worldX: number, worldY: number): number {
  const gridX = Math.floor(((worldX + 1.5) / 3) * 10);
  const gridY = Math.floor(((worldY + 1.5) / 3) * 10);
  
  if (gridX < 0 || gridX >= 10 || gridY < 0 || gridY >= 10) {
    return -1;
  }
  
  return gridY * 10 + gridX;
}

export function getWallIntegrity(index: number): number {
  if (index < 0 || index >= 100) return 1.0;
  return inputRefs.wallGrid[index];
}

export function reduceWallIntegrity(index: number, amount: number): boolean {
  if (index < 0 || index >= 100) return false;
  
  const prev = inputRefs.wallGrid[index];
  if (prev <= 0) return false;
  
  inputRefs.wallGrid[index] = Math.max(0, prev - amount);
  return inputRefs.wallGrid[index] <= 0 && prev > 0;
}

export function getWallResectedCount(): number {
  let count = 0;
  for (let i = 0; i < 100; i++) {
    if (inputRefs.wallGrid[i] <= 0.01) count++;
  }
  return count;
}

// ============================================================================
// ZUSTAND STORE - Reactive UI State
// ============================================================================

const initialDopplerState: DopplerState = {
  isActive: false,
  signalStrength: 0,
  nearestICADistance: 10,
  audioPlaying: false,
};

const initialMedialWallState: MedialWallState = {
  leftIntegrity: 1.0,
  rightIntegrity: 1.0,
  leftZones: { superior: 1.0, middle: 1.0, inferior: 1.0 },
  rightZones: { superior: 1.0, middle: 1.0, inferior: 1.0 },
  technique: null,
  lastToolUsed: null,
  interactionCount: 0,
};

const initialToolVector: ToolVector = {
  direction: { x: 0, y: 0, z: 0 },
  magnitude: 0,
  verticalComponent: 0,
};

const initialVitals: VitalsState = {
  heartRate: 72,
  bloodPressure: { systolic: 120, diastolic: 80 },
  isStable: true,
};

interface GameStore {
  step: SurgicalStep;
  activeTool: ToolType;
  isToolActive: boolean;
  secondaryHandDetected: boolean;
  
  bloodLevel: number;
  wallResectedCount: number;
  
  dopplerState: DopplerState;
  medialWall: MedialWallState;
  toolVector: ToolVector;
  vitals: VitalsState;
  
  feedback: string;
  feedbackType: 'neutral' | 'success' | 'warning' | 'critical';
  attendingMessages: AttendingMessage[];
  
  currentLevel: LevelId;
  levelState: LevelState;
  scenario: TumorScenario | null;
  
  isPaused: boolean;
  isCalibrating: boolean;
  complications: Complication[];
  
  startTime: number;
  timeElapsed: number;
  
  setStep: (s: SurgicalStep) => void;
  setTool: (t: ToolType) => void;
  setToolActive: (active: boolean) => void;
  setSecondaryHandDetected: (detected: boolean) => void;
  
  addTrauma: (amount: number) => void;
  reduceBlood: (amount: number) => void;
  incrementResection: () => void;
  
  updateDoppler: (state: Partial<DopplerState>) => void;
  updateMedialWall: (state: Partial<MedialWallState>) => void;
  updateVitals: (state: Partial<VitalsState>) => void;
  updateToolVector: (vector: ToolVector) => void;
  
  addMessage: (msg: AttendingMessage) => void;
  setFeedback: (msg: string, type: 'neutral' | 'success' | 'warning' | 'critical') => void;
  
  startLevel: (level: LevelId, scenario?: TumorScenario) => void;
  completeCalibration: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  
  updateLevelMetrics: (updates: Partial<LevelState['metrics']>) => void;
  updateObjective: (objectiveId: string, completed: boolean, value?: number) => void;
  
  tick: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  step: 'APPROACH',
  activeTool: 'scope',
  isToolActive: false,
  secondaryHandDetected: false,
  
  bloodLevel: 0,
  wallResectedCount: 0,
  
  dopplerState: initialDopplerState,
  medialWall: initialMedialWallState,
  toolVector: initialToolVector,
  vitals: initialVitals,
  
  feedback: '',
  feedbackType: 'neutral',
  attendingMessages: [],
  
  currentLevel: 1,
  levelState: createLevelState(1),
  scenario: null,
  
  isPaused: false,
  isCalibrating: true,
  complications: [],
  
  startTime: Date.now(),
  timeElapsed: 0,
  
  setStep: (s) => set({ step: s }),
  
  setTool: (t) => set({ activeTool: t }),
  
  setToolActive: (active) => set({ isToolActive: active }),
  
  setSecondaryHandDetected: (detected) => set((state) => {
    if (state.secondaryHandDetected === detected) return state;
    return { secondaryHandDetected: detected };
  }),
  
  addTrauma: (amount) => set((state) => {
    const newLevel = Math.min(100, state.bloodLevel + amount);
    if (newLevel > 90 && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    return { bloodLevel: newLevel };
  }),
  
  reduceBlood: (amount) => set((state) => ({
    bloodLevel: Math.max(0, state.bloodLevel - amount),
  })),
  
  incrementResection: () => set((state) => {
    const count = state.wallResectedCount + 1;
    
    if (count > 40 && state.step === 'RESECTION') {
      return {
        wallResectedCount: count,
        step: 'HEMOSTASIS',
        feedback: 'Tumor Exposed. Proceed to hemostasis.',
        feedbackType: 'success' as const,
      };
    }
    
    return { wallResectedCount: count };
  }),
  
  updateDoppler: (updates) => set((state) => ({
    dopplerState: { ...state.dopplerState, ...updates },
  })),
  
  updateMedialWall: (updates) => set((state) => ({
    medialWall: { ...state.medialWall, ...updates },
  })),
  
  updateVitals: (updates) => set((state) => ({
    vitals: { ...state.vitals, ...updates },
  })),
  
  updateToolVector: (vector) => set({ toolVector: vector }),
  
  addMessage: (msg) => set((state) => ({
    attendingMessages: [...state.attendingMessages.slice(-9), msg],
  })),
  
  setFeedback: (msg, type) => set({ feedback: msg, feedbackType: type }),
  
  startLevel: (level, scenario) => {
    resetLevelHints();
    resetInputRefs();
    
    const levelState = createLevelState(level);
    if (scenario) {
      levelState.scenario = scenario;
    }
    const introMessage = getIntroMessage(level);
    
    set({
      currentLevel: level,
      levelState,
      scenario: scenario || null,
      step: 'APPROACH',
      activeTool: 'scope',
      isToolActive: false,
      secondaryHandDetected: false,
      bloodLevel: 0,
      wallResectedCount: 0,
      dopplerState: initialDopplerState,
      medialWall: initialMedialWallState,
      toolVector: initialToolVector,
      vitals: initialVitals,
      attendingMessages: [introMessage],
      isPaused: false,
      isCalibrating: false,
      complications: [],
      startTime: Date.now(),
      timeElapsed: 0,
    });
  },
  
  completeCalibration: () => {
    const introMessage = getIntroMessage(get().currentLevel);
    set({
      isCalibrating: false,
      attendingMessages: [introMessage],
      startTime: Date.now(),
      timeElapsed: 0,
    });
  },
  
  pause: () => set({ isPaused: true }),
  
  resume: () => set({ isPaused: false }),
  
  reset: () => {
    resetInputRefs();
    set({
      step: 'APPROACH',
      activeTool: 'scope',
      isToolActive: false,
      secondaryHandDetected: false,
      bloodLevel: 0,
      wallResectedCount: 0,
      dopplerState: initialDopplerState,
      medialWall: initialMedialWallState,
      toolVector: initialToolVector,
      vitals: initialVitals,
      feedback: '',
      feedbackType: 'neutral',
      attendingMessages: [],
      currentLevel: 1,
      levelState: createLevelState(1),
      scenario: null,
      isPaused: false,
      isCalibrating: true,
      complications: [],
      startTime: Date.now(),
      timeElapsed: 0,
    });
  },
  
  updateLevelMetrics: (updates) => set((state) => ({
    levelState: {
      ...state.levelState,
      metrics: { ...state.levelState.metrics, ...updates },
    },
  })),
  
  updateObjective: (objectiveId, completed, value) => set((state) => ({
    levelState: {
      ...state.levelState,
      objectives: state.levelState.objectives.map((obj) =>
        obj.id === objectiveId
          ? { ...obj, isCompleted: completed, currentValue: value ?? obj.currentValue }
          : obj
      ),
    },
  })),
  
  tick: () => set((state) => {
    if (state.isPaused || state.isCalibrating) return state;
    return { timeElapsed: Math.floor((Date.now() - state.startTime) / 1000) };
  }),
}));

export const selectActiveTool = (state: GameStore) => state.activeTool;
export const selectBloodLevel = (state: GameStore) => state.bloodLevel;
export const selectStep = (state: GameStore) => state.step;
export const selectIsPaused = (state: GameStore) => state.isPaused;
export const selectIsCalibrating = (state: GameStore) => state.isCalibrating;
export const selectDopplerState = (state: GameStore) => state.dopplerState;
export const selectVitals = (state: GameStore) => state.vitals;
export const selectMedialWall = (state: GameStore) => state.medialWall;
export const selectLevelState = (state: GameStore) => state.levelState;
export const selectAttendingMessages = (state: GameStore) => state.attendingMessages;
