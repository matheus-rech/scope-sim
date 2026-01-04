import { HandLandmarks, GestureType } from '@/types/simulator';
import { cn } from '@/lib/utils';

interface HandTrackingPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isTracking: boolean;
  isCalibrated: boolean;
  gesture: GestureType;
  pinchStrength: number;
  onCalibrate: () => void;
}

export default function HandTrackingPreview({
  videoRef,
  canvasRef,
  isTracking,
  isCalibrated,
  gesture,
  pinchStrength,
  onCalibrate,
}: HandTrackingPreviewProps) {
  return (
    <div className="relative bg-secondary rounded-lg overflow-hidden border border-border">
      {/* Video feed (hidden, used by MediaPipe) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        autoPlay
        playsInline
        muted
      />
      
      {/* Canvas overlay for hand landmarks */}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Status overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        {/* Top: Tracking status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isTracking ? 'bg-success animate-pulse' : 'bg-muted-foreground'
              )}
            />
            <span className="text-xs text-foreground/80">
              {isTracking ? 'Hand Detected' : 'No Hand'}
            </span>
          </div>
          
          {isTracking && (
            <span className="text-xs font-mono text-muted-foreground capitalize">
              {gesture}
            </span>
          )}
        </div>
        
        {/* Bottom: Calibration and pinch strength */}
        <div className="space-y-2">
          {/* Pinch strength bar */}
          {isTracking && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pinch</span>
                <span>{(pinchStrength * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-100"
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
              'w-full py-1.5 rounded text-xs font-medium transition-colors',
              isCalibrated
                ? 'bg-success/20 text-success border border-success/30'
                : isTracking
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isCalibrated ? '✓ Calibrated' : 'Calibrate Position'}
          </button>
        </div>
      </div>
    </div>
  );
}
