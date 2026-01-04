import { VitalsState } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard, StatusIndicator } from '@/components/ui/medical-card';
import { Heart, Activity } from 'lucide-react';

interface VitalsMonitorProps {
  vitals: VitalsState;
}

export default function VitalsMonitor({ vitals }: VitalsMonitorProps) {
  const { heartRate, bloodPressure, isStable } = vitals;
  
  const heartRateStatus = heartRate > 100 ? 'warning' : heartRate > 120 ? 'critical' : 'stable';
  
  return (
    <MedicalCard 
      variant={isStable ? "default" : "warning"} 
      glow={!isStable ? "warning" : "none"}
      size="sm"
      className="relative overflow-hidden"
    >
      {/* Subtle scan line effect */}
      <div className="absolute inset-0 pointer-events-none scan-line opacity-30" />
      
      <div className="flex items-center justify-between mb-3 relative">
        <h3 className="medical-label flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          Vitals
        </h3>
        <StatusIndicator status={isStable ? "stable" : "warning"} />
      </div>
      
      {/* Heart Rate */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={cn(
              "w-4 h-4",
              heartRateStatus === 'stable' ? 'text-vitals-stable' : 'text-vitals-heart',
              !isStable && 'animate-heartbeat'
            )} />
            <span className="text-xs text-muted-foreground font-medium">HR</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'medical-stat',
                heartRate > 100 ? 'text-vitals-heart' : 'text-vitals-stable'
              )}
            >
              {heartRate}
            </span>
            <span className="text-xs text-muted-foreground">bpm</span>
          </div>
        </div>
        
        {/* ECG-like visualization with enhanced styling */}
        <div className="h-8 flex items-center overflow-hidden bg-secondary/50 rounded-lg px-2">
          <svg
            viewBox="0 0 100 20"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--vitals-heart))" stopOpacity="0.3" />
                <stop offset="50%" stopColor="hsl(var(--vitals-heart))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--vitals-heart))" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M0,10 L20,10 L25,10 L30,2 L35,18 L40,10 L45,10 L50,10 L55,10 L60,2 L65,18 L70,10 L75,10 L80,10 L85,10 L90,2 L95,18 L100,10"
              fill="none"
              stroke="url(#ecgGradient)"
              strokeWidth="1.5"
              className={cn(
                'transition-all ecg-line',
                !isStable && 'animate-pulse'
              )}
            />
          </svg>
        </div>
      </div>
      
      {/* Blood Pressure */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground font-medium">BP</span>
        <div className="flex items-baseline gap-1">
          <span className="medical-stat text-vitals-bp">
            {bloodPressure.systolic}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="medical-stat text-vitals-bp">
            {bloodPressure.diastolic}
          </span>
          <span className="text-xs text-muted-foreground ml-1">mmHg</span>
        </div>
      </div>
    </MedicalCard>
  );
}
