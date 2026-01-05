import { Vector3D, HandLandmarks, GestureType } from '@/types/simulator';

// MediaPipe hand landmark indices
const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
} as const;

export interface RawHandData {
  landmarks: Array<{ x: number; y: number; z: number }>;
  handedness: 'Left' | 'Right';
  score: number;
}

export class HandMapper {
  private calibrationOffset: Vector3D = { x: 0, y: 0, z: 0 };
  private calibrationScale: number = 1;
  private isCalibrated: boolean = false;
  private baseDistance: number = 0.5; // Default hand distance from camera

  /**
   * Calibrate the hand mapper with current hand position as center
   */
  calibrate(landmarks: Array<{ x: number; y: number; z: number }>): void {
    if (!landmarks || landmarks.length === 0) return;

    const wrist = landmarks[LANDMARK.WRIST];
    
    // Set current position as center
    this.calibrationOffset = {
      x: wrist.x - 0.5, // Center horizontally
      y: wrist.y - 0.5, // Center vertically
      z: wrist.z,
    };

    // Calculate hand span for scale calibration
    const indexTip = landmarks[LANDMARK.INDEX_TIP];
    const pinkyTip = landmarks[LANDMARK.PINKY_TIP];
    const handSpan = Math.sqrt(
      Math.pow(indexTip.x - pinkyTip.x, 2) +
      Math.pow(indexTip.y - pinkyTip.y, 2)
    );

    // Use hand span to normalize scale (average adult hand span ~8cm)
    this.calibrationScale = 0.15 / Math.max(handSpan, 0.05);
    this.baseDistance = wrist.z;
    this.isCalibrated = true;
  }

  /**
   * Convert MediaPipe landmarks to our HandLandmarks format
   */
  mapLandmarks(rawData: RawHandData | null): HandLandmarks {
    if (!rawData || !rawData.landmarks || rawData.landmarks.length < 21) {
      return {
        wrist: { x: 0, y: 0, z: 0 },
        indexTip: { x: 0, y: 0, z: 0 },
        thumbTip: { x: 0, y: 0, z: 0 },
        palmCenter: { x: 0, y: 0, z: 0 },
        isTracking: false,
        confidence: 0,
      };
    }

    const { landmarks, score } = rawData;

    // Get key landmarks
    const wristRaw = landmarks[LANDMARK.WRIST];
    const thumbTipRaw = landmarks[LANDMARK.THUMB_TIP];
    const indexTipRaw = landmarks[LANDMARK.INDEX_TIP];
    const indexMcpRaw = landmarks[LANDMARK.INDEX_MCP];
    const middleMcpRaw = landmarks[LANDMARK.MIDDLE_MCP];

    // Calculate palm center (between index and middle MCP)
    const palmCenterRaw = {
      x: (indexMcpRaw.x + middleMcpRaw.x) / 2,
      y: (indexMcpRaw.y + middleMcpRaw.y) / 2,
      z: (indexMcpRaw.z + middleMcpRaw.z) / 2,
    };

    // Apply calibration and convert to simulator space
    const mapToSimulator = (raw: { x: number; y: number; z: number }): Vector3D => {
      // MediaPipe: x (0-1 left to right), y (0-1 top to bottom), z (negative = closer)
      // Simulator: x (left-right), y (up-down), z (depth into nasal cavity)
      
      let x = (raw.x - 0.5) * 2; // Center and scale to -1 to 1
      let y = -(raw.y - 0.5) * 2; // Invert Y and center
      let z = 0;

      if (this.isCalibrated) {
        x = (raw.x - this.calibrationOffset.x - 0.5) * 2;
        y = -(raw.y - this.calibrationOffset.y - 0.5) * 2;
        
        // Z-depth: closer to camera = scope withdrawn, farther = advanced
        // MediaPipe z is typically small negative values
        z = (this.baseDistance - raw.z) * 10; // Scale up the depth
      }

      // Apply scale
      x *= this.calibrationScale * 5; // Scale to ~cm range
      y *= this.calibrationScale * 5;
      z = Math.max(0, Math.min(15, z * this.calibrationScale)); // Clamp depth to 0-15cm

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
  }

  /**
   * Calculate wrist rotation (roll) for scope angle control
   * Returns degrees
   */
  calculateWristRotation(landmarks: Array<{ x: number; y: number; z: number }>): number {
    if (!landmarks || landmarks.length < 21) return 0;

    const wrist = landmarks[LANDMARK.WRIST];
    const indexMcp = landmarks[LANDMARK.INDEX_MCP];
    const pinkyMcp = landmarks[16]; // Pinky MCP

    // Calculate the angle of the line from pinky to index MCP relative to horizontal
    const dx = indexMcp.x - pinkyMcp.x;
    const dy = indexMcp.y - pinkyMcp.y;
    
    const angleRad = Math.atan2(dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);

    // Normalize to 0-90 range
    angleDeg = Math.abs(angleDeg);
    if (angleDeg > 90) angleDeg = 180 - angleDeg;

    return angleDeg;
  }

  /**
   * Detect pinch gesture for tool activation
   * Returns strength 0-1
   */
  detectPinchStrength(landmarks: Array<{ x: number; y: number; z: number }>): number {
    if (!landmarks || landmarks.length < 21) return 0;

    const thumbTip = landmarks[LANDMARK.THUMB_TIP];
    const indexTip = landmarks[LANDMARK.INDEX_TIP];

    // Calculate distance between thumb and index tips
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );

    // Normalize: ~0.03 = touching, ~0.15 = fully open
    const normalized = Math.max(0, Math.min(1, (0.12 - distance) / 0.09));
    
    return normalized;
  }

  /**
   * Detect overall hand gesture
   */
  detectGesture(landmarks: Array<{ x: number; y: number; z: number }>): GestureType {
    if (!landmarks || landmarks.length < 21) return 'unknown';

    const pinchStrength = this.detectPinchStrength(landmarks);
    if (pinchStrength > 0.7) return 'pinch';

    // Check if fingers are extended
    const wrist = landmarks[LANDMARK.WRIST];
    const fingersExtended = [
      landmarks[LANDMARK.INDEX_TIP],
      landmarks[LANDMARK.MIDDLE_TIP],
      landmarks[LANDMARK.RING_TIP],
      landmarks[LANDMARK.PINKY_TIP],
    ].filter(tip => {
      const distFromWrist = Math.sqrt(
        Math.pow(tip.x - wrist.x, 2) +
        Math.pow(tip.y - wrist.y, 2)
      );
      return distFromWrist > 0.15;
    }).length;

    if (fingersExtended >= 4) return 'open';
    if (fingersExtended === 1) return 'point';
    if (fingersExtended === 0) return 'fist';

    return 'unknown';
  }

  isCalibrationComplete(): boolean {
    return this.isCalibrated;
  }

  resetCalibration(): void {
    this.isCalibrated = false;
    this.calibrationOffset = { x: 0, y: 0, z: 0 };
    this.calibrationScale = 1;
  }
}

export const handMapper = new HandMapper();
