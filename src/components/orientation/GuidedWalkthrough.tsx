import { useState, useRef, useEffect, useCallback } from 'react';
import { WALKTHROUGH_STEPS, WalkthroughStep, getStepAtTime } from '@/lib/orientation/WalkthroughSteps';
import { useOrientationNarration } from '@/hooks/useOrientationNarration';
import { MedicalCard } from '@/components/ui/medical-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  X, 
  Volume2, 
  VolumeX,
  AlertTriangle,
  Lightbulb,
  Target,
  Wrench,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import attendingDemoVideo from '@/assets/attending-demo-procedure.mp4';

interface GuidedWalkthroughProps {
  onExit: () => void;
}

export function GuidedWalkthrough({ onExit }: GuidedWalkthroughProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentStep, setCurrentStep] = useState<WalkthroughStep | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSpokenStep, setHasSpokenStep] = useState<string | null>(null);
  
  const narration = useOrientationNarration();

  // Handle video time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      const step = getStepAtTime(video.currentTime);
      if (step && step.id !== currentStep?.id) {
        setCurrentStep(step);
        
        // Auto-pause at new step for guided mode
        if (!isMuted && step.id !== hasSpokenStep) {
          video.pause();
          setIsPlaying(false);
          setIsPaused(true);
          setHasSpokenStep(step.id);
          narration.speak(step.narration);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentStep, hasSpokenStep, isMuted, narration]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPlaying]);

  const handleSeekToStep = useCallback((step: WalkthroughStep) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = step.timeStart;
    setCurrentStep(step);
    setHasSpokenStep(null);
    narration.stop();
  }, [narration]);

  const handlePreviousStep = useCallback(() => {
    if (!currentStep) return;
    const currentIndex = WALKTHROUGH_STEPS.findIndex(s => s.id === currentStep.id);
    if (currentIndex > 0) {
      handleSeekToStep(WALKTHROUGH_STEPS[currentIndex - 1]);
    }
  }, [currentStep, handleSeekToStep]);

  const handleNextStep = useCallback(() => {
    if (!currentStep) return;
    const currentIndex = WALKTHROUGH_STEPS.findIndex(s => s.id === currentStep.id);
    if (currentIndex < WALKTHROUGH_STEPS.length - 1) {
      handleSeekToStep(WALKTHROUGH_STEPS[currentIndex + 1]);
    }
  }, [currentStep, handleSeekToStep]);

  const handleContinue = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    setIsPaused(false);
    video.play();
    setIsPlaying(true);
  }, []);

  const handleRestart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setHasSpokenStep(null);
    setCurrentStep(null);
    narration.stop();
  }, [narration]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        narration.stop();
      }
      return !prev;
    });
  }, [narration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentStepIndex = currentStep 
    ? WALKTHROUGH_STEPS.findIndex(s => s.id === currentStep.id) 
    : -1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Guided Surgical Walkthrough</h1>
            <p className="text-sm text-muted-foreground">
              Pituitary Adenoma Resection - Full Procedure
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-accent/10 border-accent/30">
            Step {currentStepIndex + 1} of {WALKTHROUGH_STEPS.length}
          </Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video section */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={attendingDemoVideo}
            className="max-w-full max-h-full object-contain"
            playsInline
          />
          
          {/* Pause overlay for step explanation */}
          {isPaused && currentStep && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <MedicalCard variant="elevated" className="max-w-lg mx-4 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Pause className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {currentStep.phase}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{currentStep.title}</h3>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStep.narration}
                </p>
                
                <Button onClick={handleContinue} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Demonstration
                </Button>
              </MedicalCard>
            </div>
          )}

          {/* Current step indicator */}
          {currentStep && !isPaused && (
            <div className="absolute top-4 left-4 z-10">
              <Badge className="bg-background/90 text-foreground border-border">
                {currentStep.phase}: {currentStep.title}
              </Badge>
            </div>
          )}
        </div>

        {/* Info sidebar */}
        <div className="w-96 border-l border-border bg-background overflow-y-auto">
          {currentStep ? (
            <div className="p-4 space-y-4">
              {/* Step header */}
              <div className="space-y-2">
                <div className="text-xs text-primary font-medium uppercase tracking-wide">
                  {currentStep.phase}
                </div>
                <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
              </div>

              {/* Tools */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Instruments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentStep.tools.map(tool => (
                    <Badge key={tool} variant="secondary" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Landmarks */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  Anatomical Landmarks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentStep.landmarks.map(landmark => (
                    <Badge key={landmark} variant="outline" className="text-xs">
                      {landmark}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {currentStep.warnings.length > 0 && (
                <MedicalCard variant="default" className="p-3 border-warning/30 bg-warning/5">
                  <h3 className="text-sm font-semibold text-warning flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Points
                  </h3>
                  <ul className="space-y-1">
                    {currentStep.warnings.map((warning, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </MedicalCard>
              )}

              {/* Tip */}
              <MedicalCard variant="default" className="p-3 border-primary/30 bg-primary/5">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4" />
                  Pro Tip
                </h3>
                <p className="text-xs text-muted-foreground">{currentStep.tip}</p>
              </MedicalCard>

              {/* Step navigation */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Procedure Steps</h3>
                <div className="space-y-1">
                  {WALKTHROUGH_STEPS.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => handleSeekToStep(step)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        step.id === currentStep.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <span className="font-medium">{index + 1}.</span> {step.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>Press play to begin the guided walkthrough</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Progress bar with step markers */}
          <div className="relative">
            <Progress value={progress} className="h-2" />
            {/* Step markers */}
            <div className="absolute inset-x-0 top-0 h-2">
              {WALKTHROUGH_STEPS.map(step => (
                <button
                  key={step.id}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-2 border-primary hover:scale-125 transition-transform"
                  style={{ left: `${(step.timeStart / duration) * 100}%` }}
                  onClick={() => handleSeekToStep(step)}
                  title={step.title}
                />
              ))}
            </div>
          </div>

          {/* Time and controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground w-20">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={handlePreviousStep} disabled={currentStepIndex <= 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button size="lg" onClick={handlePlayPause} className="px-8">
                {isPlaying ? (
                  <><Pause className="w-5 h-5 mr-2" /> Pause</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> {currentTime > 0 ? 'Resume' : 'Play'}</>
                )}
              </Button>
              
              <Button variant="outline" size="icon" onClick={handleNextStep} disabled={currentStepIndex >= WALKTHROUGH_STEPS.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>
    </div>
  );
}
