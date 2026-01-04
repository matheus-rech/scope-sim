import { ToolType, ToolState } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface ToolSelectorProps {
  toolState: ToolState;
  onToolChange: (tool: ToolType) => void;
  disabled?: boolean;
}

const TOOLS: { id: ToolType; icon: string; label: string; color: string }[] = [
  { id: 'scope', icon: '🔭', label: 'Scope', color: 'bg-primary' },
  { id: 'drill', icon: '🔧', label: 'Drill', color: 'bg-warning' },
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
          Tools
        </h3>
        {toolState.isActive && (
          <span className="text-xs text-primary animate-pulse">Active</span>
        )}
      </div>
      
      <div className="grid grid-cols-5 gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-md transition-all',
              toolState.activeTool === tool.id
                ? `${tool.color} text-white ring-2 ring-primary/50`
                : 'bg-secondary hover:bg-secondary/80 text-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="text-lg">{tool.icon}</span>
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
      
      {/* Pinch to activate hint */}
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
    </div>
  );
}
