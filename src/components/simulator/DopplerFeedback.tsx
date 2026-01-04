import { useEffect, useRef, useMemo } from 'react';
import { DopplerState } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface DopplerFeedbackProps {
  dopplerState: DopplerState;
  isActive: boolean;
}

// Audio context for Doppler sounds
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

export default function DopplerFeedback({ dopplerState, isActive }: DopplerFeedbackProps) {
  const animationRef = useRef<number>(0);
  
  // Calculate visual intensity based on signal strength
  const signalIntensity = useMemo(() => {
    if (!isActive || !dopplerState.isActive) return 0;
    return dopplerState.signalStrength;
  }, [isActive, dopplerState.isActive, dopplerState.signalStrength]);

  // Audio feedback for Doppler signal
  useEffect(() => {
    if (!isActive || signalIntensity < 0.1) {
      // Stop audio when not active or signal too weak
      if (oscillator) {
        oscillator.stop();
        oscillator = null;
      }
      return;
    }

    // Initialize audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Create oscillator for pulsating Doppler sound
    if (!oscillator && audioContext) {
      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Low frequency base for arterial pulse simulation
      oscillator.frequency.value = 100 + signalIntensity * 200;
      oscillator.type = 'sine';
      
      gainNode.gain.value = signalIntensity * 0.3;
      
      oscillator.start();
    } else if (oscillator && gainNode) {
      // Update frequency and volume based on proximity
      oscillator.frequency.value = 100 + signalIntensity * 200;
      gainNode.gain.value = signalIntensity * 0.3;
    }

    // Pulsating effect (simulating heartbeat)
    const pulseInterval = setInterval(() => {
      if (gainNode && audioContext) {
        const now = audioContext.currentTime;
        // Simulate heartbeat rhythm (~72 BPM)
        gainNode.gain.setValueAtTime(signalIntensity * 0.3, now);
        gainNode.gain.linearRampToValueAtTime(signalIntensity * 0.5, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(signalIntensity * 0.3, now + 0.2);
      }
    }, 833); // ~72 BPM

    return () => {
      clearInterval(pulseInterval);
    };
  }, [isActive, signalIntensity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscillator) {
        oscillator.stop();
        oscillator = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
    };
  }, []);

  if (!isActive) return null;

  const signalBars = Math.ceil(signalIntensity * 5);
  const distanceWarning = dopplerState.nearestICADistance < 0.5;

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Micro-Doppler
        </h3>
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          signalIntensity > 0.2 ? "bg-destructive" : "bg-muted"
        )} />
      </div>

      {/* Signal strength meter */}
      <div className="mb-3">
        <div className="flex items-center gap-1 h-8">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={cn(
                "flex-1 rounded-sm transition-all duration-150",
                bar <= signalBars
                  ? signalIntensity > 0.7 
                    ? "bg-destructive animate-pulse" 
                    : signalIntensity > 0.4 
                      ? "bg-warning" 
                      : "bg-success"
                  : "bg-muted"
              )}
              style={{ height: `${bar * 20}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Signal: {Math.round(signalIntensity * 100)}%
        </p>
      </div>

      {/* Distance indicator */}
      <div className={cn(
        "text-center py-2 rounded-md text-sm font-mono",
        distanceWarning 
          ? "bg-destructive/20 text-destructive glow-danger" 
          : "bg-secondary text-foreground"
      )}>
        {distanceWarning ? (
          <span className="animate-pulse">⚠ ICA &lt;5mm</span>
        ) : (
          <span>ICA: {(dopplerState.nearestICADistance * 10).toFixed(1)}mm</span>
        )}
      </div>

      {/* "Doppler is Dogma" reminder */}
      {signalIntensity > 0.6 && (
        <div className="mt-3 p-2 bg-destructive/10 rounded border border-destructive/30">
          <p className="text-xs text-destructive text-center font-medium">
            "Doppler is Dogma" - Verify before dural incision
          </p>
        </div>
      )}

      {/* Usage hint */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Sweep probe to map ICA position
        </p>
      </div>
    </div>
  );
}
