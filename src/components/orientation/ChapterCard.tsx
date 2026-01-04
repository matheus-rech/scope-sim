import { DemoChapter, ChapterProgress } from '@/lib/orientation/types';
import { MedicalCard, MedicalCardIcon } from '@/components/ui/medical-card';
import { Button } from '@/components/ui/button';
import { Play, Check, Clock, Brain, ScanSearch, Telescope, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ReactNode> = {
  Brain: <Brain className="w-5 h-5" />,
  ScanSearch: <ScanSearch className="w-5 h-5" />,
  Telescope: <Telescope className="w-5 h-5" />,
  Search: <Search className="w-5 h-5" />,
};

interface ChapterCardProps {
  chapter: DemoChapter;
  progress?: ChapterProgress;
  index: number;
  onSelect: (chapterId: string) => void;
}

export function ChapterCard({ chapter, progress, index, onSelect }: ChapterCardProps) {
  const isCompleted = progress?.completed ?? false;
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <MedicalCard 
      variant={isCompleted ? 'default' : 'elevated'} 
      className={cn(
        "group hover:shadow-glow-sm transition-all cursor-pointer",
        isCompleted && "border-success/30 bg-success/5"
      )}
      onClick={() => onSelect(chapter.id)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
            isCompleted 
              ? "bg-success/20 text-success" 
              : "bg-primary/20 text-primary"
          )}>
            {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MedicalCardIcon className="bg-muted w-8 h-8">
              {ICON_MAP[chapter.iconName] || <Brain className="w-4 h-4" />}
            </MedicalCardIcon>
            <h3 className="font-semibold text-foreground">{chapter.title}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {chapter.description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(chapter.duration)}
            </span>
            
            <Button
              size="sm"
              variant={isCompleted ? "outline" : "default"}
              className="group-hover:scale-105 transition-transform"
            >
              <Play className="w-3 h-3 mr-1" />
              {isCompleted ? 'Replay' : 'Start'}
            </Button>
          </div>
        </div>
      </div>
    </MedicalCard>
  );
}
