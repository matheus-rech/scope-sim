import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameState,
  LevelId,
  AttendingMessage,
  EndoscopeState,
  ToolType,
  HandLandmarks,
  DopplerState,
  TumorScenario,
} from '@/types/simulator';
import {
  createLevelState,
  getIntroMessage,
  evaluateCoaching,
  getCompletionMessage,
  resetLevelHints,
} from '@/lib/levels/LevelManager';
import { EndoscopePhysics } from '@/lib/physics/EndoscopePhysics';
import { ANATOMICAL_STRUCTURES, getDopplerSignal } from '@/data/anatomicalStructures';

const initialDopplerState: DopplerState = {
  isActive: false,
  signalStrength: 0,
  nearestICADistance: 10,
  audioPlaying: false,
};

const initialGameState: GameState = {
  currentLevel: 1,
  levelState: createLevelState(1),
  endoscope: {
    tipPosition: { x: 0, y: 0, z: 0 },
    handlePosition: { x: 0, y: 0, z: 0 },
    insertionDepth: 0,
    currentAngle: 0,
    rotation: 0,
    isColliding: false,
    collidingStructure: null,
  },
  tool: {
    activeTool: 'scope',
    isActive: false,
    secondaryHandDetected: false,
    pinchStrength: 0,
    dopplerState: initialDopplerState,
  },
  vitals: {
    heartRate: 72,
    bloodPressure: { systolic: 120, diastolic: 80 },
    isStable: true,
  },
  attendingMessages: [],
  isPaused: false,
  isCalibrating: true,
  complications: [],
};

interface UseSimulatorReturn {
  gameState: GameState;
  physics: EndoscopePhysics;
  startLevel: (levelId: LevelId, scenario?: TumorScenario) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  updateFromHand: (hand: HandLandmarks, wristRotation: number, pinchStrength: number) => void;
  setTool: (tool: ToolType) => void;
  setSecondaryHandDetected: (detected: boolean) => void;
  completeCalibration: () => void;
  timeElapsed: number;
}

export function useSimulator(): UseSimulatorReturn {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const physicsRef = useRef(new EndoscopePhysics());
  const lastAngleRef = useRef<number>(0);
  const collisionCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const lastCoachingTimeRef = useRef<number>(0);

  // Initialize physics with anatomical structures
  useEffect(() => {
    physicsRef.current.setAnatomicalStructures(ANATOMICAL_STRUCTURES);
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (gameState.isPaused || gameState.isCalibrating) return;

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.isPaused, gameState.isCalibrating]);

  const addMessage = useCallback((message: AttendingMessage) => {
    setGameState(prev => ({
      ...prev,
      attendingMessages: [...prev.attendingMessages, message].slice(-10), // Keep last 10
    }));
  }, []);

  const startLevel = useCallback((levelId: LevelId, scenario?: TumorScenario) => {
    resetLevelHints();
    physicsRef.current.reset();
    collisionCountRef.current = 0;
    startTimeRef.current = Date.now();
    setTimeElapsed(0);

    const levelState = createLevelState(levelId);
    // Add scenario to level state if provided
    if (scenario) {
      levelState.scenario = scenario;
    }
    const introMessage = getIntroMessage(levelId);

    setGameState(prev => ({
      ...prev,
      currentLevel: levelId,
      levelState,
      scenario, // Store scenario at game state level too
      attendingMessages: [introMessage],
      isPaused: false,
      isCalibrating: false,
      endoscope: {
        tipPosition: { x: 0, y: 0, z: 0 },
        handlePosition: { x: 0, y: 0, z: 0 },
        insertionDepth: 0,
        currentAngle: 0,
        rotation: 0,
        isColliding: false,
        collidingStructure: null,
      },
      tool: {
        activeTool: 'scope',
        isActive: false,
        secondaryHandDetected: false,
        pinchStrength: 0,
        dopplerState: initialDopplerState,
      },
      vitals: {
        heartRate: 72,
        bloodPressure: { systolic: 120, diastolic: 80 },
        isStable: true,
      },
      complications: [],
    }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initialGameState);
    physicsRef.current.reset();
    resetLevelHints();
  }, []);

  const updateFromHand = useCallback((
    hand: HandLandmarks,
    wristRotation: number,
    pinchStrength: number
  ) => {
    if (gameState.isPaused || gameState.isCalibrating) return;
    if (!hand.isTracking) return;

    // Update physics
    const endoscopeState = physicsRef.current.update(hand.wrist, wristRotation);

    // Track collisions
    if (endoscopeState.isColliding) {
      collisionCountRef.current++;
    }

    // Track angle changes
    if (endoscopeState.currentAngle !== lastAngleRef.current) {
      lastAngleRef.current = endoscopeState.currentAngle;
      setGameState(prev => ({
        ...prev,
        levelState: {
          ...prev.levelState,
          metrics: {
            ...prev.levelState.metrics,
            scopeAngleChanges: prev.levelState.metrics.scopeAngleChanges + 1,
          },
        },
      }));
    }

    // Update vitals based on complications
    const heartRate = endoscopeState.isColliding ? 85 : 72;
    const isStable = !endoscopeState.isColliding;

    // Check for coaching triggers (max once per 3 seconds)
    const now = Date.now();
    if (now - lastCoachingTimeRef.current > 3000) {
      const completedCount = gameState.levelState.objectives.filter(o => o.isCompleted).length;
      
      const coachingMessage = evaluateCoaching(gameState.currentLevel, {
        depth: endoscopeState.insertionDepth,
        angle: endoscopeState.currentAngle,
        time: timeElapsed,
        collisions: collisionCountRef.current,
        objectivesCompleted: completedCount,
      });

      if (coachingMessage) {
        addMessage(coachingMessage);
        lastCoachingTimeRef.current = now;
      }
    }

    // Update Doppler state if doppler tool is active
    const dopplerSignal = prev => {
      if (prev.tool.activeTool === 'doppler') {
        const signal = getDopplerSignal(endoscopeState.tipPosition);
        return {
          isActive: true,
          signalStrength: signal.strength,
          nearestICADistance: signal.nearestDistance,
          audioPlaying: signal.strength > 0.2,
        };
      }
      return prev.tool.dopplerState;
    };

    // Update game state
    setGameState(prev => ({
      ...prev,
      endoscope: endoscopeState,
      tool: {
        ...prev.tool,
        isActive: pinchStrength > 0.7,
        pinchStrength,
        dopplerState: dopplerSignal(prev),
      },
      vitals: {
        ...prev.vitals,
        heartRate,
        isStable,
      },
      levelState: {
        ...prev.levelState,
        metrics: {
          ...prev.levelState.metrics,
          mucosalContacts: collisionCountRef.current,
          timeElapsed,
          dopplerUsed: prev.tool.activeTool === 'doppler' || prev.levelState.metrics.dopplerUsed,
        },
      },
    }));

    // Check level objectives
    updateObjectives(endoscopeState);
  }, [gameState.isPaused, gameState.isCalibrating, gameState.currentLevel, gameState.levelState.objectives, timeElapsed, addMessage]);

  const updateObjectives = useCallback((endoscope: EndoscopeState) => {
    setGameState(prev => {
      const objectives = prev.levelState.objectives.map(obj => {
        // Level 1 objectives
        if (prev.currentLevel === 1) {
          if (obj.id === 'reach_turbinate' && endoscope.insertionDepth > 30) {
            return { ...obj, isCompleted: true, currentValue: 1 };
          }
          if (obj.id === 'find_ostium' && endoscope.insertionDepth > 50 && endoscope.currentAngle >= 30) {
            return { ...obj, isCompleted: true, currentValue: 1 };
          }
          if (obj.id === 'use_30_scope' && endoscope.currentAngle === 30) {
            return { ...obj, isCompleted: true, currentValue: 1 };
          }
          if (obj.id === 'min_contacts') {
            const contacts = prev.levelState.metrics.mucosalContacts;
            return { 
              ...obj, 
              isCompleted: contacts < 3,
              currentValue: Math.max(0, 3 - contacts),
            };
          }
        }
        // Add more level-specific objective checks here
        
        return obj;
      });

      return {
        ...prev,
        levelState: {
          ...prev.levelState,
          objectives,
        },
      };
    });
  }, []);

  const setTool = useCallback((tool: ToolType) => {
    setGameState(prev => ({
      ...prev,
      tool: { ...prev.tool, activeTool: tool },
    }));
  }, []);

  const setSecondaryHandDetected = useCallback((detected: boolean) => {
    setGameState(prev => {
      // Prevent unnecessary re-renders if value hasn't changed
      if (prev.tool.secondaryHandDetected === detected) return prev;
      return {
        ...prev,
        tool: { ...prev.tool, secondaryHandDetected: detected },
      };
    });
  }, []);

  const completeCalibration = useCallback(() => {
    startTimeRef.current = Date.now();
    setTimeElapsed(0);
    
    const introMessage = getIntroMessage(gameState.currentLevel);
    
    setGameState(prev => ({
      ...prev,
      isCalibrating: false,
      attendingMessages: [introMessage],
    }));
  }, [gameState.currentLevel]);

  return {
    gameState,
    physics: physicsRef.current,
    startLevel,
    pauseGame,
    resumeGame,
    resetGame,
    updateFromHand,
    setTool,
    setSecondaryHandDetected,
    completeCalibration,
    timeElapsed,
  };
}
