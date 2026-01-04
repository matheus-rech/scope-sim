import { ToolType, ToolState } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface ToolSelectorProps {
  toolState: ToolState;
  onToolChange: (tool: ToolType) => void;
  disabled?: boolean;
}

const TOOLS: { id: ToolType; icon: string; label: string; color: string; critical?: boolean; technique?: string }[] = [
  { id: 'scope', icon: '🔭', label: 'Scope', color: 'bg-primary' },
  { id: 'doppler', icon: '📡', label: 'Doppler', color: 'bg-warning', critical: true },
  { id: 'drill', icon: '🔧', label: 'Drill', color: 'bg-accent' },
  { id: 'dissector', icon: '🔬', label: 'Dissector', color: 'bg-teal-600', technique: 'Peel' },
  { id: 'curette', icon: '🥄', label: 'Curette', color: 'bg-red-600', technique: 'Resect' },
  { id: 'suction', icon: '💨', label: 'Suction', color: 'bg-accent' },
  { id: 'cautery', icon: '⚡', label: 'Cautery', color: 'bg-destructive' },
  { id: 'irrigation', icon: '💧', label: 'Irrigation', color: 'bg-vitals-bp' },
];

export default function ToolSelector({
  toolState,
  onToolChange,
  disabled = false,
}: ToolSelectorProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Instruments
        </h3>
        {toolState.isActive && (
          <span className="text-xs text-primary animate-pulse">Active</span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-md transition-all relative',
              toolState.activeTool === tool.id
                ? `${tool.color} text-white ring-2 ring-primary/50`
                : 'bg-secondary hover:bg-secondary/80 text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
              tool.critical && toolState.activeTool !== tool.id && 'ring-1 ring-warning/50'
            )}
          >
            {tool.critical && toolState.activeTool !== tool.id && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full animate-pulse" />
            )}
            {tool.technique && (
              <span className={`absolute -top-1 -left-1 text-[8px] px-1 rounded ${tool.id === 'curette' ? 'bg-red-500' : 'bg-teal-500'} text-white`}>
                {tool.technique}
              </span>
            )}
            <span className="text-lg">{tool.icon}</span>
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tool activation hint */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Pinch to activate tool
        </p>
        {toolState.secondaryHandDetected && (
          <p className="text-xs text-success text-center mt-1">
            ✓ Secondary hand detected
          </p>
        )}
      </div>

      {/* Doppler reminder for sellar procedures */}
      {toolState.activeTool !== 'doppler' && (
        <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/30">
          <p className="text-[10px] text-warning text-center">
            💡 Use Doppler before dural incision
          </p>
        </div>
      )}
    </div>
  );
}

