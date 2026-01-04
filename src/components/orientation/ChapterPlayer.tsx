import { useState, useEffect, useCallback, useRef } from 'react';
import { DemoChapter } from '@/lib/orientation/types';
import { getChapterById, getNextChapter, DEMO_CHAPTERS } from '@/lib/orientation/DemoChapters';
import { demoPlaybackEngine, DemoPlaybackEngine } from '@/lib/orientation/DemoPlaybackEngine';
import { useOrientationNarration } from '@/hooks/useOrientationNarration';
import { AttendingModeOverlay } from './AttendingModeOverlay';
import { NarrationCaptions } from './NarrationCaptions';
import { MedicalCard } from '@/components/ui/medical-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  X,
  ChevronRight,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'neuroendosim-orientation-progress';

interface ChapterPlayerProps {
  chapterId: string;
  onComplete: () => void;
  onExit: () => void;
}

export function ChapterPlayer({ chapterId, onComplete, onExit }: ChapterPlayerProps) {
  const [chapter, setChapter] = useState<DemoChapter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentNarration, setCurrentNarration] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const narration = useOrientationNarration();
  const engineRef = useRef(new DemoPlaybackEngine());

  // Load chapter
  useEffect(() => {
    const ch = getChapterById(chapterId);
    if (ch) {
      setChapter(ch);
      setDuration(ch.duration);
      engineRef.current.loadChapter(ch);
    }
  }, [chapterId]);

  // Setup playback callbacks
  useEffect(() => {
    const engine = engineRef.current;
    
    engine.setCallbacks(
      // State change
      (state) => {
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentTime);
        
        if (state.currentTime >= state.duration && state.duration > 0) {
          handleChapterComplete();
        }
      },
      // Action callback
      (action) => {
        console.log('[ChapterPlayer] Demo action:', action.type, action.data);
        
        // Update current step display based on action type
        switch (action.type) {
          case 'ai_request':
            setCurrentStep('Consulting AI for surgical planning...');
            break;
          case 'image_generate':
            setCurrentStep('Generating diagnostic visualization...');
            break;
          case 'camera_move':
            setCurrentStep('Demonstrating scope navigation...');
            break;
          case 'tool_switch':
            setCurrentStep(`Switching to ${action.data?.tool || 'instrument'}...`);
            break;
          case 'doppler_activate':
            setCurrentStep('Activating Doppler ultrasound...');
            break;
          case 'search_demo':
            setCurrentStep('Searching clinical literature...');
            break;
          default:
            break;
        }
      },
      // Narration callback
      (text, index) => {
        setCurrentNarration(text);
        if (!isMuted) {
          narration.queueNarration(text);
        }
      }
    );

    return () => {
      engine.stop();
      narration.stop();
    };
  }, [isMuted]);

  const handlePlay = useCallback(() => {
    engineRef.current.play();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current.pause();
    narration.stop();
  }, [narration]);

  const handleRestart = useCallback(() => {
    engineRef.current.reset();
    narration.stop();
    setCurrentNarration('');
    setCurrentStep('');
    engineRef.current.play();
  }, [narration]);

  const handleSkip = useCallback(() => {
    engineRef.current.stop();
    narration.stop();
    handleChapterComplete();
  }, [narration]);

  const handleChapterComplete = useCallback(() => {
    // Save progress
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const progress = saved ? JSON.parse(saved) : { chapters: [] };
      
      const existingIndex = progress.chapters.findIndex((c: any) => c.chapterId === chapterId);
      const chapterProgress = {
        chapterId,
        completed: true,
        completedAt: Date.now(),
      };
      
      if (existingIndex >= 0) {
        progress.chapters[existingIndex] = chapterProgress;
      } else {
        progress.chapters.push(chapterProgress);
      }
      
      progress.lastChapterId = chapterId;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }

    onComplete();
  }, [chapterId, onComplete]);

  const handleNextChapter = useCallback(() => {
    const next = getNextChapter(chapterId);
    if (next) {
      engineRef.current.stop();
      narration.stop();
      setCurrentNarration('');
      setCurrentStep('');
      
      // Load next chapter
      setChapter(next);
      setDuration(next.duration);
      setCurrentTime(0);
      engineRef.current.loadChapter(next);
      
      // Auto-play
      setTimeout(() => {
        engineRef.current.play();
      }, 500);
    } else {
      onComplete();
    }
  }, [chapterId, narration, onComplete]);

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

  if (!chapter) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Demo viewport */}
      <div className="flex-1 relative bg-gradient-to-b from-background to-muted/20">
        {/* Placeholder demo view - would connect to EndoscopicView in real implementation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/40 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{chapter.title}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{chapter.description}</p>
          </div>
        </div>

        {/* Attending mode overlay */}
        <AttendingModeOverlay
          isVisible={isPlaying}
          currentStep={currentStep}
          isSpeaking={narration.isSpeaking}
        />

        {/* Narration captions */}
        <NarrationCaptions
          text={currentNarration}
          isActive={isPlaying || currentNarration.length > 0}
        />
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span className="font-medium text-foreground">{chapter.title}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onExit}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRestart}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button
                size="lg"
                onClick={isPlaying ? handlePause : handlePlay}
                className="px-8"
              >
                {isPlaying ? (
                  <><Pause className="w-5 h-5 mr-2" /> Pause</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> {currentTime > 0 ? 'Resume' : 'Play'}</>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleSkip}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {getNextChapter(chapterId) && (
                <Button
                  variant="ghost"
                  onClick={handleNextChapter}
                  className="gap-1"
                >
                  Next Chapter
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Chapter navigation dots */}
          <div className="flex justify-center gap-2">
            {DEMO_CHAPTERS.map((ch, i) => (
              <div
                key={ch.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  ch.id === chapterId 
                    ? "bg-primary" 
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
