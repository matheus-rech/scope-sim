import { ToolType, ToolState } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard } from '@/components/ui/medical-card';
import ToolIconImage from './ToolIconImage';
import { TOOL_LABELS } from '@/lib/assets/toolIconPrompts';
import { useToolIcons } from '@/contexts/ToolIconsContext';
import { 
  Hand,
  Radio,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ToolSelectorProps {
  toolState: ToolState;
  onToolChange: (tool: ToolType) => void;
  disabled?: boolean;
}

const TOOL_COLORS: Record<ToolType, { bg: string; active: string; ring: string }> = {
  scope: { bg: 'bg-primary/20', active: 'bg-primary', ring: 'ring-primary/40' },
  doppler: { bg: 'bg-warning/20', active: 'bg-warning', ring: 'ring-warning/40' },
  drill: { bg: 'bg-accent/20', active: 'bg-accent', ring: 'ring-accent/40' },
  dissector: { bg: 'bg-success/20', active: 'bg-success', ring: 'ring-success/40' },
  curette: { bg: 'bg-destructive/20', active: 'bg-destructive', ring: 'ring-destructive/40' },
  suction: { bg: 'bg-accent/20', active: 'bg-accent', ring: 'ring-accent/40' },
  cautery: { bg: 'bg-destructive/20', active: 'bg-destructive', ring: 'ring-destructive/40' },
  irrigation: { bg: 'bg-vitals-bp/20', active: 'bg-vitals-bp', ring: 'ring-vitals-bp/40' },
};

const CRITICAL_TOOLS: ToolType[] = ['doppler'];
const TECHNIQUE_TOOLS: Record<string, { tool: ToolType; label: string }> = {
  dissector: { tool: 'dissector', label: 'Peel' },
  curette: { tool: 'curette', label: 'Resect' },
};

export default function ToolSelector({
  toolState,
  onToolChange,
  disabled = false,
}: ToolSelectorProps) {
  const { isGeneratingAll, generateAllIcons } = useToolIcons();
  const tools: ToolType[] = ['scope', 'doppler', 'drill', 'dissector', 'curette', 'suction', 'cautery', 'irrigation'];

  return (
    <MedicalCard variant="glass" size="sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="medical-label">
          Instruments
        </h3>
        <div className="flex items-center gap-2">
          {toolState.isActive && (
            <span className="text-xs text-primary font-medium flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Active
            </span>
          )}
          <button
            onClick={generateAllIcons}
            disabled={isGeneratingAll}
            className={cn(
              'text-[10px] px-2 py-1 rounded-md transition-all flex items-center gap-1',
              'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30',
              isGeneratingAll && 'opacity-50 cursor-not-allowed'
            )}
            title="Generate AI icons for all tools"
          >
            {isGeneratingAll ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isGeneratingAll ? 'Generating...' : 'AI Icons'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        {tools.map((tool) => {
          const isActive = toolState.activeTool === tool;
          const colors = TOOL_COLORS[tool];
          const isCritical = CRITICAL_TOOLS.includes(tool);
          const technique = TECHNIQUE_TOOLS[tool];
          
          return (
            <button
              key={tool}
              onClick={() => onToolChange(tool)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all relative group',
                'border border-transparent',
                isActive
                  ? `${colors.active} text-white shadow-glow-sm border-white/20`
                  : `${colors.bg} hover:bg-secondary text-foreground hover:border-border`,
                disabled && 'opacity-50 cursor-not-allowed',
                isCritical && !isActive && `ring-1 ${colors.ring}`
              )}
            >
              {/* Critical indicator */}
              {isCritical && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--warning)/0.6)]" />
              )}
              
              {/* Technique badge */}
              {technique && (
                <span className={cn(
                  'absolute -top-1 -left-1 text-[8px] px-1.5 py-0.5 rounded font-medium',
                  tool === 'curette' ? 'bg-destructive text-white' : 'bg-success text-white'
                )}>
                  {technique.label}
                </span>
              )}
              
              {/* AI-generated icon or fallback */}
              <div className={cn(
                'transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                <ToolIconImage 
                  tool={tool} 
                  size="md" 
                  showFallback={true}
                />
              </div>
              
              <span className="text-[10px] font-medium">{TOOL_LABELS[tool]}</span>
              
              {/* Hover glow effect */}
              {!disabled && !isActive && (
                <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Tool activation hint */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Hand className="w-3.5 h-3.5" />
          <span>Pinch to activate tool</span>
        </div>
        {toolState.secondaryHandDetected && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-success mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Secondary hand detected
          </div>
        )}
      </div>

      {/* Doppler reminder */}
      {toolState.activeTool !== 'doppler' && (
        <div className="mt-2 p-2.5 bg-warning/10 rounded-lg border border-warning/30">
          <div className="flex items-center justify-center gap-2 text-[10px] text-warning font-medium">
            <Radio className="w-3 h-3" />
            <span>Use Doppler before dural incision</span>
          </div>
        </div>
      )}
    </MedicalCard>
  );
}
