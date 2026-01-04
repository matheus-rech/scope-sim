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
  WallInteractionZone,
} from '@/types/simulator';
import { createLevelState, getIntroMessage, resetLevelHints } from '@/lib/levels/LevelManager';
import { resetInputRefs } from './inputRefs';

// Initial states
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

/**
 * Zustand store for reactive UI state
 * Only UI elements subscribe to this - physics uses inputRefs directly
 */
interface GameStore {
  // === REACTIVE STATE (triggers re-renders) ===
  
  // Surgical workflow
  step: SurgicalStep;
  activeTool: ToolType;
  isToolActive: boolean;
  secondaryHandDetected: boolean;
  
  // Physiological state
  bloodLevel: number;
  wallResectedCount: number;
  
  // Doppler state
  dopplerState: DopplerState;
  
  // Medial wall tracking
  medialWall: MedialWallState;
  toolVector: ToolVector;
  
  // Vitals
  vitals: VitalsState;
  
  // Feedback system
  feedback: string;
  feedbackType: 'neutral' | 'success' | 'warning' | 'critical';
  attendingMessages: AttendingMessage[];
  
  // Level system
  currentLevel: LevelId;
  levelState: LevelState;
  scenario: TumorScenario | null;
  
  // UI state
  isPaused: boolean;
  isCalibrating: boolean;
  complications: Complication[];
  
  // Time tracking
  startTime: number;
  timeElapsed: number;
  
  // === ACTIONS ===
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
  
  // Level metrics updates
  updateLevelMetrics: (updates: Partial<LevelState['metrics']>) => void;
  updateObjective: (objectiveId: string, completed: boolean, value?: number) => void;
  
  // Time update (called by timer)
  tick: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
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
  
  // Actions
  setStep: (s) => set({ step: s }),
  
  setTool: (t) => set({ activeTool: t }),
  
  setToolActive: (active) => set({ isToolActive: active }),
  
  setSecondaryHandDetected: (detected) => set((state) => {
    if (state.secondaryHandDetected === detected) return state;
    return { secondaryHandDetected: detected };
  }),
  
  addTrauma: (amount) => set((state) => {
    const newLevel = Math.min(100, state.bloodLevel + amount);
    // Haptic feedback for hemorrhage
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
    
    // Auto-progression when wall is mostly removed
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

// Selector helpers for performance
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
