/**
 * useHandTracking Hook - Compatibility wrapper for new HandInput system
 * Provides the same API as the original hook while using new MediaPipe Tasks Vision
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandLandmarks, GestureType } from '@/types/simulator';
import { inputRefs } from '@/store';

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

const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
  PINKY_MCP: 17,
} as const;

export function useHandTracking(): UseHandTrackingReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const calibrationRef = useRef<{ x: number; y: number; z: number } | null>(null);

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

  const detectGesture = (landmarks: { x: number; y: number; z: number }[]): GestureType => {
    if (!landmarks || landmarks.length < 21) return 'unknown';
    
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const pinchDist = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      (thumbTip.z || 0) - (indexTip.z || 0)
    );
    
    if (pinchDist < 0.05) return 'pinch';
    
    const wrist = landmarks[LANDMARK.WRIST];
    const fingersExtended = [
      landmarks[LANDMARK.INDEX_TIP],
      landmarks[LANDMARK.MIDDLE_TIP],
      landmarks[LANDMARK.RING_TIP],
      landmarks[LANDMARK.PINKY_TIP],
    ].filter(tip => {
      const distFromWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      return distFromWrist > 0.15;
    }).length;

    if (fingersExtended >= 4) return 'open';
    if (fingersExtended === 1) return 'point';
    if (fingersExtended === 0) return 'fist';

    return 'unknown';
  };

  const calculatePinchStrength = (landmarks: { x: number; y: number; z: number }[]): number => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const distance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      (thumbTip.z || 0) - (indexTip.z || 0)
    );
    
    return Math.max(0, Math.min(1, (0.12 - distance) / 0.09));
  };

  const calculateWristRotation = (landmarks: { x: number; y: number; z: number }[]): number => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    const indexMcp = landmarks[LANDMARK.INDEX_MCP];
    const pinkyMcp = landmarks[LANDMARK.PINKY_MCP];
    
    const dx = indexMcp.x - pinkyMcp.x;
    const dy = indexMcp.y - pinkyMcp.y;
    
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    angleDeg = Math.abs(angleDeg);
    if (angleDeg > 90) angleDeg = 180 - angleDeg;
    
    return angleDeg;
  };

  const mapLandmarksToHand = (
    landmarks: { x: number; y: number; z: number }[],
    score: number
  ): HandLandmarks => {
    const wristRaw = landmarks[LANDMARK.WRIST];
    const thumbTipRaw = landmarks[LANDMARK.THUMB_TIP];
    const indexTipRaw = landmarks[LANDMARK.INDEX_TIP];
    const indexMcpRaw = landmarks[LANDMARK.INDEX_MCP];
    const middleMcpRaw = landmarks[LANDMARK.MIDDLE_MCP];

    const palmCenterRaw = {
      x: (indexMcpRaw.x + middleMcpRaw.x) / 2,
      y: (indexMcpRaw.y + middleMcpRaw.y) / 2,
      z: (indexMcpRaw.z + middleMcpRaw.z) / 2,
    };

    const mapToSimulator = (raw: { x: number; y: number; z: number }) => {
      let x = (1 - raw.x - 0.5) * 2;
      let y = -(raw.y - 0.5) * 2;
      let z = (raw.z || 0) * -10;

      if (calibrationRef.current) {
        x -= calibrationRef.current.x;
        y -= calibrationRef.current.y;
      }

      return { x, y, z };
    };

    return {
      wrist: mapToSimulator(wristRaw),
      indexTip: mapToSimulator(indexTipRaw),
      thumbTip: mapToSimulator(thumbTipRaw),
      palmCenter: mapToSimulator(palmCenterRaw),
      isTracking: true,
      confidence: score,
    };
  };

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number; z: number }[],
    color: string
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      ctx.stroke();
    });

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

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (!videoRef.current) {
        throw new Error('Video element not ready');
      }

      videoRef.current.srcObject = stream;
      videoRef.current.playsInline = true;
      await videoRef.current.play();

      setState(prev => ({ ...prev, isLoading: false, isTracking: true }));

      const predictLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const landmarker = landmarkerRef.current;

        if (video && video.readyState >= 2 && landmarker) {
          const results = landmarker.detectForVideo(video, performance.now());
          const ctx = canvas?.getContext('2d');

          if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          if (results.landmarks && results.landmarks.length > 0) {
            let dominantHand: HandLandmarks | null = null;
            let secondaryHand: HandLandmarks | null = null;
            let dominantLandmarks: { x: number; y: number; z: number }[] | null = null;
            let secondaryLandmarks: { x: number; y: number; z: number }[] | null = null;

            results.landmarks.forEach((hand, index) => {
              const handedness = results.handedness[index]?.[0]?.categoryName || 'Right';
              const score = results.handedness[index]?.[0]?.score || 0.9;
              
              const mapped = mapLandmarksToHand(hand, score);

              if (handedness === 'Left' && !dominantHand) {
                dominantHand = mapped;
                dominantLandmarks = hand;
                
                inputRefs.leftHand.x = mapped.wrist.x;
                inputRefs.leftHand.y = mapped.wrist.y;
                inputRefs.leftHand.z = mapped.wrist.z;
                inputRefs.leftHand.rot = calculateWristRotation(hand);
              } else if (!secondaryHand) {
                secondaryHand = mapped;
                secondaryLandmarks = hand;
                
                const pinchStrength = calculatePinchStrength(hand);
                inputRefs.rightHand.x = mapped.wrist.x;
                inputRefs.rightHand.y = mapped.wrist.y;
                inputRefs.rightHand.z = mapped.wrist.z;
                inputRefs.rightHand.pinch = pinchStrength > 0.7;
                inputRefs.rightHand.pinchStrength = pinchStrength;
              }

              if (ctx && canvas) {
                drawHandLandmarks(ctx, hand, handedness === 'Left' ? '#00e5cc' : '#ff6b6b');
              }
            });

            if (!dominantHand && results.landmarks.length > 0) {
              dominantLandmarks = results.landmarks[0];
              dominantHand = mapLandmarksToHand(results.landmarks[0], 0.9);
              
              inputRefs.leftHand.x = dominantHand.wrist.x;
              inputRefs.leftHand.y = dominantHand.wrist.y;
              inputRefs.leftHand.z = dominantHand.wrist.z;
              inputRefs.leftHand.rot = calculateWristRotation(results.landmarks[0]);
            }

            const pinchStrength = dominantLandmarks ? calculatePinchStrength(dominantLandmarks) : 0;
            const wristRotation = dominantLandmarks ? calculateWristRotation(dominantLandmarks) : 0;
            const dominantGesture = dominantLandmarks ? detectGesture(dominantLandmarks) : 'unknown';
            const secondaryGesture = secondaryLandmarks ? detectGesture(secondaryLandmarks) : 'unknown';

            if (results.landmarks.length === 1) {
              inputRefs.rightHand.pinch = pinchStrength > 0.7;
              inputRefs.rightHand.pinchStrength = pinchStrength;
            }

            setState(prev => ({
              ...prev,
              isTracking: true,
              dominantHand: dominantHand || prev.dominantHand,
              secondaryHand,
              dominantGesture,
              secondaryGesture,
              wristRotation,
              pinchStrength,
            }));
          } else {
            setState(prev => ({
              ...prev,
              dominantHand: { ...prev.dominantHand, isTracking: false },
              secondaryHand: null,
            }));
          }
        }

        animationIdRef.current = requestAnimationFrame(predictLoop);
      };

      predictLoop();
    } catch (err) {
      console.error('[useHandTracking] Error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to start hand tracking',
      }));
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }

    setState(prev => ({ ...prev, isTracking: false, isLoading: false }));
  }, []);

  const calibrate = useCallback(() => {
    calibrationRef.current = {
      x: inputRefs.leftHand.x,
      y: inputRefs.leftHand.y,
      z: inputRefs.leftHand.z,
    };
    inputRefs.isCalibrated = true;
    setIsCalibrated(true);
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
