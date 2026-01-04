import { AttendingMessage } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { Loader2, Stethoscope, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MedicalCard, StatusIndicator } from '@/components/ui/medical-card';

interface AttendingCoachProps {
  messages: AttendingMessage[];
  currentLevel: number;
  isAILoading?: boolean;
}

export default function AttendingCoach({ messages, currentLevel, isAILoading }: AttendingCoachProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageStyles = (type: AttendingMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/40 text-foreground';
      case 'warning':
        return 'bg-warning/10 border-warning/40 text-foreground';
      case 'critical':
        return 'bg-destructive/10 border-destructive/40 text-foreground';
      default:
        return 'bg-secondary/50 border-border text-foreground';
    }
  };

  const getMessageIcon = (type: AttendingMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />;
      case 'critical':
        return <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
      default:
        return <Brain className="w-3.5 h-3.5 text-primary flex-shrink-0" />;
    }
  };

  return (
    <MedicalCard variant="glass" className="overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          {/* Avatar with glow effect */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30 shadow-glow-sm">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <StatusIndicator 
              status={isAILoading ? "warning" : "stable"} 
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Dr. Chen
              {isAILoading && (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Attending Neurosurgeon
            </p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 relative"
      >
        {/* Subtle scan line effect */}
        <div className="absolute inset-0 pointer-events-none scan-line opacity-50" />
        
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 border border-primary/20">
              <Brain className="w-6 h-6 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground italic">
              "Ready when you are, resident. Let's begin."
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'px-3 py-2.5 rounded-lg border text-sm animate-slide-up',
                getMessageStyles(message.type)
              )}
            >
              <div className="flex items-start gap-2">
                {getMessageIcon(message.type)}
                <div className="flex-1 min-w-0">
                  <p className="leading-relaxed">{message.text}</p>
                  <span className="text-[10px] text-muted-foreground mt-1.5 block font-mono">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Level indicator with progress visualization */}
      <div className="px-4 py-3 border-t border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground font-medium">Training Progress</span>
          <span className="font-mono text-primary font-semibold">
            Level {currentLevel}/5
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-all duration-300',
                level <= currentLevel ? 'bg-primary shadow-glow-sm' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </MedicalCard>
  );
}
