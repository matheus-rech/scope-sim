import { AttendingMessage } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

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
        return 'bg-success/10 border-success/30 text-success';
      case 'warning':
        return 'bg-warning/10 border-warning/30 text-warning';
      case 'critical':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      default:
        return 'bg-secondary border-border text-foreground';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm">👨‍⚕️</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">
              Dr. Chen
            </h3>
            <p className="text-xs text-muted-foreground">
              Attending Surgeon
            </p>
          </div>
          {isAILoading && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground italic">
              "Ready when you are, resident. Let's begin."
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'px-3 py-2 rounded-lg border text-sm animate-in fade-in slide-in-from-bottom-2 duration-300',
                getMessageStyles(message.type)
              )}
            >
              <p>{message.text}</p>
              <span className="text-xs opacity-60 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))
        )}
      </div>
      
      {/* Level indicator */}
      <div className="px-3 py-2 border-t border-border bg-secondary/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current Level</span>
          <span className="font-mono text-primary font-medium">
            {currentLevel}/5
          </span>
        </div>
      </div>
    </div>
  );
}
