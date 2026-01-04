import { useEffect, useRef, useState } from 'react';
import { ToolType } from '@/types/simulator';
import { useToolIcons } from '@/contexts/ToolIconsContext';
import { TOOL_ICON_PROMPTS } from '@/lib/assets/toolIconPrompts';
import { cn } from '@/lib/utils';

interface HandToolOverlayProps {
  tool: ToolType;
  isActive: boolean;
  pinchStrength: number;
  // Position from hand tracking (0-1 normalized coordinates)
  handPosition?: { x: number; y: number } | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function HandToolOverlay({
  tool,
  isActive,
  pinchStrength,
  handPosition,
  containerRef,
}: HandToolOverlayProps) {
  const { getIcon } = useToolIcons();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  
  const iconData = getIcon(tool);
  const fallbackEmoji = TOOL_ICON_PROMPTS[tool]?.fallbackEmoji || '🔧';

  // Update position based on hand tracking
  useEffect(() => {
    if (handPosition && containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Mirror the x position (webcam is mirrored)
      const mirroredX = 1 - handPosition.x;
      
      // Convert normalized position to percentage
      setPosition({
        x: mirroredX * 100,
        y: handPosition.y * 100,
      });
    }
  }, [handPosition, containerRef]);

  // Don't render if no tool is active or not tracking
  if (!isActive || !handPosition) {
    return null;
  }

  const opacity = 0.5 + pinchStrength * 0.5; // 0.5 to 1.0 based on pinch
  const scale = 0.8 + pinchStrength * 0.4; // 0.8 to 1.2 based on pinch

  return (
    <div
      ref={overlayRef}
      className={cn(
        'absolute pointer-events-none z-20 transition-transform duration-75',
        'flex items-center justify-center',
        pinchStrength > 0.7 && 'animate-pulse'
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
      }}
    >
      {/* Glow effect background */}
      <div 
        className={cn(
          'absolute inset-0 rounded-full blur-md transition-opacity',
          isActive ? 'opacity-60' : 'opacity-0'
        )}
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.6), transparent 70%)',
          transform: 'scale(2)',
        }}
      />
      
      {/* Tool icon */}
      <div className={cn(
        'relative w-12 h-12 flex items-center justify-center',
        'bg-card/80 backdrop-blur-sm rounded-lg border border-primary/50',
        'shadow-[0_0_15px_hsl(var(--primary)/0.4)]'
      )}>
        {iconData.imageUrl ? (
          <img
            src={iconData.imageUrl}
            alt={`${tool} tool`}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <span className="text-2xl">{fallbackEmoji}</span>
        )}
      </div>
      
      {/* Activation indicator ring */}
      {pinchStrength > 0.5 && (
        <div 
          className="absolute inset-0 rounded-lg border-2 border-primary animate-ping"
          style={{ animationDuration: '1s' }}
        />
      )}
      
      {/* Tool label */}
      <div className={cn(
        'absolute -bottom-6 left-1/2 -translate-x-1/2',
        'px-2 py-0.5 rounded bg-card/90 border border-border',
        'text-[10px] font-medium text-foreground whitespace-nowrap',
        'opacity-0 transition-opacity',
        pinchStrength > 0.3 && 'opacity-100'
      )}>
        {tool.charAt(0).toUpperCase() + tool.slice(1)}
      </div>
    </div>
  );
}
