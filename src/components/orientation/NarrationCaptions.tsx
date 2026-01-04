import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Volume2 } from 'lucide-react';

interface NarrationCaptionsProps {
  text: string;
  isActive: boolean;
}

export function NarrationCaptions({ text, isActive }: NarrationCaptionsProps) {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (text && isActive) {
      setIsAnimating(true);
      setDisplayText(text);
      
      // Animation complete after text is shown
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [text, isActive]);

  if (!text || !isActive) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <div className={cn(
        "bg-background/95 backdrop-blur-md border border-border/50 rounded-xl px-6 py-4 shadow-lg",
        "transform transition-all duration-300",
        isAnimating ? "scale-100 opacity-100" : "scale-100 opacity-90"
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-accent animate-pulse" />
            </div>
          </div>
          <div>
            <div className="text-xs text-accent font-medium mb-1">Dr. Chen</div>
            <p className="text-sm text-foreground leading-relaxed">
              {displayText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
