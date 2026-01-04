import { useRef } from 'react';
import { GestureType, ToolType } from '@/types/simulator';
import { cn } from '@/lib/utils';
import { MedicalCard, StatusIndicator } from '@/components/ui/medical-card';
import HandToolOverlay from './HandToolOverlay';
import { Hand, Video, Target } from 'lucide-react';

interface HandTrackingPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isTracking: boolean;
  isCalibrated: boolean;
  gesture: GestureType;
  pinchStrength: number;
  onCalibrate: () => void;
  // New props for tool overlay
  activeTool?: ToolType;
  isToolActive?: boolean;
  handPosition?: { x: number; y: number } | null;
}

export default function HandTrackingPreview({
  videoRef,
  canvasRef,
  isTracking,
  isCalibrated,
  gesture,
  pinchStrength,
  onCalibrate,
  activeTool = 'scope',
  isToolActive = false,
  handPosition = null,
}: HandTrackingPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <MedicalCard 
      variant="glass" 
      size="sm" 
      className="relative overflow-hidden"
      ref={containerRef}
    >
      {/* Video feed (hidden, used by MediaPipe) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-40 scale-x-[-1]"
        autoPlay
        playsInline
        muted
      />
      
      {/* Canvas overlay for hand landmarks */}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="absolute inset-0 w-full h-full scale-x-[-1]"
      />
      
      {/* Tool overlay on hand */}
      <HandToolOverlay
        tool={activeTool}
        isActive={isToolActive}
        pinchStrength={pinchStrength}
        handPosition={handPosition}
        containerRef={containerRef}
      />
      
      {/* Status overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
        {/* Top: Tracking status */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <StatusIndicator status={isTracking ? 'stable' : 'inactive'} />
            <span className="text-xs text-foreground font-medium">
              {isTracking ? 'Hand Detected' : 'No Hand'}
            </span>
          </div>
          
          {isTracking && (
            <span className="text-xs font-mono text-primary bg-card/60 backdrop-blur-sm px-2 py-1 rounded-md capitalize">
              {gesture}
            </span>
          )}
        </div>
        
        {/* Bottom: Calibration and pinch strength */}
        <div className="space-y-2 pointer-events-auto">
          {/* Pinch strength bar */}
          {isTracking && (
            <div className="space-y-1 bg-card/60 backdrop-blur-sm p-2 rounded-md">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Hand className="w-3 h-3" />
                  Pinch
                </span>
                <span className="font-mono text-primary font-medium">
                  {(pinchStrength * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-100 rounded-full',
                    pinchStrength > 0.7 
                      ? 'bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]' 
                      : 'bg-primary'
                  )}
                  style={{ width: `${pinchStrength * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Calibration button */}
          <button
            onClick={onCalibrate}
            disabled={!isTracking}
            className={cn(
              'w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2',
              isCalibrated
                ? 'bg-success/20 text-success border border-success/40 shadow-[0_0_10px_hsl(var(--success)/0.2)]'
                : isTracking
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isCalibrated ? (
              <>
                <Target className="w-3.5 h-3.5" />
                Calibrated
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                Calibrate Position
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Corner frame decorations */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50 rounded-br-lg" />
    </MedicalCard>
  );
}
