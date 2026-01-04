// Type declarations for globally loaded MediaPipe libraries

interface HandsOptions {
  locateFile?: (file: string) => string;
}

interface HandsConfig {
  maxNumHands?: number;
  modelComplexity?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

interface HandsResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness?: Array<{ label: string; score: number }>;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

interface HandsInstance {
  setOptions(config: HandsConfig): void;
  onResults(callback: (results: HandsResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface CameraOptions {
  onFrame: () => Promise<void>;
  width?: number;
  height?: number;
}

interface CameraInstance {
  start(): Promise<void>;
  stop(): void;
}

interface HandsConstructor {
  new (options?: HandsOptions): HandsInstance;
}

interface CameraConstructor {
  new (videoElement: HTMLVideoElement, options: CameraOptions): CameraInstance;
}

declare global {
  interface Window {
    Hands: HandsConstructor;
    Camera: CameraConstructor;
  }
}

export {};
