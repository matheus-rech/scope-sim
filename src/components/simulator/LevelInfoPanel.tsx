import { LevelState, LevelObjective } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface LevelInfoPanelProps {
  levelState: LevelState;
  timeElapsed: number;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Nasal Navigation',
  2: 'Sphenoidotomy',
  3: 'Sellar Exposure',
  4: 'Tumor Resection',
  5: 'Reconstruction',
};

const LEVEL_ICONS: Record<number, string> = {
  1: '🏃',
  2: '🔨',
  3: '🎯',
  4: '🧠',
  5: '🔧',
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
        'flex items-start gap-2 py-1.5',
        objective.isCompleted ? 'opacity-60' : ''
      )}
    >
      <div
        className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs',
          objective.isCompleted
            ? 'bg-success text-success-foreground'
            : 'bg-secondary border border-border'
        )}
      >
        {objective.isCompleted ? '✓' : ''}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
            objective.isCompleted
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          )}
        >
          {objective.description}
        </p>
        {objective.targetValue !== undefined && (
          <div className="mt-1">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    ((objective.currentValue || 0) / objective.targetValue) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
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

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Level Header */}
      <div className="px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{LEVEL_ICONS[levelState.id]}</span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Level {levelState.id}
              </h2>
              <p className="text-xs text-muted-foreground">
                {LEVEL_NAMES[levelState.id]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono text-primary font-bold">
              {formatTime(timeElapsed)}
            </p>
            <p className="text-xs text-muted-foreground">Time</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{completedCount}/{totalCount} objectives</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Objectives */}
      <div className="px-4 py-3 space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Objectives
        </h3>
        {levelState.objectives.map((objective) => (
          <ObjectiveItem key={objective.id} objective={objective} />
        ))}
      </div>
      
      {/* Metrics Summary */}
      <div className="px-4 py-3 border-t border-border bg-secondary/30">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-mono text-foreground">
              {levelState.metrics.mucosalContacts}
            </p>
            <p className="text-xs text-muted-foreground">Contacts</p>
          </div>
          <div>
            <p className="text-lg font-mono text-foreground">
              {levelState.metrics.scopeAngleChanges}
            </p>
            <p className="text-xs text-muted-foreground">Angle Δ</p>
          </div>
          <div>
            <p
              className={cn(
                'text-lg font-mono',
                levelState.metrics.bloodInField
                  ? 'text-destructive'
                  : 'text-success'
              )}
            >
              {levelState.metrics.bloodInField ? '!' : '✓'}
            </p>
            <p className="text-xs text-muted-foreground">Blood</p>
          </div>
        </div>
      </div>
    </div>
  );
}
