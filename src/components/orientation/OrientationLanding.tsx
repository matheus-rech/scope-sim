import { useState, useEffect } from 'react';
import { DEMO_CHAPTERS } from '@/lib/orientation/DemoChapters';
import { OrientationProgress } from '@/lib/orientation/types';
import { ChapterCard } from './ChapterCard';
import { MedicalCard, MedicalCardIcon } from '@/components/ui/medical-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ArrowRight, SkipForward, PlayCircle, Video } from 'lucide-react';

const STORAGE_KEY = 'neuroendosim-orientation-progress';

interface OrientationLandingProps {
  onSelectChapter: (chapterId: string) => void;
  onSkip: () => void;
  onStartWalkthrough: () => void;
}

export function OrientationLanding({ onSelectChapter, onSkip, onStartWalkthrough }: OrientationLandingProps) {
  const [progress, setProgress] = useState<OrientationProgress>({ chapters: [] });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load orientation progress:', e);
      }
    }
  }, []);

  const completedCount = progress.chapters.filter(c => c.completed).length;
  const progressPercent = (completedCount / DEMO_CHAPTERS.length) * 100;
  
  const getChapterProgress = (chapterId: string) => {
    return progress.chapters.find(c => c.chapterId === chapterId);
  };

  const handlePlayAll = () => {
    // Start from first incomplete chapter, or first chapter if all complete
    const firstIncomplete = DEMO_CHAPTERS.find(
      ch => !getChapterProgress(ch.id)?.completed
    );
    onSelectChapter(firstIncomplete?.id || DEMO_CHAPTERS[0].id);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-3xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <GraduationCap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Resident Training</span>
          </div>
          
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            <span className="text-gradient-primary">Resident Orientation</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Watch the attending demonstrate advanced techniques with AI-powered guidance
          </p>
        </div>

        {/* Progress Card */}
        <MedicalCard variant="glass" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Your Progress
            </span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {DEMO_CHAPTERS.length} chapters
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </MedicalCard>

        {/* Featured: Full Procedure Walkthrough */}
        <MedicalCard 
          variant="elevated" 
          gradient 
          className="p-5 cursor-pointer hover:shadow-glow-sm transition-all group"
          onClick={onStartWalkthrough}
        >
          <div className="flex items-start gap-4">
            <MedicalCardIcon className="bg-success/20 group-hover:bg-success/30 transition-colors w-12 h-12">
              <Video className="w-6 h-6 text-success" />
            </MedicalCardIcon>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground">Full Procedure Walkthrough</h3>
                <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Watch the attending surgeon perform a complete pituitary adenoma resection with step-by-step AI narration explaining each technique, tool, and critical decision.
              </p>
              <Button size="sm" className="group-hover:scale-105 transition-transform">
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Guided Walkthrough
              </Button>
            </div>
          </div>
        </MedicalCard>

        {/* Chapter List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Individual Training Modules
          </h3>
          {DEMO_CHAPTERS.map((chapter, index) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              progress={getChapterProgress(chapter.id)}
              index={index}
              onSelect={onSelectChapter}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={handlePlayAll}
            className="px-8 py-6 text-lg glow-primary font-semibold group"
          >
            <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
            {completedCount > 0 ? 'Continue Training' : 'Begin Orientation'}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={onSkip}
            className="px-8 py-6 text-lg group"
          >
            <SkipForward className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Skip to Simulator
          </Button>
        </div>
      </div>
    </div>
  );
}
