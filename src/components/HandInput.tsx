/**
 * Hand Input Component - MediaPipe Tasks Vision Implementation
 * Matches Schema: src/components/HandInput.tsx
 * 
 * Uses @mediapipe/tasks-vision with FilesetResolver and HandLandmarker
 * for modern, reliable hand tracking.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { inputRefs } from '../store';

interface HandInputProps {
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
  onCalibrate?: () => void;
}

interface TrackingState {
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  isCalibrated: boolean;
}

/**
 * Headless hand tracking component using MediaPipe Tasks Vision
 */
export const HandTracker = ({ 
  onTrackingStart, 
  onTrackingStop,
  onCalibrate 
}: HandInputProps) => {
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const calibrationRef = useRef<{ x: number; y: number; z: number } | null>(null);
  
  const [state, setState] = useState<TrackingState>({
    isLoading: false,
    isTracking: false,
    error: null,
    isCalibrated: false,
  });

  /**
   * Calibrate hand position - sets current position as center
   */
  const calibrate = useCallback(() => {
    if (inputRefs.leftHand.x !== 0 || inputRefs.leftHand.y !== 0) {
      calibrationRef.current = {
        x: inputRefs.leftHand.x,
        y: inputRefs.leftHand.y,
        z: inputRefs.leftHand.z,
      };
      inputRefs.isCalibrated = true;
      setState(prev => ({ ...prev, isCalibrated: true }));
      onCalibrate?.();
    }
  }, [onCalibrate]);

  useEffect(() => {
    let isMounted = true;

    const startVision = async () => {
      if (!isMounted) return;
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Initialize MediaPipe Vision with FilesetResolver
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );

        if (!isMounted) return;

        // Create HandLandmarker with GPU delegate
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        if (!isMounted) return;

        // Get webcam stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user',
          } 
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        await videoRef.current.play();

        setState(prev => ({ ...prev, isLoading: false, isTracking: true }));
        onTrackingStart?.();

        // Start prediction loop
        predictLoop();
      } catch (err) {
        console.error('[HandTracker] Initialization error:', err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to start hand tracking',
          }));
        }
      }
    };

    const predictLoop = () => {
      if (!isMounted) return;
      
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && video.readyState >= 2 && landmarker) {
        const results = landmarker.detectForVideo(video, performance.now());

        if (results.landmarks && results.landmarks.length > 0) {
          // Reset inputs
          inputRefs.leftHand = { x: 0, y: 0, z: 0, rot: 0 };
          inputRefs.rightHand = { x: 0, y: 0, z: 0, pinch: false, pinchStrength: 0 };

          results.landmarks.forEach((hand, index) => {
            const handedness = results.handedness[index]?.[0]?.categoryName || 'Right';
            
            const wrist = hand[0];
            const thumb = hand[4];
            const indexTip = hand[8];
            const pinkyMcp = hand[17];
            const indexMcp = hand[5];

            // 1. Calculate Pinch (Distance between Thumb & Index)
            const pinchDist = Math.hypot(
              thumb.x - indexTip.x,
              thumb.y - indexTip.y,
              (thumb.z || 0) - (indexTip.z || 0)
            );
            const isPinching = pinchDist < 0.05;
            const pinchStrength = Math.max(0, Math.min(1, (0.12 - pinchDist) / 0.07));

            // 2. Normalize Coordinates (MediaPipe 0..1 -> Game -1..1)
            let x = (1 - wrist.x - 0.5) * 2; // Invert X for mirror effect
            let y = -(wrist.y - 0.5) * 2;     // Invert Y for 3D space
            let z = (wrist.z || 0) * -10;     // Scale up depth

            // Apply calibration offset if set
            if (calibrationRef.current) {
              x -= calibrationRef.current.x;
              y -= calibrationRef.current.y;
            }

            // 3. Calculate wrist rotation
            const dx = indexMcp.x - pinkyMcp.x;
            const dy = indexMcp.y - pinkyMcp.y;
            const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

            // 4. Update Global Refs (Direct Memory Access)
            // Note: In selfie mode, 'Left' typically detects as physical Right hand
            if (handedness === 'Left') {
              // Physical right hand -> controls scope
              inputRefs.leftHand = { x, y, z, rot: rotation };
            } else {
              // Physical left hand -> controls tool
              inputRefs.rightHand = { 
                x, 
                y, 
                z, 
                pinch: isPinching, 
                pinchStrength 
              };
            }
          });
        }
      }

      animationIdRef.current = requestAnimationFrame(predictLoop);
    };

    startVision();

    return () => {
      isMounted = false;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
      
      onTrackingStop?.();
    };
  }, [onTrackingStart, onTrackingStop]);

  // Expose calibrate function
  useEffect(() => {
    (window as any).__handTrackerCalibrate = calibrate;
    return () => {
      delete (window as any).__handTrackerCalibrate;
    };
  }, [calibrate]);

  // This is a headless component - no DOM render
  return null;
};

/**
 * Hook to access hand tracking state
 */
export function useHandInput() {
  return {
    leftHand: inputRefs.leftHand,
    rightHand: inputRefs.rightHand,
    isCalibrated: inputRefs.isCalibrated,
    calibrate: () => {
      (window as any).__handTrackerCalibrate?.();
    },
  };
}

export default HandTracker;
