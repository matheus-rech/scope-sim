import { useRef, useEffect, useCallback } from 'react';
import { MedicalCard } from '@/components/ui/medical-card';
import { DangerLevel } from '@/lib/haptic/HapticFeedback';
import { Vector3D } from '@/types/simulator';

/**
 * ICA MAPPING OVERLAY
 * 
 * Displays a 2D top-down projection of the surgical field with:
 * - Real-time probe position trace
 * - Color-coded proximity (green -> yellow -> red)
 * - Fading trail showing sweep history
 * - ICA danger zone indicators
 */

interface DopplerSample {
  x: number;           // Normalized -1 to 1
  y: number;           // Normalized -1 to 1
  intensity: number;   // Signal strength 0-1
  dangerLevel: DangerLevel;
  timestamp: number;
}

interface ICAMappingOverlayProps {
  isActive: boolean;
  probePosition: Vector3D;
  signalIntensity: number;
  dangerLevel: DangerLevel;
}

const MAX_SAMPLES = 200;
const TRAIL_FADE_TIME = 5000; // 5 seconds

const DANGER_COLORS: Record<DangerLevel, string> = {
  safe: 'rgba(34, 197, 94, ',      // Green
  caution: 'rgba(250, 204, 21, ',   // Yellow
  warning: 'rgba(249, 115, 22, ',   // Orange
  critical: 'rgba(239, 68, 68, ',   // Red
};

export default function ICAMappingOverlay({
  isActive,
  probePosition,
  signalIntensity,
  dangerLevel,
}: ICAMappingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<DopplerSample[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef(0);

  // Add sample when Doppler is active
  useEffect(() => {
    if (!isActive) return;
    
    const sample: DopplerSample = {
      x: probePosition.x,
      y: probePosition.y,
      intensity: signalIntensity,
      dangerLevel,
      timestamp: Date.now(),
    };
    
    samplesRef.current.push(sample);
    if (samplesRef.current.length > MAX_SAMPLES) {
      samplesRef.current.shift();
    }
  }, [probePosition.x, probePosition.y, signalIntensity, dangerLevel, isActive]);

  // Draw sellar outline (anatomical reference)
  const drawSellarOutline = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Sellar floor outline (rectangular)
    ctx.beginPath();
    ctx.roundRect(centerX - 25, centerY - 15, 50, 30, 4);
    ctx.stroke();
    
    // Label
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELLA', centerX, centerY + 3);
  }, []);

  // Draw ICA danger zones (bilateral arcs)
  const drawICAZones = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerY = height / 2;
    
    // Left ICA zone
    const leftGradient = ctx.createRadialGradient(0, centerY, 0, 0, centerY, 40);
    leftGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    leftGradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
    leftGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    
    ctx.fillStyle = leftGradient;
    ctx.beginPath();
    ctx.arc(0, centerY, 35, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    
    // Right ICA zone
    const rightGradient = ctx.createRadialGradient(width, centerY, 0, width, centerY, 40);
    rightGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    rightGradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
    rightGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    
    ctx.fillStyle = rightGradient;
    ctx.beginPath();
    ctx.arc(width, centerY, 35, Math.PI / 2, -Math.PI / 2);
    ctx.fill();
    
    // ICA labels
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('◐', 4, centerY + 3);
    ctx.textAlign = 'right';
    ctx.fillText('◑', width - 4, centerY + 3);
  }, []);

  // Draw current probe position with pulsing effect
  const drawCurrentProbe = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    level: DangerLevel,
    phase: number
  ) => {
    const pulse = 0.8 + 0.2 * Math.sin(phase);
    const baseRadius = 5 + signalIntensity * 3;
    const radius = baseRadius * pulse;
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    glowGradient.addColorStop(0, DANGER_COLORS[level] + '0.6)');
    glowGradient.addColorStop(0.5, DANGER_COLORS[level] + '0.2)');
    glowGradient.addColorStop(1, DANGER_COLORS[level] + '0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Core
    ctx.fillStyle = DANGER_COLORS[level] + '1)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Center dot
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }, [signalIntensity]);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas with dark background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw anatomical references
      drawICAZones(ctx, width, height);
      drawSellarOutline(ctx, width, height);
      
      // Draw probe trail with fading
      const now = Date.now();
      const samples = samplesRef.current;
      
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        const age = now - sample.timestamp;
        const alpha = Math.max(0, 1 - age / TRAIL_FADE_TIME);
        
        if (alpha <= 0) continue;
        
        // Map normalized coords (-1 to 1) to canvas coords
        const x = ((sample.x / 2) + 0.5) * width;
        const y = ((sample.y / 2) + 0.5) * height;
        
        // Draw trail point
        const pointRadius = 2 + sample.intensity * 2;
        ctx.fillStyle = DANGER_COLORS[sample.dangerLevel] + (alpha * 0.8) + ')';
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Connect consecutive points with line
        if (i > 0) {
          const prev = samples[i - 1];
          const prevX = ((prev.x / 2) + 0.5) * width;
          const prevY = ((prev.y / 2) + 0.5) * height;
          
          ctx.strokeStyle = DANGER_COLORS[sample.dangerLevel] + (alpha * 0.4) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
      
      // Draw current probe position if active
      if (isActive) {
        const probeX = ((probePosition.x / 2) + 0.5) * width;
        const probeY = ((probePosition.y / 2) + 0.5) * height;
        
        pulsePhaseRef.current += 0.15;
        drawCurrentProbe(ctx, probeX, probeY, dangerLevel, pulsePhaseRef.current);
      }
      
      animationIdRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isActive, probePosition, dangerLevel, drawSellarOutline, drawICAZones, drawCurrentProbe]);

  // Clear samples when becoming inactive
  useEffect(() => {
    if (!isActive) {
      // Keep the trail visible but stop adding new samples
    }
  }, [isActive]);

  return (
    <MedicalCard variant="glass" size="sm" className="w-48 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          ICA Mapping
        </h4>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] text-success font-mono">SWEEP</span>
          </span>
        )}
      </div>
      
      <canvas 
        ref={canvasRef} 
        width={176}
        height={120}
        className="rounded border border-border/50 w-full"
      />
      
      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground font-mono">
        <span className="text-destructive">L-ICA</span>
        <span className="text-muted-foreground/60">
          {samplesRef.current.length} pts
        </span>
        <span className="text-destructive">R-ICA</span>
      </div>
    </MedicalCard>
  );
}
