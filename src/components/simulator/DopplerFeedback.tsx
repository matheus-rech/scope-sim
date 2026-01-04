import { useEffect, useRef, useMemo } from 'react';
import { DopplerState } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard, StatusIndicator } from '@/components/ui/medical-card';
import { Radio, AlertTriangle, Activity, Heart } from 'lucide-react';

interface DopplerFeedbackProps {
  dopplerState: DopplerState;
  isActive: boolean;
}

export default function DopplerFeedback({ dopplerState, isActive }: DopplerFeedbackProps) {
  const pulseRef = useRef<HTMLDivElement>(null);
  
  // Calculate visual intensity based on signal strength
  const signalIntensity = useMemo(() => {
    if (!isActive || !dopplerState.isActive) return 0;
    return dopplerState.signalStrength;
  }, [isActive, dopplerState.isActive, dopplerState.signalStrength]);

  // Pulsating heartbeat animation for signal bars
  useEffect(() => {
    if (!pulseRef.current || signalIntensity < 0.1) return;
    
    // Animate at 70 BPM (857ms per beat)
    const interval = setInterval(() => {
      if (pulseRef.current) {
        pulseRef.current.style.transform = 'scale(1.05)';
        setTimeout(() => {
          if (pulseRef.current) {
            pulseRef.current.style.transform = 'scale(1)';
          }
        }, 150);
      }
    }, 857);
    
    return () => clearInterval(interval);
  }, [signalIntensity]);

  if (!isActive) return null;

  const signalBars = Math.ceil(signalIntensity * 5);
  const distanceWarning = dopplerState.nearestICADistance < 0.5;
  const distanceCritical = dopplerState.nearestICADistance < 0.3;

  // Determine danger level for styling
  const dangerLevel = distanceCritical ? 'critical' : distanceWarning ? 'warning' : signalIntensity > 0.3 ? 'caution' : 'safe';

  return (
    <MedicalCard 
      variant={dangerLevel === 'critical' ? 'danger' : dangerLevel === 'warning' ? 'warning' : 'glass'}
      glow={dangerLevel === 'critical' ? 'danger' : dangerLevel === 'warning' ? 'warning' : 'none'}
      size="sm"
      className="relative overflow-hidden"
    >
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none scan-line opacity-30" />
      
      <div className="flex items-center justify-between mb-3">
        <h3 className="medical-label flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-primary" />
          Micro-Doppler
        </h3>
        <div className="flex items-center gap-2">
          {signalIntensity > 0.1 && (
            <Heart className={cn(
              "w-3.5 h-3.5",
              dangerLevel === 'critical' ? "text-destructive animate-heartbeat" :
              dangerLevel === 'warning' ? "text-warning animate-heartbeat" :
              "text-vitals-heart"
            )} />
          )}
          <StatusIndicator 
            status={signalIntensity > 0.6 ? 'critical' : signalIntensity > 0.3 ? 'warning' : signalIntensity > 0.1 ? 'stable' : 'inactive'} 
          />
        </div>
      </div>

      {/* Signal strength meter with heartbeat pulsation */}
      <div className="mb-3" ref={pulseRef} style={{ transition: 'transform 0.15s ease-out' }}>
        <div className="flex items-end gap-1 h-10 bg-secondary/30 rounded-lg p-1.5">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={cn(
                "flex-1 rounded-sm transition-all duration-150",
                bar <= signalBars
                  ? signalIntensity > 0.7 
                    ? "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.5)]" 
                    : signalIntensity > 0.4 
                      ? "bg-warning shadow-[0_0_6px_hsl(var(--warning)/0.4)]" 
                      : "bg-success"
                  : "bg-muted/50"
              )}
              style={{ 
                height: `${bar * 20}%`,
                animationDelay: bar <= signalBars ? `${bar * 50}ms` : '0ms',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="text-muted-foreground">Signal</span>
          <span className={cn(
            "font-mono font-semibold",
            signalIntensity > 0.6 ? "text-destructive" : 
            signalIntensity > 0.3 ? "text-warning" : 
            "text-primary"
          )}>
            {Math.round(signalIntensity * 100)}%
          </span>
        </div>
      </div>

      {/* Distance indicator with danger visualization */}
      <div className={cn(
        "text-center py-2.5 rounded-lg text-sm font-mono font-semibold transition-all",
        distanceCritical 
          ? "bg-destructive/20 text-destructive border border-destructive/50 glow-danger" 
          : distanceWarning
            ? "bg-warning/20 text-warning border border-warning/50"
            : "bg-secondary/50 text-foreground border border-border"
      )}>
        {distanceCritical ? (
          <span className="flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            ICA &lt;3mm — CRITICAL
          </span>
        ) : distanceWarning ? (
          <span className="flex items-center justify-center gap-2">
            <Activity className="w-4 h-4" />
            ICA: {(dopplerState.nearestICADistance * 10).toFixed(1)}mm
          </span>
        ) : (
          <span>ICA: {(dopplerState.nearestICADistance * 10).toFixed(1)}mm</span>
        )}
      </div>

      {/* "Doppler is Dogma" warning for high signal */}
      {signalIntensity > 0.5 && (
        <div className="mt-3 p-2.5 bg-destructive/10 rounded-lg border border-destructive/40">
          <p className="text-xs text-destructive text-center font-semibold flex items-center justify-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            "Doppler is Dogma" — Verify before incision
          </p>
        </div>
      )}

      {/* Usage hint */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground text-center">
          Sweep probe to map ICA position • 70 BPM pulsatility
        </p>
      </div>
    </MedicalCard>
  );
}
