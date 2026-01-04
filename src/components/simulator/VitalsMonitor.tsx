import { VitalsState } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface VitalsMonitorProps {
  vitals: VitalsState;
}

export default function VitalsMonitor({ vitals }: VitalsMonitorProps) {
  const { heartRate, bloodPressure, isStable } = vitals;
  
  return (
    <div className="bg-card rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Vitals
        </h3>
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isStable ? 'bg-vitals-stable' : 'bg-vitals-heart animate-pulse'
          )}
        />
      </div>
      
      {/* Heart Rate */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">HR</span>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'text-lg font-mono font-bold',
                heartRate > 100 ? 'text-vitals-heart' : 'text-vitals-stable'
              )}
            >
              {heartRate}
            </span>
            <span className="text-xs text-muted-foreground">bpm</span>
          </div>
        </div>
        
        {/* ECG-like visualization */}
        <div className="h-6 flex items-center overflow-hidden">
          <svg
            viewBox="0 0 100 20"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,10 L20,10 L25,10 L30,2 L35,18 L40,10 L45,10 L50,10 L55,10 L60,2 L65,18 L70,10 L75,10 L80,10 L85,10 L90,2 L95,18 L100,10"
              fill="none"
              stroke="hsl(var(--vitals-heart))"
              strokeWidth="1"
              className={cn(
                'transition-all',
                isStable ? '' : 'animate-pulse'
              )}
            />
          </svg>
        </div>
      </div>
      
      {/* Blood Pressure */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">BP</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono text-vitals-bp font-medium">
            {bloodPressure.systolic}/{bloodPressure.diastolic}
          </span>
          <span className="text-xs text-muted-foreground">mmHg</span>
        </div>
      </div>
    </div>
  );
}
