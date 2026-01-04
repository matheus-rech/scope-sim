import { useState, useEffect } from 'react';
import { ToolType } from '@/types/simulator';
import { useToolIcons } from '@/contexts/ToolIconsContext';
import { TOOL_ICON_PROMPTS } from '@/lib/assets/toolIconPrompts';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ToolIconImageProps {
  tool: ToolType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
  autoGenerate?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export default function ToolIconImage({
  tool,
  size = 'md',
  className,
  showFallback = true,
  autoGenerate = false,
}: ToolIconImageProps) {
  const { getIcon, generateIcon } = useToolIcons();
  const [hasTriedGenerate, setHasTriedGenerate] = useState(false);
  
  const iconData = getIcon(tool);
  const fallbackEmoji = TOOL_ICON_PROMPTS[tool]?.fallbackEmoji || '🔧';

  // Auto-generate if enabled and not already generated
  useEffect(() => {
    if (autoGenerate && !iconData.imageUrl && !iconData.isLoading && !hasTriedGenerate) {
      setHasTriedGenerate(true);
      generateIcon(tool);
    }
  }, [autoGenerate, iconData.imageUrl, iconData.isLoading, hasTriedGenerate, generateIcon, tool]);

  if (iconData.isLoading) {
    return (
      <div className={cn(SIZE_CLASSES[size], 'flex items-center justify-center', className)}>
        <Loader2 className="w-3/4 h-3/4 animate-spin text-primary/50" />
      </div>
    );
  }

  if (iconData.imageUrl) {
    return (
      <img
        src={iconData.imageUrl}
        alt={`${tool} icon`}
        className={cn(
          SIZE_CLASSES[size],
          'object-contain',
          className
        )}
        onError={(e) => {
          // If image fails to load, hide it
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to emoji
  if (showFallback) {
    return (
      <span className={cn(
        SIZE_CLASSES[size],
        'flex items-center justify-center text-center leading-none',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-lg',
        size === 'xl' && 'text-2xl',
        className
      )}>
        {fallbackEmoji}
      </span>
    );
  }

  return null;
}
