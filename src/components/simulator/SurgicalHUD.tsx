import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Heart, 
  Activity, 
  Timer, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Crosshair,
  Gauge,
  Waves,
  Shield
} from 'lucide-react';
import { LevelState, VitalsState, DopplerState, ToolType } from '@/types/simulator';

interface SurgicalHUDProps {
  levelState: LevelState;
  vitals: VitalsState;
  dopplerState: DopplerState;
  bloodLevel: number;
  timeElapsed: number;
  activeTool: ToolType;
  isToolActive: boolean;
  insertionDepth: number;
  currentLevel: number;
}

function MetricRing({ 
  value, 
  max, 
  color, 
  size = 48,
  strokeWidth = 3,
  children 
}: { 
  value: number; 
  max: number; 
  color: string; 
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function VitalSign({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  status = 'normal',
  pulse = false 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  pulse?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm",
      status === 'normal' && "bg-success/10 border border-success/20",
      status === 'warning' && "bg-warning/10 border border-warning/20",
      status === 'critical' && "bg-destructive/10 border border-destructive/20 animate-pulse"
    )}>
      <Icon className={cn(
        "w-4 h-4",
        status === 'normal' && "text-success",
        status === 'warning' && "text-warning",
        status === 'critical' && "text-destructive",
        pulse && "animate-pulse"
      )} />
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={cn(
          "text-sm font-mono font-bold",
          status === 'normal' && "text-success",
          status === 'warning' && "text-warning",
          status === 'critical' && "text-destructive"
        )}>
          {value}{unit && <span className="text-xs ml-0.5 font-normal">{unit}</span>}
        </span>
      </div>
    </div>
  );
}

function ObjectiveItem({ 
  label, 
  completed, 
  current, 
  target,
  critical = false
}: { 
  label: string; 
  completed: boolean;
  current?: number;
  target?: number;
  critical?: boolean;
}) {
  const progress = target && current !== undefined ? Math.min(current / target, 1) : (completed ? 1 : 0);
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1 rounded text-xs",
      completed ? "bg-success/10" : critical ? "bg-warning/10" : "bg-muted/10"
    )}>
      {completed ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/50" />
      )}
      <span className={cn(
        "flex-1 truncate",
        completed ? "text-success line-through" : "text-foreground"
      )}>
        {label}
      </span>
      {target !== undefined && current !== undefined && !completed && (
        <span className="text-muted-foreground font-mono">
          {Math.round(current)}/{target}
        </span>
      )}
    </div>
  );
}

export default function SurgicalHUD({
  levelState,
  vitals,
  dopplerState,
  bloodLevel,
  timeElapsed,
  activeTool,
  isToolActive,
  insertionDepth,
  currentLevel
}: SurgicalHUDProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const icaProximityStatus = useMemo(() => {
    const dist = dopplerState.nearestICADistance ?? 999;
    if (dist < 0.3) return 'critical';
    if (dist < 0.5) return 'warning';
    return 'normal';
  }, [dopplerState.nearestICADistance]);

  const bloodStatus = useMemo(() => {
    if (bloodLevel > 60) return 'critical';
    if (bloodLevel > 30) return 'warning';
    return 'normal';
  }, [bloodLevel]);

  const completedObjectives = levelState.objectives.filter(o => o.isCompleted).length;
  const totalObjectives = levelState.objectives.length;
  const progressPercent = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

  return (
    <>
      {/* Top Bar - Level & Time */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/20 border border-primary/30">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">Level {currentLevel}</span>
              <span className="text-xs text-primary/70">{levelState.name}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{completedObjectives}/{totalObjectives} Objectives</span>
            <div className="w-32 h-2 bg-muted/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Vitals & Metrics */}
      <div className="absolute left-2 top-16 flex flex-col gap-2 pointer-events-none">
        <VitalSign 
          icon={Heart} 
          label="HR" 
          value={vitals.heartRate} 
          unit="bpm"
          status={vitals.heartRate > 100 ? 'warning' : vitals.heartRate > 120 ? 'critical' : 'normal'}
          pulse
        />
        <VitalSign 
          icon={Activity} 
          label="BP" 
          value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
          status={vitals.bloodPressure.systolic > 160 ? 'critical' : vitals.bloodPressure.systolic > 140 ? 'warning' : 'normal'}
        />
        
        {/* ICA Proximity */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm",
          icaProximityStatus === 'normal' && "bg-success/10 border border-success/20",
          icaProximityStatus === 'warning' && "bg-warning/10 border border-warning/20",
          icaProximityStatus === 'critical' && "bg-destructive/10 border border-destructive/20 animate-pulse"
        )}>
          <Waves className={cn(
            "w-4 h-4",
            icaProximityStatus === 'normal' && "text-success",
            icaProximityStatus === 'warning' && "text-warning",
            icaProximityStatus === 'critical' && "text-destructive"
          )} />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ICA Distance</span>
            <span className={cn(
              "text-sm font-mono font-bold",
              icaProximityStatus === 'normal' && "text-success",
              icaProximityStatus === 'warning' && "text-warning",
              icaProximityStatus === 'critical' && "text-destructive"
            )}>
              {dopplerState.nearestICADistance != null ? dopplerState.nearestICADistance.toFixed(2) : '--'}
              <span className="text-xs ml-0.5 font-normal">cm</span>
            </span>
          </div>
        </div>

        {/* Blood Level */}
        {bloodLevel > 0 && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm",
            bloodStatus === 'normal' && "bg-muted/20 border border-muted/30",
            bloodStatus === 'warning' && "bg-warning/10 border border-warning/20",
            bloodStatus === 'critical' && "bg-destructive/10 border border-destructive/20 animate-pulse"
          )}>
            <div className={cn(
              "w-4 h-4 rounded-full",
              bloodStatus === 'critical' && "bg-red-500 animate-pulse",
              bloodStatus === 'warning' && "bg-orange-500",
              bloodStatus === 'normal' && "bg-red-400"
            )} />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Blood</span>
              <span className={cn(
                "text-sm font-mono font-bold",
                bloodStatus === 'critical' && "text-destructive",
                bloodStatus === 'warning' && "text-warning",
                bloodStatus === 'normal' && "text-foreground"
              )}>
                {Math.round(bloodLevel)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Objectives */}
      <div className="absolute right-2 top-16 w-48 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-muted/20 p-2">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-muted/20">
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Objectives</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {levelState.objectives.map((obj) => (
              <ObjectiveItem
                key={obj.id}
                label={obj.description}
                completed={obj.isCompleted}
                current={obj.currentValue}
                target={obj.targetValue}
                critical={obj.id.includes('avoid')}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Center - Active Tool & Depth */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none">
        {/* Tool Indicator */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm",
          isToolActive ? "bg-primary/30 border-2 border-primary" : "bg-muted/30 border border-muted/50"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isToolActive ? "bg-primary animate-pulse" : "bg-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-semibold uppercase tracking-wider",
            isToolActive ? "text-primary" : "text-muted-foreground"
          )}>
            {activeTool}
          </span>
        </div>

        {/* Depth Gauge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 backdrop-blur-sm border border-muted/50">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono text-foreground">
            {Math.round(insertionDepth)}
            <span className="text-xs text-muted-foreground ml-0.5">mm</span>
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 backdrop-blur-sm border border-success/30">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-sm font-bold text-success">
            {levelState.score}
            <span className="text-xs text-success/70 ml-0.5">pts</span>
          </span>
        </div>
      </div>

      {/* Warning Overlays */}
      {icaProximityStatus === 'critical' && (
        <div className="absolute inset-0 pointer-events-none border-4 border-destructive/50 animate-pulse rounded-lg">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-destructive/90 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="text-white font-bold">ICA DANGER ZONE</span>
          </div>
        </div>
      )}
    </>
  );
}
