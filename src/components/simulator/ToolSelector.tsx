import { ToolType, ToolState } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard } from '@/components/ui/medical-card';
import { 
  Eye, 
  Radio, 
  Wrench, 
  Scissors, 
  Circle, 
  Wind, 
  Zap, 
  Droplets,
  Hand
} from 'lucide-react';

interface ToolSelectorProps {
  toolState: ToolState;
  onToolChange: (tool: ToolType) => void;
  disabled?: boolean;
}

const TOOLS: { 
  id: ToolType; 
  icon: React.ReactNode; 
  label: string; 
  bgColor: string; 
  activeColor: string;
  critical?: boolean; 
  technique?: string;
}[] = [
  { 
    id: 'scope', 
    icon: <Eye className="w-4 h-4" />, 
    label: 'Scope', 
    bgColor: 'bg-primary/20',
    activeColor: 'bg-primary',
  },
  { 
    id: 'doppler', 
    icon: <Radio className="w-4 h-4" />, 
    label: 'Doppler', 
    bgColor: 'bg-warning/20',
    activeColor: 'bg-warning',
    critical: true,
  },
  { 
    id: 'drill', 
    icon: <Wrench className="w-4 h-4" />, 
    label: 'Drill', 
    bgColor: 'bg-accent/20',
    activeColor: 'bg-accent',
  },
  { 
    id: 'dissector', 
    icon: <Scissors className="w-4 h-4" />, 
    label: 'Dissector', 
    bgColor: 'bg-success/20',
    activeColor: 'bg-success',
    technique: 'Peel',
  },
  { 
    id: 'curette', 
    icon: <Circle className="w-4 h-4" />, 
    label: 'Curette', 
    bgColor: 'bg-destructive/20',
    activeColor: 'bg-destructive',
    technique: 'Resect',
  },
  { 
    id: 'suction', 
    icon: <Wind className="w-4 h-4" />, 
    label: 'Suction', 
    bgColor: 'bg-accent/20',
    activeColor: 'bg-accent',
  },
  { 
    id: 'cautery', 
    icon: <Zap className="w-4 h-4" />, 
    label: 'Cautery', 
    bgColor: 'bg-destructive/20',
    activeColor: 'bg-destructive',
  },
  { 
    id: 'irrigation', 
    icon: <Droplets className="w-4 h-4" />, 
    label: 'Irrigation', 
    bgColor: 'bg-vitals-bp/20',
    activeColor: 'bg-vitals-bp',
  },
];

export default function ToolSelector({
  toolState,
  onToolChange,
  disabled = false,
}: ToolSelectorProps) {
  return (
    <MedicalCard variant="glass" size="sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="medical-label">
          Instruments
        </h3>
        {toolState.isActive && (
          <span className="text-xs text-primary font-medium flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Active
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        {TOOLS.map((tool) => {
          const isActive = toolState.activeTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all relative group',
                'border border-transparent',
                isActive
                  ? `${tool.activeColor} text-white shadow-glow-sm border-white/20`
                  : `${tool.bgColor} hover:bg-secondary text-foreground hover:border-border`,
                disabled && 'opacity-50 cursor-not-allowed',
                tool.critical && !isActive && 'ring-1 ring-warning/40'
              )}
            >
              {/* Critical indicator */}
              {tool.critical && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-warning rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--warning)/0.6)]" />
              )}
              
              {/* Technique badge */}
              {tool.technique && (
                <span className={cn(
                  'absolute -top-1 -left-1 text-[8px] px-1.5 py-0.5 rounded font-medium',
                  tool.id === 'curette' ? 'bg-destructive text-white' : 'bg-success text-white'
                )}>
                  {tool.technique}
                </span>
              )}
              
              {/* Icon with glow on active */}
              <div className={cn(
                'transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                {tool.icon}
              </div>
              
              <span className="text-[10px] font-medium">{tool.label}</span>
              
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
