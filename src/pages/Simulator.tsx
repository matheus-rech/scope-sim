import { useState, useEffect, useCallback, useRef } from 'react';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useSimulator } from '@/hooks/useSimulator';
import { useAICoach } from '@/hooks/useAICoach';
import EndoscopicView from '@/components/simulator/EndoscopicView';
import HandTrackingPreview from '@/components/simulator/HandTrackingPreview';
import VitalsMonitor from '@/components/simulator/VitalsMonitor';
import AttendingCoach from '@/components/simulator/AttendingCoach';
import LevelInfoPanel from '@/components/simulator/LevelInfoPanel';
import ToolSelector from '@/components/simulator/ToolSelector';
import DopplerFeedback from '@/components/simulator/DopplerFeedback';
import PostOpReport from '@/components/simulator/PostOpReport';
import ScenarioSelection from '@/components/simulator/ScenarioSelection';
import { Button } from '@/components/ui/button';
import { LevelId, AttendingMessage, TumorScenario } from '@/types/simulator';
import { cn } from '@/lib/utils';

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
  
  // Track previous state for detecting changes
  const prevStateRef = useRef({
    tool: simulator.gameState.tool.activeTool,
    isColliding: simulator.gameState.endoscope.isColliding,
    complications: simulator.gameState.complications.length,
    objectivesCompleted: simulator.gameState.levelState.objectives.filter(o => o.isCompleted).length,
  });

  // Update simulator with hand tracking data
  useEffect(() => {
    if (!isStarted || simulator.gameState.isPaused) return;

    simulator.updateFromHand(
      handTracking.dominantHand,
      handTracking.wristRotation,
      handTracking.pinchStrength
    );

    // Track secondary hand
    if (handTracking.secondaryHand) {
      simulator.setSecondaryHandDetected(true);
    } else {
      simulator.setSecondaryHandDetected(false);
    }
  }, [
    handTracking.dominantHand,
    handTracking.wristRotation,
    handTracking.pinchStrength,
    handTracking.secondaryHand,
    isStarted,
    simulator,
  ]);

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

  const handleStart = useCallback(async () => {
    await handTracking.startTracking();
    setShowInstructions(false);
    setShowScenarioSelection(true);
  }, [handTracking]);

  const handleScenarioSelect = useCallback((scenario: TumorScenario) => {
    setSelectedScenario(scenario);
    setShowScenarioSelection(false);
    // Will proceed to calibration
  }, []);

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
    
    // Request initial AI greeting
    setTimeout(() => {
      aiCoach.requestCoaching(simulator.gameState, 'milestone').then(message => {
        if (message) {
          setAiMessages([message]);
        }
      });
    }, 1000);
  }, [handTracking, simulator, aiCoach, selectedScenario]);

  const handleLevelSelect = useCallback((level: LevelId) => {
    simulator.startLevel(level, selectedScenario || undefined);
    setIsStarted(true);
    setShowPostOpReport(false);
    setAiMessages([]); // Clear messages on level change
  }, [simulator, selectedScenario]);

  const handleLevelComplete = useCallback(() => {
    setShowPostOpReport(true);
  }, []);

  const handleContinueToNextLevel = useCallback(() => {
    const nextLevel = Math.min(5, simulator.gameState.currentLevel + 1) as LevelId;
    simulator.startLevel(nextLevel, selectedScenario || undefined);
    setShowPostOpReport(false);
    setAiMessages([]);
  }, [simulator, selectedScenario]);

  const handleRestartLevel = useCallback(() => {
    simulator.resetGame();
    setShowPostOpReport(false);
    setAiMessages([]);
  }, [simulator]);

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

  // Instructions/Welcome Screen
  if (showInstructions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Endoscopic Surgery Simulator
            </h1>
            <p className="text-lg text-muted-foreground">
              Transsphenoidal Pituitary Tumor Resection Training
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="text-2xl">🖐️</div>
                <h3 className="font-medium text-foreground">Hand Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Your hand controls the endoscope. Move to navigate, rotate wrist to change scope angle.
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="text-2xl">🔭</div>
                <h3 className="font-medium text-foreground">Pivot Mechanics</h3>
                <p className="text-sm text-muted-foreground">
                  The scope pivots at the nostril - small hand movements create larger tip movements.
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="text-2xl">👌</div>
                <h3 className="font-medium text-foreground">Tool Control</h3>
                <p className="text-sm text-muted-foreground">
                  Pinch gesture activates tools. Use secondary hand for dual-handed procedures.
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="text-2xl">👨‍⚕️</div>
                <h3 className="font-medium text-foreground">AI Coaching</h3>
                <p className="text-sm text-muted-foreground">
                  Dr. Chen provides real-time guidance as your attending surgeon.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-medium text-foreground mb-3">5 Progressive Levels</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 1, name: 'Nasal Navigation', icon: '🏃' },
                  { id: 2, name: 'Sphenoidotomy', icon: '🔨' },
                  { id: 3, name: 'Sellar Exposure', icon: '🎯' },
                  { id: 4, name: 'Tumor Resection', icon: '🧠' },
                  { id: 5, name: 'Reconstruction', icon: '🔧' },
                ].map(level => (
                  <span
                    key={level.id}
                    className="bg-secondary px-3 py-1.5 rounded-md text-sm text-foreground"
                  >
                    {level.icon} {level.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <Button
              size="lg"
              onClick={handleStart}
              className="w-full md:w-auto px-12 py-6 text-lg glow-primary"
            >
              Start Simulator
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires webcam access for hand tracking
            </p>
          </div>
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
            {handTracking.isLoading ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading hand tracking model...
                </p>
              </div>
            ) : handTracking.error ? (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm text-destructive">{handTracking.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handTracking.startTracking}
                  className="mt-2"
                >
                  Retry
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
                  disabled={!handTracking.isTracking}
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
        <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold text-foreground">
              Endoscopic Surgery Simulator
            </h1>
            <span className="text-xs text-muted-foreground">
              Level {simulator.gameState.currentLevel}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {simulator.gameState.isPaused ? (
              <Button size="sm" variant="outline" onClick={simulator.resumeGame}>
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
        <main className="flex-1 p-4 flex items-center justify-center min-h-0">
          <div className="w-full max-w-3xl aspect-square">
            <EndoscopicView
              endoscopeState={simulator.gameState.endoscope}
              showBloodOverlay={simulator.gameState.levelState.metrics.bloodInField}
              showFog={simulator.gameState.endoscope.insertionDepth > 95}
            />
          </div>
        </main>

        {/* Bottom Bar - Tools and Doppler */}
        <footer className="h-auto bg-card border-t border-border p-2 flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <ToolSelector
                toolState={simulator.gameState.tool}
                onToolChange={simulator.setTool}
                disabled={simulator.gameState.isPaused}
              />
            </div>
            {simulator.gameState.tool.activeTool === 'doppler' && (
              <div className="w-48">
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
      <aside className="w-80 bg-card border-l border-border flex flex-col min-h-0 flex-shrink-0">
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
