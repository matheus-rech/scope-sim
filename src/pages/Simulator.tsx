import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useSimulator } from '@/hooks/useSimulator';
import { useAICoach } from '@/hooks/useAICoach';
import { useReplaySystem } from '@/hooks/useReplaySystem';
import EndoscopicView from '@/components/simulator/EndoscopicView';
import HandTrackingPreview from '@/components/simulator/HandTrackingPreview';
import VitalsMonitor from '@/components/simulator/VitalsMonitor';
import AttendingCoach from '@/components/simulator/AttendingCoach';
import LevelInfoPanel from '@/components/simulator/LevelInfoPanel';
import ToolSelector from '@/components/simulator/ToolSelector';
import DopplerFeedback from '@/components/simulator/DopplerFeedback';
import PostOpReport from '@/components/simulator/PostOpReport';
import ScenarioSelection from '@/components/simulator/ScenarioSelection';
import ICAMappingOverlay from '@/components/simulator/ICAMappingOverlay';
import { ReplayControls } from '@/components/simulator/ReplayControls';
import { RecordingsList } from '@/components/simulator/RecordingsList';
import { ReplayView } from '@/components/simulator/ReplayView';
import { OrientationLanding } from '@/components/orientation/OrientationLanding';
import { ChapterPlayer } from '@/components/orientation/ChapterPlayer';
import { GuidedWalkthrough } from '@/components/orientation/GuidedWalkthrough';
import { distanceToDangerLevel } from '@/lib/haptic/HapticFeedback';
import { Button } from '@/components/ui/button';
import { MedicalCard, MedicalCardIcon } from '@/components/ui/medical-card';
import { LevelId, AttendingMessage, TumorScenario } from '@/types/simulator';
import type { InterpolatedFrame } from '@/lib/replay/types';
import { cn } from '@/lib/utils';
import { 
  Hand, 
  Telescope, 
  GripHorizontal, 
  Stethoscope, 
  Navigation,
  Hammer,
  Target,
  Brain,
  Wrench,
  Play,
  Camera,
  Film,
  X,
  GraduationCap
} from 'lucide-react';

const LEVEL_CONFIG: Record<number, { name: string }> = {
  1: { name: 'Nasal Navigation' },
  2: { name: 'Sphenoidotomy' },
  3: { name: 'Sellar Exposure' },
  4: { name: 'Tumor Resection' },
  5: { name: 'Reconstruction' },
};

export default function Simulator() {
  const handTracking = useHandTracking();
  const simulator = useSimulator();
  const aiCoach = useAICoach({ minInterval: 20000, enabled: true });
  const [isStarted, setIsStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showScenarioSelection, setShowScenarioSelection] = useState(false);
  const [showPostOpReport, setShowPostOpReport] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TumorScenario | null>(null);
  const [aiMessages, setAiMessages] = useState<AttendingMessage[]>([]);
  
  // Orientation state
  const [showOrientation, setShowOrientation] = useState(false);
  const [orientationChapterId, setOrientationChapterId] = useState<string | null>(null);
  const [showGuidedWalkthrough, setShowGuidedWalkthrough] = useState(false);
  
  // Replay system state
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [currentReplayFrame, setCurrentReplayFrame] = useState<InterpolatedFrame | null>(null);
  const [showRecordingsList, setShowRecordingsList] = useState(false);
  
  // Replay system hook
  const replaySystem = useReplaySystem({
    onPlaybackFrame: setCurrentReplayFrame,
  });
  
  // Track previous state for detecting changes
  const prevStateRef = useRef({
    tool: simulator.gameState.tool.activeTool,
    isColliding: simulator.gameState.endoscope.isColliding,
    complications: simulator.gameState.complications.length,
    objectivesCompleted: simulator.gameState.levelState.objectives.filter(o => o.isCompleted).length,
  });

  // Stable refs for simulator functions to avoid re-render loops
  const updateFromHandRef = useRef(simulator.updateFromHand);
  const setSecondaryHandRef = useRef(simulator.setSecondaryHandDetected);
  updateFromHandRef.current = simulator.updateFromHand;
  setSecondaryHandRef.current = simulator.setSecondaryHandDetected;

  // Update simulator with hand tracking data
  useEffect(() => {
    if (!isStarted || simulator.gameState.isPaused) return;

    updateFromHandRef.current(
      handTracking.dominantHand,
      handTracking.wristRotation,
      handTracking.pinchStrength
    );

    // Track secondary hand - only update if value changed (handled in hook)
    const hasSecondary = !!handTracking.secondaryHand;
    setSecondaryHandRef.current(hasSecondary);
  }, [
    handTracking.dominantHand,
    handTracking.wristRotation,
    handTracking.pinchStrength,
    handTracking.secondaryHand,
    isStarted,
    simulator.gameState.isPaused,
  ]);

  // Capture frames for replay during gameplay
  useEffect(() => {
    if (!isStarted || simulator.gameState.isPaused || simulator.gameState.isCalibrating) return;
    
    // Capture frame for replay recording
    replaySystem.captureFrame({
      endoscope: simulator.gameState.endoscope,
      tool: simulator.gameState.tool,
      step: simulator.gameState.surgicalStep,
      bloodLevel: simulator.gameState.bloodLevel,
    });
  }, [isStarted, simulator.gameState, replaySystem]);

  // AI Coaching - triggered by state changes and periodically
  useEffect(() => {
    if (!isStarted || simulator.gameState.isPaused || simulator.gameState.isCalibrating) return;

    const prev = prevStateRef.current;
    const current = simulator.gameState;
    
    let trigger: 'periodic' | 'collision' | 'tool_change' | 'complication' | 'milestone' | 'doppler_warning' | null = null;

    // Detect trigger conditions
    if (current.tool.activeTool !== prev.tool) {
      trigger = 'tool_change';
    } else if (current.endoscope.isColliding && !prev.isColliding) {
      trigger = 'collision';
    } else if (current.complications.length > prev.complications) {
      trigger = 'complication';
    } else if (current.levelState.objectives.filter(o => o.isCompleted).length > prev.objectivesCompleted) {
      trigger = 'milestone';
    } else if (current.tool.dopplerState.nearestICADistance < 0.5 && current.tool.activeTool === 'doppler') {
      trigger = 'doppler_warning';
    }

    // Update prev state
    prevStateRef.current = {
      tool: current.tool.activeTool,
      isColliding: current.endoscope.isColliding,
      complications: current.complications.length,
      objectivesCompleted: current.levelState.objectives.filter(o => o.isCompleted).length,
    };

    if (trigger) {
      aiCoach.requestCoaching(current, trigger).then(message => {
        if (message) {
          setAiMessages(prev => [...prev.slice(-9), message]); // Keep last 10 messages
        }
      });
    }
  }, [
    isStarted,
    simulator.gameState,
    aiCoach,
  ]);

  // Periodic AI coaching check
  useEffect(() => {
    if (!isStarted || simulator.gameState.isPaused) return;

    const interval = setInterval(() => {
      aiCoach.requestCoaching(simulator.gameState, 'periodic').then(message => {
        if (message) {
          setAiMessages(prev => [...prev.slice(-9), message]);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isStarted, simulator.gameState.isPaused, aiCoach, simulator.gameState]);

  const handleStart = useCallback(() => {
    // Don't start tracking yet - wait for calibration screen where video element exists
    setShowInstructions(false);
    setShowScenarioSelection(true);
  }, []);

  const handleScenarioSelect = useCallback((scenario: TumorScenario) => {
    setSelectedScenario(scenario);
    setShowScenarioSelection(false);
    // Start tracking after a brief delay to ensure video element is mounted
    setTimeout(() => {
      handTracking.startTracking();
    }, 100);
  }, [handTracking]);

  const handleBackToInstructions = useCallback(() => {
    setShowScenarioSelection(false);
    setShowInstructions(true);
  }, []);

  const handleBeginLevel = useCallback(() => {
    if (!handTracking.isCalibrated) {
      handTracking.calibrate();
    }
    // Start level with selected scenario
    simulator.startLevel(1, selectedScenario || undefined);
    simulator.completeCalibration();
    setIsStarted(true);
    
    // Start recording for replay
    replaySystem.startRecording(1, selectedScenario || undefined);
    
    // Request initial AI greeting
    setTimeout(() => {
      aiCoach.requestCoaching(simulator.gameState, 'milestone').then(message => {
        if (message) {
          setAiMessages([message]);
        }
      });
    }, 1000);
  }, [handTracking, simulator, aiCoach, selectedScenario, replaySystem]);

  const handleLevelSelect = useCallback((level: LevelId) => {
    simulator.startLevel(level, selectedScenario || undefined);
    setIsStarted(true);
    setShowPostOpReport(false);
    setAiMessages([]);
    // Start recording for replay
    replaySystem.startRecording(level, selectedScenario || undefined);
  }, [simulator, selectedScenario, replaySystem]);

  const handleLevelComplete = useCallback(async () => {
    // Stop recording and save
    await replaySystem.stopRecording(simulator.gameState.levelState.score);
    setShowPostOpReport(true);
  }, [replaySystem, simulator.gameState.levelState.score]);

  const handleContinueToNextLevel = useCallback(() => {
    const nextLevel = Math.min(5, simulator.gameState.currentLevel + 1) as LevelId;
    simulator.startLevel(nextLevel, selectedScenario || undefined);
    setShowPostOpReport(false);
    setAiMessages([]);
    // Start new recording
    replaySystem.startRecording(nextLevel, selectedScenario || undefined);
  }, [simulator, selectedScenario, replaySystem]);

  const handleRestartLevel = useCallback(() => {
    simulator.resetGame();
    setShowPostOpReport(false);
    setAiMessages([]);
  }, [simulator]);

  // Replay handlers
  const handleOpenReplays = useCallback(() => {
    setShowRecordingsList(true);
  }, []);

  const handleCloseReplays = useCallback(() => {
    setShowRecordingsList(false);
    setIsReplayMode(false);
    replaySystem.unloadRecording();
    setCurrentReplayFrame(null);
  }, [replaySystem]);

  const handleSelectRecording = useCallback(async (id: string) => {
    await replaySystem.loadRecording(id);
    setIsReplayMode(true);
  }, [replaySystem]);

  const handleExitReplayMode = useCallback(() => {
    setIsReplayMode(false);
    replaySystem.unloadRecording();
    setCurrentReplayFrame(null);
  }, [replaySystem]);

  // Post-Operative Report Screen
  if (showPostOpReport) {
    return (
      <PostOpReport
        levelState={simulator.gameState.levelState}
        totalTime={simulator.timeElapsed}
        complications={simulator.gameState.complications}
        scenario={simulator.gameState.scenario}
        onContinue={handleContinueToNextLevel}
        onRestart={handleRestartLevel}
      />
    );
  }

  // Guided Walkthrough (Full Procedure Video)
  if (showGuidedWalkthrough) {
    return (
      <GuidedWalkthrough
        onExit={() => {
          setShowGuidedWalkthrough(false);
          setShowOrientation(true);
        }}
      />
    );
  }

  // Orientation Chapter Player
  if (orientationChapterId) {
    return (
      <ChapterPlayer
        chapterId={orientationChapterId}
        onComplete={() => {
          setOrientationChapterId(null);
          setShowOrientation(true);
        }}
        onExit={() => {
          setOrientationChapterId(null);
          setShowOrientation(true);
        }}
      />
    );
  }

  // Orientation Landing Screen
  if (showOrientation) {
    return (
      <OrientationLanding
        onSelectChapter={(chapterId) => {
          setShowOrientation(false);
          setOrientationChapterId(chapterId);
        }}
        onSkip={() => {
          setShowOrientation(false);
        }}
        onStartWalkthrough={() => {
          setShowOrientation(false);
          setShowGuidedWalkthrough(true);
        }}
      />
    );
  }

  // Instructions/Welcome Screen
  if (showInstructions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="max-w-3xl w-full space-y-8 relative z-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Surgical Training Simulator</span>
            </div>
            <h1 className="text-5xl font-bold text-foreground tracking-tight">
              <span className="text-gradient-primary">NeuroEndoSim</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Transsphenoidal Pituitary Tumor Resection Training with Real-Time AI Coaching
            </p>
          </div>

          {/* Feature Cards */}
          <MedicalCard variant="glass" gradient className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MedicalCard variant="elevated" size="sm" className="group hover:shadow-glow-sm transition-all">
                <div className="flex items-start gap-4">
                  <MedicalCardIcon className="bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Hand className="w-5 h-5 text-primary" />
                  </MedicalCardIcon>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Hand Tracking</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your hand controls the endoscope. Move to navigate, rotate wrist to change scope angle.
                    </p>
                  </div>
                </div>
              </MedicalCard>
              
              <MedicalCard variant="elevated" size="sm" className="group hover:shadow-glow-sm transition-all">
                <div className="flex items-start gap-4">
                  <MedicalCardIcon className="bg-accent/20 group-hover:bg-accent/30 transition-colors">
                    <Telescope className="w-5 h-5 text-accent" />
                  </MedicalCardIcon>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Pivot Mechanics</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The scope pivots at the nostril - small hand movements create larger tip movements.
                    </p>
                  </div>
                </div>
              </MedicalCard>
              
              <MedicalCard variant="elevated" size="sm" className="group hover:shadow-glow-sm transition-all">
                <div className="flex items-start gap-4">
                  <MedicalCardIcon className="bg-success/20 group-hover:bg-success/30 transition-colors">
                    <GripHorizontal className="w-5 h-5 text-success" />
                  </MedicalCardIcon>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Tool Control</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Pinch gesture activates tools. Use secondary hand for dual-handed procedures.
                    </p>
                  </div>
                </div>
              </MedicalCard>
              
              <MedicalCard variant="elevated" size="sm" className="group hover:shadow-glow-sm transition-all">
                <div className="flex items-start gap-4">
                  <MedicalCardIcon className="bg-warning/20 group-hover:bg-warning/30 transition-colors">
                    <Stethoscope className="w-5 h-5 text-warning" />
                  </MedicalCardIcon>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">AI Coaching</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Dr. Chen provides real-time guidance powered by Gemini 3 Pro.
                    </p>
                  </div>
                </div>
              </MedicalCard>
            </div>

            {/* Level Timeline */}
            <div className="pt-4 border-t border-border/50">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                5 Progressive Levels
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 1, name: 'Nasal Navigation', icon: <Navigation className="w-3.5 h-3.5" />, color: 'bg-primary/20 text-primary border-primary/30' },
                  { id: 2, name: 'Sphenoidotomy', icon: <Hammer className="w-3.5 h-3.5" />, color: 'bg-warning/20 text-warning border-warning/30' },
                  { id: 3, name: 'Sellar Exposure', icon: <Target className="w-3.5 h-3.5" />, color: 'bg-accent/20 text-accent border-accent/30' },
                  { id: 4, name: 'Tumor Resection', icon: <Brain className="w-3.5 h-3.5" />, color: 'bg-success/20 text-success border-success/30' },
                  { id: 5, name: 'Reconstruction', icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-vitals-bp/20 text-vitals-bp border-vitals-bp/30' },
                ].map(level => (
                  <span
                    key={level.id}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:scale-105',
                      level.color
                    )}
                  >
                    {level.icon}
                    {level.name}
                  </span>
                ))}
              </div>
            </div>
          </MedicalCard>

          {/* CTA */}
          <div className="text-center space-y-4">
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                onClick={handleStart}
                className="px-12 py-6 text-lg glow-primary font-semibold group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Simulator
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowOrientation(true)}
                className="px-8 py-6 text-lg group border-accent/50 hover:border-accent hover:bg-accent/10"
              >
                <GraduationCap className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-accent" />
                Resident Orientation
              </Button>
              {replaySystem.savedRecordings.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleOpenReplays}
                  className="px-8 py-6 text-lg group"
                >
                  <Film className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Replays ({replaySystem.savedRecordings.length})
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              Requires webcam access for hand tracking
            </p>
          </div>

          {/* Recordings Modal */}
          {showRecordingsList && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
              <MedicalCard variant="default" className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Film className="w-5 h-5 text-primary" />
                    Surgical Recordings
                  </h2>
                  <Button variant="ghost" size="icon" onClick={handleCloseReplays}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {isReplayMode && replaySystem.playbackState && replaySystem.currentRecording ? (
                    <div className="space-y-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <ReplayView frame={currentReplayFrame} />
                      </div>
                      <ReplayControls
                        playbackState={replaySystem.playbackState}
                        events={replaySystem.currentRecording.events}
                        onPlay={replaySystem.play}
                        onPause={replaySystem.pause}
                        onSeek={replaySystem.seek}
                        onSpeedChange={replaySystem.setSpeed}
                        onSeekToEvent={replaySystem.seekToEvent}
                        onSeekToStart={replaySystem.seekToStart}
                        onSeekToEnd={replaySystem.seekToEnd}
                        onStepForward={replaySystem.stepForward}
                        onStepBackward={replaySystem.stepBackward}
                      />
                      <Button variant="outline" onClick={handleExitReplayMode} className="w-full">
                        Back to Recordings List
                      </Button>
                    </div>
                  ) : (
                    <RecordingsList
                      recordings={replaySystem.savedRecordings}
                      onSelect={handleSelectRecording}
                      onDelete={replaySystem.deleteRecording}
                      loading={replaySystem.loadingRecording}
                    />
                  )}
                </div>
              </MedicalCard>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Scenario Selection Screen
  if (showScenarioSelection) {
    return (
      <ScenarioSelection
        onSelect={handleScenarioSelect}
        onBack={handleBackToInstructions}
      />
    );
  }

  // Calibration Screen
  if (simulator.gameState.isCalibrating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Calibration</h2>
            <p className="text-muted-foreground">
              Position your hand in the camera view and hold steady
            </p>
          </div>

          <div className="aspect-[4/3] w-full">
            <HandTrackingPreview
              videoRef={handTracking.videoRef}
              canvasRef={handTracking.canvasRef}
              isTracking={handTracking.isTracking}
              isCalibrated={handTracking.isCalibrated}
              gesture={handTracking.dominantGesture}
              pinchStrength={handTracking.pinchStrength}
              onCalibrate={handTracking.calibrate}
            />
          </div>

          <div className="space-y-4">
            {handTracking.error ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm text-destructive">{handTracking.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handTracking.startTracking}
                  className="mt-2"
                >
                  Retry Webcam
                </Button>
              </div>
            ) : handTracking.isLoading ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading hand tracking model...
                </p>
              </div>
            ) : !handTracking.isTracking ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Webcam not started yet
                </p>
                <Button
                  variant="outline"
                  onClick={handTracking.startTracking}
                >
                  Start Webcam
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-secondary rounded-lg p-4 space-y-2">
                  <p className="text-sm text-foreground">
                    1. Hold your <strong>right hand</strong> flat in front of the camera
                  </p>
                  <p className="text-sm text-foreground">
                    2. Click <strong>"Calibrate Position"</strong> when ready
                  </p>
                  <p className="text-sm text-foreground">
                    3. This position becomes your center point
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={handleBeginLevel}
                  className="w-full"
                >
                  {handTracking.isCalibrated ? 'Begin Surgery' : 'Begin (will auto-calibrate)'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Simulator View
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h1 className="text-sm font-bold text-foreground">
                NeuroEndoSim
              </h1>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              Level {simulator.gameState.currentLevel} • {LEVEL_CONFIG[simulator.gameState.currentLevel]?.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {simulator.gameState.isPaused ? (
              <Button size="sm" onClick={simulator.resumeGame} className="glow-primary">
                Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={simulator.pauseGame}>
                Pause
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={simulator.resetGame}>
              Reset
            </Button>
            <Button size="sm" variant="secondary" onClick={handleLevelComplete}>
              End Level
            </Button>
          </div>
        </header>

        {/* Endoscopic View */}
        <main className="flex-1 p-4 flex items-center justify-center min-h-0 relative">
          <div className="w-full max-w-3xl aspect-square">
            <EndoscopicView
              endoscopeState={simulator.gameState.endoscope}
              showBloodOverlay={simulator.gameState.levelState.metrics.bloodInField}
              bloodLevel={simulator.gameState.bloodLevel}
              showFog={simulator.gameState.endoscope.insertionDepth > 95}
              medialWall={simulator.gameState.medialWall}
              activeTool={simulator.gameState.tool.activeTool}
              isToolActive={simulator.gameState.tool.isActive}
            />
          </div>
          
          {/* ICA Mapping Overlay - appears when Doppler is active */}
          {simulator.gameState.tool.activeTool === 'doppler' && (
            <div className="absolute bottom-8 left-8">
              <ICAMappingOverlay
                isActive={simulator.gameState.tool.isActive}
                probePosition={simulator.gameState.endoscope.tipPosition}
                signalIntensity={simulator.gameState.tool.dopplerState.signalStrength}
                dangerLevel={distanceToDangerLevel(simulator.gameState.tool.dopplerState.nearestICADistance)}
              />
            </div>
          )}
        </main>

        {/* Bottom Bar - Tools and Doppler */}
        <footer className="h-auto bg-card/80 backdrop-blur-sm border-t border-border p-3 flex-shrink-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <ToolSelector
                toolState={simulator.gameState.tool}
                onToolChange={simulator.setTool}
                disabled={simulator.gameState.isPaused}
              />
            </div>
            {simulator.gameState.tool.activeTool === 'doppler' && (
              <div className="w-52">
                <DopplerFeedback
                  dopplerState={simulator.gameState.tool.dopplerState}
                  isActive={simulator.gameState.tool.activeTool === 'doppler'}
                />
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-card to-card/80 border-l border-border flex flex-col min-h-0 flex-shrink-0">
        {/* Hand Tracking Preview */}
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="aspect-[4/3]">
            <HandTrackingPreview
              videoRef={handTracking.videoRef}
              canvasRef={handTracking.canvasRef}
              isTracking={handTracking.isTracking}
              isCalibrated={handTracking.isCalibrated}
              gesture={handTracking.dominantGesture}
              pinchStrength={handTracking.pinchStrength}
              onCalibrate={handTracking.calibrate}
              activeTool={simulator.gameState.tool.activeTool}
              isToolActive={simulator.gameState.tool.isActive}
              handPosition={handTracking.isTracking ? {
                x: handTracking.dominantHand.palmCenter.x,
                y: handTracking.dominantHand.palmCenter.y,
              } : null}
            />
          </div>
        </div>

        {/* Vitals */}
        <div className="p-3 border-b border-border flex-shrink-0">
          <VitalsMonitor vitals={simulator.gameState.vitals} />
        </div>

        {/* Level Info */}
        <div className="p-3 border-b border-border flex-shrink-0">
          <LevelInfoPanel
            levelState={simulator.gameState.levelState}
            timeElapsed={simulator.timeElapsed}
          />
        </div>

        {/* Attending Coach - fills remaining space */}
        <div className="flex-1 min-h-0 p-3">
          <AttendingCoach
            messages={[...simulator.gameState.attendingMessages, ...aiMessages]}
            currentLevel={simulator.gameState.currentLevel}
            isAILoading={aiCoach.isLoading}
          />
        </div>
      </aside>

      {/* Pause Overlay */}
      {simulator.gameState.isPaused && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Paused</h2>
            <p className="text-muted-foreground">
              Take a moment. Review your position.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={simulator.resumeGame}>Resume</Button>
              <Button variant="outline" onClick={simulator.resetGame}>
                Restart Level
              </Button>
            </div>
            
            {/* Level selection */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Jump to Level</p>
              <div className="flex gap-2 justify-center">
                {([1, 2, 3, 4, 5] as LevelId[]).map(level => (
                  <Button
                    key={level}
                    size="sm"
                    variant={simulator.gameState.currentLevel === level ? 'default' : 'outline'}
                    onClick={() => handleLevelSelect(level)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
