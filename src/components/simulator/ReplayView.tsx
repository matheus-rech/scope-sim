/**
 * REPLAY VIEW COMPONENT
 * 
 * Renders the 3D surgical view in replay mode with:
 * - Replay indicator overlay
 * - Current tool and step indicators
 */

import { Badge } from '@/components/ui/badge';
import EndoscopicView from './EndoscopicView';
import type { InterpolatedFrame } from '@/lib/replay/types';
import type { EndoscopeState, ToolType, SurgicalStep } from '@/types/simulator';

interface ReplayViewProps {
  frame: InterpolatedFrame | null;
}

export function ReplayView({ frame }: ReplayViewProps) {
  if (!frame) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black/90">
        <div className="text-center">
          <div className="text-muted-foreground">No frame to display</div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            Select a recording to begin playback
          </div>
        </div>
      </div>
    );
  }
  
  // Convert interpolated frame to EndoscopeState for EndoscopicView
  const endoscopeState: EndoscopeState = {
    tipPosition: frame.scopePosition,
    handlePosition: { 
      x: frame.scopePosition.x, 
      y: frame.scopePosition.y, 
      z: frame.scopePosition.z - 5 
    },
    insertionDepth: frame.insertionDepth,
    currentAngle: frame.scopeAngle as 0 | 30 | 45 | 70,
    rotation: frame.scopeRotation,
    isColliding: false,
    collidingStructure: null,
  };
  
  return (
    <div className="relative w-full h-full">
      <EndoscopicView
        endoscopeState={endoscopeState}
        showBloodOverlay={frame.bloodLevel > 20}
        bloodLevel={frame.bloodLevel}
        activeTool={(frame.activeTool as ToolType) || 'scope'}
        isToolActive={frame.isToolActive ?? false}
      />
      
      {/* Replay indicator overlay */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-mono font-medium">REPLAY</span>
      </div>
      
      {/* Current step indicator */}
      {frame.surgicalStep && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="font-mono text-xs">
            {(frame.surgicalStep as string).replace(/_/g, ' ')}
          </Badge>
        </div>
      )}
      
      {/* Tool indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {frame.activeTool || 'scope'}
          {frame.isToolActive && (
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-success inline-block" />
          )}
        </Badge>
      </div>
      
      {/* Blood level warning */}
      {frame.bloodLevel > 50 && (
        <div className="absolute bottom-4 left-4">
          <Badge variant="destructive" className="font-mono text-xs">
            Blood: {Math.round(frame.bloodLevel)}%
          </Badge>
        </div>
      )}
    </div>
  );
}
