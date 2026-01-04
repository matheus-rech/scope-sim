import { cn } from '@/lib/utils';
import { UserCheck, Volume2 } from 'lucide-react';

interface AttendingModeOverlayProps {
  isVisible: boolean;
  currentStep?: string;
  isSpeaking?: boolean;
}

export function AttendingModeOverlay({ isVisible, currentStep, isSpeaking }: AttendingModeOverlayProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Top-left attending badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center gap-2 bg-accent/90 text-accent-foreground px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
          <UserCheck className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide">ATTENDING DEMO</span>
          {isSpeaking && (
            <Volume2 className="w-4 h-4 animate-pulse" />
          )}
        </div>
      </div>

      {/* Current step indicator */}
      {currentStep && (
        <div className="absolute top-4 right-4 z-20 max-w-sm">
          <div className="bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-lg">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Current Demonstration
            </div>
            <div className="text-sm font-medium text-foreground">
              {currentStep}
            </div>
          </div>
        </div>
      )}

      {/* Subtle border glow indicating demo mode */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 border-2 border-accent/20 rounded-lg" />
        <div className="absolute inset-0 border border-accent/10 rounded-lg animate-pulse" 
             style={{ animationDuration: '3s' }} />
      </div>
    </>
  );
}
