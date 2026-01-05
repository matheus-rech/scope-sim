import { useRef, useState, useCallback, useEffect } from 'react';
import { HandLandmarks, GestureType } from '@/types/simulator';
import { handMapper, RawHandData } from '@/lib/tracking/HandMapper';
import { inputRefs } from '@/store/inputRefs';

interface HandTrackingState {
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  dominantHand: HandLandmarks;
  secondaryHand: HandLandmarks | null;
  dominantGesture: GestureType;
  secondaryGesture: GestureType;
  wristRotation: number;
  pinchStrength: number;
}

interface UseHandTrackingReturn extends HandTrackingState {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  calibrate: () => void;
  isCalibrated: boolean;
}

export function useHandTracking(): UseHandTrackingReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();

  const [state, setState] = useState<HandTrackingState>({
    isLoading: false,
    isTracking: false,
    error: null,
    dominantHand: {
      wrist: { x: 0, y: 0, z: 0 },
      indexTip: { x: 0, y: 0, z: 0 },
      thumbTip: { x: 0, y: 0, z: 0 },
      palmCenter: { x: 0, y: 0, z: 0 },
      isTracking: false,
      confidence: 0,
    },
    secondaryHand: null,
    dominantGesture: 'unknown',
    secondaryGesture: 'unknown',
    wristRotation: 0,
    pinchStrength: 0,
  });

  const [isCalibrated, setIsCalibrated] = useState(false);
  const latestLandmarksRef = useRef<Array<{ x: number; y: number; z: number }> | null>(null);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Process hands
      const hands: RawHandData[] = results.multiHandLandmarks.map(
        (landmarks: any, idx: number) => ({
          landmarks,
          handedness: results.multiHandedness?.[idx]?.label || 'Right',
          score: results.multiHandedness?.[idx]?.score || 0.9,
        })
      );

      // Determine dominant hand (prefer right)
      const dominantIdx = hands.findIndex(h => h.handedness === 'Right');
      const dominant = hands[dominantIdx >= 0 ? dominantIdx : 0];
      const secondary = hands.length > 1 
        ? hands[dominantIdx >= 0 ? (dominantIdx === 0 ? 1 : 0) : 1]
        : null;

      // Store latest landmarks for calibration
      latestLandmarksRef.current = dominant.landmarks;

      // Map to simulator coordinates
      const dominantMapped = handMapper.mapLandmarks(dominant);
      const secondaryMapped = secondary ? handMapper.mapLandmarks(secondary) : null;

      // Calculate gestures and rotation
      const wristRotation = handMapper.calculateWristRotation(dominant.landmarks);
      const pinchStrength = handMapper.detectPinchStrength(dominant.landmarks);
      const dominantGesture = handMapper.detectGesture(dominant.landmarks);
      const secondaryGesture = secondary 
        ? handMapper.detectGesture(secondary.landmarks) 
        : 'unknown';

      // === WRITE DIRECTLY TO INPUT REFS FOR 60 FPS PHYSICS ===
      // Left hand (dominant) controls scope
      inputRefs.leftHand.x = dominantMapped.wrist.x;
      inputRefs.leftHand.y = dominantMapped.wrist.y;
      inputRefs.leftHand.z = dominantMapped.wrist.z;
      inputRefs.leftHand.rot = wristRotation;
      
      // Right hand (secondary) controls tool
      if (secondaryMapped) {
        inputRefs.rightHand.x = secondaryMapped.wrist.x;
        inputRefs.rightHand.y = secondaryMapped.wrist.y;
        inputRefs.rightHand.z = secondaryMapped.wrist.z;
        inputRefs.rightHand.pinch = pinchStrength > 0.7;
        inputRefs.rightHand.pinchStrength = pinchStrength;
      } else {
        // Single hand mode - use dominant hand for tool activation
        inputRefs.rightHand.pinch = pinchStrength > 0.7;
        inputRefs.rightHand.pinchStrength = pinchStrength;
      }

      setState(prev => ({
        ...prev,
        isTracking: true,
        dominantHand: dominantMapped,
        secondaryHand: secondaryMapped,
        dominantGesture,
        secondaryGesture,
        wristRotation,
        pinchStrength,
      }));

      // Draw hand landmarks for preview
      drawHandLandmarks(ctx, dominant.landmarks, '#00e5cc');
      if (secondary) {
        drawHandLandmarks(ctx, secondary.landmarks, '#ff6b6b');
      }
    } else {
      setState(prev => ({
        ...prev,
        isTracking: false,
        dominantHand: { ...prev.dominantHand, isTracking: false },
      }));
    }
  }, []);

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{ x: number; y: number; z: number }>,
    color: string
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((landmark, idx) => {
      ctx.fillStyle = idx === 0 ? '#ff0' : color;
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, idx === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const startTracking = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use globally loaded MediaPipe (from CDN script tags in index.html)
      const Hands = window.Hands;
      const Camera = window.Camera;

      if (!Hands || !Camera) {
        throw new Error('MediaPipe libraries not loaded. Please refresh the page.');
      }

      if (!videoRef.current) {
        throw new Error('Video element not ready');
      }

      // Wait for video element to be ready using requestAnimationFrame
      // This ensures the DOM is fully painted before initializing camera
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 50 * 50ms = 2.5 seconds max wait
        
        const checkReady = () => {
          attempts++;
          if (videoRef.current && videoRef.current.offsetWidth > 0) {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Video element not ready after timeout'));
          } else {
            requestAnimationFrame(checkReady);
          }
        };
        
        requestAnimationFrame(checkReady);
      });

      // Initialize MediaPipe Hands - pin version to match index.html
      const MP_HANDS_VERSION = '0.4.1675469240';
      handsRef.current = new Hands({
        locateFile: (file: string) => 
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MP_HANDS_VERSION}/${file}`,
      });

      handsRef.current.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      handsRef.current.onResults(onResults);

      // Initialize camera using global Camera
      cameraRef.current = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await cameraRef.current.start();

      setState(prev => ({ ...prev, isLoading: false, isTracking: true }));
    } catch (err) {
      console.error('Hand tracking error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start hand tracking',
      }));
    }
  }, [onResults]);

  const stopTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close?.();
      handsRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setState(prev => ({ ...prev, isTracking: false, isLoading: false }));
  }, []);

  const calibrate = useCallback(() => {
    if (latestLandmarksRef.current) {
      handMapper.calibrate(latestLandmarksRef.current);
      setIsCalibrated(handMapper.isCalibrationComplete());
      inputRefs.isCalibrated = handMapper.isCalibrationComplete();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    videoRef,
    canvasRef,
    startTracking,
    stopTracking,
    calibrate,
    isCalibrated,
  };
}
