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
  Vector3D,
  WallInteractionZone,
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
import { evaluateSurgicalRules, ruleToMessage, determineSurgicalStep } from '@/lib/surgical/SurgicalRuleEngine';

const initialDopplerState: DopplerState = {
  isActive: false,
  signalStrength: 0,
  nearestICADistance: 10,
  audioPlaying: false,
};

const initialMedialWallState = {
  leftIntegrity: 1.0,
  rightIntegrity: 1.0,
  leftZones: { superior: 1.0, middle: 1.0, inferior: 1.0 },
  rightZones: { superior: 1.0, middle: 1.0, inferior: 1.0 },
  technique: null as 'peeling' | 'resection' | null,
  lastToolUsed: null as 'curette' | 'dissector' | null,
  interactionCount: 0,
};

const initialToolVector = {
  direction: { x: 0, y: 0, z: 0 },
  magnitude: 0,
  verticalComponent: 0,
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
  // Dynamic surgical state
  surgicalStep: 'APPROACH',
  medialWall: initialMedialWallState,
  toolVector: initialToolVector,
  bloodLevel: 0,
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
  const lastRuleCheckRef = useRef<number>(0);
  const prevTipPositionRef = useRef<Vector3D>({ x: 0, y: 0, z: 0 });

  // Tool-specific removal rates and techniques for wall interaction
  const WALL_INTERACTION_CONFIG = {
    curette: {
      removalRate: 0.04,      // Aggressive removal
      technique: 'resection' as const,
      bleedChance: 0.3,       // Higher bleed risk
      bleedAmount: 5,
    },
    dissector: {
      removalRate: 0.015,     // Gentle peeling
      technique: 'peeling' as const,
      bleedChance: 0.1,       // Lower bleed risk
      bleedAmount: 2,
    },
  };

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

  // Blood level management - suction reduces blood
  useEffect(() => {
    if (gameState.isPaused || gameState.isCalibrating) return;
    
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (gameState.tool.isActive && gameState.tool.activeTool === 'suction') {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          bloodLevel: Math.max(0, prev.bloodLevel - 1.5)
        }));
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.tool.isActive, gameState.tool.activeTool, gameState.isPaused, gameState.isCalibrating]);

  // Surgical rule engine check
  useEffect(() => {
    if (gameState.isPaused || gameState.isCalibrating) return;
    
    const now = Date.now();
    // Check rules max once per 2 seconds to avoid spam
    if (now - lastRuleCheckRef.current < 2000) return;
    
    const ruleResult = evaluateSurgicalRules(gameState, gameState.scenario);
    
    if (ruleResult) {
      addMessage(ruleToMessage(ruleResult));
      lastRuleCheckRef.current = now;
    }
  }, [gameState.toolVector, gameState.medialWall, gameState.surgicalStep, gameState.bloodLevel, gameState.isPaused, gameState.isCalibrating, gameState.scenario]);

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
      // Reset dynamic surgical state
      surgicalStep: 'APPROACH',
      medialWall: initialMedialWallState,
      toolVector: initialToolVector,
      bloodLevel: 0,
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

    // Calculate tool vector from movement
    const tipPos = endoscopeState.tipPosition;
    const prevPos = prevTipPositionRef.current;
    const dx = tipPos.x - prevPos.x;
    const dy = tipPos.y - prevPos.y;
    const dz = tipPos.z - prevPos.z;
    const magnitude = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    const newToolVector = magnitude > 0.001 ? {
      direction: { x: dx/magnitude, y: dy/magnitude, z: dz/magnitude },
      magnitude,
      verticalComponent: dy / (magnitude || 1)
    } : prevTipPositionRef.current ? gameState.toolVector : initialToolVector;
    
    prevTipPositionRef.current = { ...tipPos };

    // Update surgical step based on current state
    const newSurgicalStep = determineSurgicalStep({
      ...gameState,
      endoscope: endoscopeState,
    });

    // Handle collision-induced bleeding
    let bloodIncrease = 0;
    if (endoscopeState.isColliding && pinchStrength > 0.7) {
      // Active tool touching tissue causes more bleeding
      bloodIncrease = gameState.tool.activeTool === 'drill' ? 5 : 2;
    } else if (endoscopeState.isColliding) {
      // Passive contact causes minor bleeding
      bloodIncrease = Math.random() > 0.7 ? 1 : 0;
    }

    // Calculate medial wall interaction for curette/dissector
    const activeTool = gameState.tool.activeTool;
    const isWallTool = activeTool === 'curette' || activeTool === 'dissector';
    const shouldInteractWithWall = isWallTool && pinchStrength > 0.7 && 
      (newSurgicalStep === 'RESECTION' || newSurgicalStep === 'INCISION') &&
      endoscopeState.insertionDepth > 70;

    // Update game state
    setGameState(prev => {
      let newMedialWall = prev.medialWall;
      let wallBleedIncrease = 0;

      // Medial wall interaction logic
      if (shouldInteractWithWall) {
        const config = WALL_INTERACTION_CONFIG[activeTool as 'curette' | 'dissector'];
        const tipPos = endoscopeState.tipPosition;
        
        // Define medial wall positions
        const leftWallX = -0.6;
        const rightWallX = 0.6;
        const wallZ = 9.6;
        const INTERACTION_RADIUS = 0.5;
        
        // Calculate distance to each wall
        const leftDist = Math.sqrt(
          Math.pow(tipPos.x - leftWallX, 2) + 
          Math.pow(tipPos.z - wallZ, 2)
        );
        const rightDist = Math.sqrt(
          Math.pow(tipPos.x - rightWallX, 2) + 
          Math.pow(tipPos.z - wallZ, 2)
        );
        
        // Determine which zone based on Y position
        const getZone = (y: number): 'superior' | 'middle' | 'inferior' => {
          if (y > 0.2) return 'superior';
          if (y < -0.2) return 'inferior';
          return 'middle';
        };
        
        const zone = getZone(tipPos.y);
        const isInteractingLeft = leftDist < INTERACTION_RADIUS;
        const isInteractingRight = rightDist < INTERACTION_RADIUS;
        
        if (isInteractingLeft || isInteractingRight) {
          const newLeftZones = { ...prev.medialWall.leftZones };
          const newRightZones = { ...prev.medialWall.rightZones };
          
          // Apply removal to specific zone
          if (isInteractingLeft && newLeftZones[zone] > 0) {
            newLeftZones[zone] = Math.max(0, newLeftZones[zone] - config.removalRate);
          }
          if (isInteractingRight && newRightZones[zone] > 0) {
            newRightZones[zone] = Math.max(0, newRightZones[zone] - config.removalRate);
          }
          
          // Calculate overall integrity from zones
          const calcIntegrity = (zones: WallInteractionZone) =>
            (zones.superior + zones.middle + zones.inferior) / 3;
          
          // Random bleed chance
          if (Math.random() < config.bleedChance) {
            wallBleedIncrease = config.bleedAmount;
          }
          
          newMedialWall = {
            leftIntegrity: calcIntegrity(newLeftZones),
            rightIntegrity: calcIntegrity(newRightZones),
            leftZones: newLeftZones,
            rightZones: newRightZones,
            technique: config.technique,
            lastToolUsed: activeTool as 'curette' | 'dissector',
            interactionCount: prev.medialWall.interactionCount + 1,
          };
        }
      }

      return {
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
            bloodInField: prev.bloodLevel > 20,
          },
        },
        // Dynamic surgical state updates
        medialWall: newMedialWall,
        toolVector: newToolVector,
        surgicalStep: newSurgicalStep,
        bloodLevel: Math.min(100, prev.bloodLevel + bloodIncrease + wallBleedIncrease),
      };
    });

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
