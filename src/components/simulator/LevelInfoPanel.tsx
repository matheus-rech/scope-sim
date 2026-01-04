import { LevelState, LevelObjective } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard, StatusIndicator } from '@/components/ui/medical-card';
import { 
  Navigation, 
  Hammer, 
  Target, 
  Brain, 
  Wrench,
  CheckCircle2,
  Clock,
  BarChart3,
  Droplets,
  Activity
} from 'lucide-react';

interface LevelInfoPanelProps {
  levelState: LevelState;
  timeElapsed: number;
}

const LEVEL_CONFIG: Record<number, { name: string; icon: React.ReactNode; color: string }> = {
  1: { name: 'Nasal Navigation', icon: <Navigation className="w-5 h-5" />, color: 'text-primary' },
  2: { name: 'Sphenoidotomy', icon: <Hammer className="w-5 h-5" />, color: 'text-warning' },
  3: { name: 'Sellar Exposure', icon: <Target className="w-5 h-5" />, color: 'text-accent' },
  4: { name: 'Tumor Resection', icon: <Brain className="w-5 h-5" />, color: 'text-success' },
  5: { name: 'Reconstruction', icon: <Wrench className="w-5 h-5" />, color: 'text-vitals-bp' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ObjectiveItem({ objective }: { objective: LevelObjective }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 py-2 px-2.5 rounded-lg transition-all',
        objective.isCompleted ? 'bg-success/5 opacity-70' : 'bg-secondary/30 hover:bg-secondary/50'
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
          objective.isCompleted
            ? 'bg-success text-success-foreground shadow-[0_0_8px_hsl(var(--success)/0.4)]'
            : 'bg-muted border border-border'
        )}
      >
        {objective.isCompleted && <CheckCircle2 className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-relaxed',
            objective.isCompleted
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          )}
        >
          {objective.description}
        </p>
        {objective.targetValue !== undefined && !objective.isCompleted && (
          <div className="mt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((objective.currentValue || 0) / objective.targetValue) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {objective.currentValue || 0} / {objective.targetValue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LevelInfoPanel({ levelState, timeElapsed }: LevelInfoPanelProps) {
  const completedCount = levelState.objectives.filter(o => o.isCompleted).length;
  const totalCount = levelState.objectives.length;
  const progressPercent = (completedCount / totalCount) * 100;
  const scenario = levelState.scenario;
  const levelConfig = LEVEL_CONFIG[levelState.id];

  return (
    <MedicalCard variant="glass" className="overflow-hidden">
      {/* Scenario Badge (if active) */}
      {scenario && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2.5 py-1 rounded-md text-xs font-bold tracking-wide',
              scenario.type === 'functioning' 
                ? 'bg-warning/20 text-warning border border-warning/30' 
                : 'bg-vitals-bp/20 text-vitals-bp border border-vitals-bp/30'
            )}>
              {scenario.type === 'functioning' ? 'FA' : 'NFA'}
              {scenario.subtype && ` • ${scenario.subtype}`}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Knosp {scenario.knospGrade}
            </span>
          </div>
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded',
            scenario.goal === 'biochemical_cure' 
              ? 'text-warning bg-warning/10' 
              : 'text-vitals-bp bg-vitals-bp/10'
          )}>
            {scenario.goal === 'biochemical_cure' ? 'Cure' : 'Decompress'}
          </span>
        </div>
      )}

      {/* Level Header */}
      <div className="px-4 py-4 bg-gradient-to-b from-secondary/50 to-transparent border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20',
              levelConfig.color
            )}>
              {levelConfig.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Level {levelState.id}
              </h2>
              <p className="text-xs text-muted-foreground">
                {levelConfig.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-primary">
              <Clock className="w-4 h-4" />
              <p className="text-xl font-mono font-bold">
                {formatTime(timeElapsed)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-mono text-primary font-semibold">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Objectives */}
      <div className="px-4 py-3 space-y-1.5">
        <h3 className="medical-label flex items-center gap-2 mb-2">
          <Target className="w-3.5 h-3.5 text-primary" />
          Objectives
        </h3>
        {levelState.objectives.map((objective) => (
          <ObjectiveItem key={objective.id} objective={objective} />
        ))}
      </div>
      
      {/* Metrics Summary */}
      <div className="px-4 py-3 border-t border-border/50 bg-secondary/20">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="medical-stat text-foreground">
              {levelState.metrics.mucosalContacts}
            </p>
            <p className="text-[10px] text-muted-foreground">Contacts</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="medical-stat text-foreground">
              {levelState.metrics.scopeAngleChanges}
            </p>
            <p className="text-[10px] text-muted-foreground">Angle Δ</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Droplets className={cn(
                "w-3 h-3",
                levelState.metrics.bloodInField ? 'text-destructive' : 'text-muted-foreground'
              )} />
            </div>
            <p
              className={cn(
                'medical-stat',
                levelState.metrics.bloodInField
                  ? 'text-destructive'
                  : 'text-success'
              )}
            >
              {levelState.metrics.bloodInField ? '!' : '✓'}
            </p>
            <p className="text-[10px] text-muted-foreground">Blood</p>
          </div>
        </div>
      </div>
    </MedicalCard>
  );
}
