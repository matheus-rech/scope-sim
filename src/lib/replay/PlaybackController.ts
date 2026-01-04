/**
 * REPLAY PLAYBACK CONTROLLER
 * 
 * Provides smooth playback with:
 * - Variable speed: 0.25x, 0.5x, 1x, 2x, 4x
 * - Frame interpolation for smooth motion at any speed
 * - Timeline scrubbing with instant seeking
 * - Event markers for jumping to significant moments
 */

import type { 
  Recording, 
  RecordingFrame, 
  InterpolatedFrame, 
  PlaybackState, 
  PlaybackSpeed 
} from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 180) % 360) - 180;
  return a + diff * Math.max(0, Math.min(1, t));
}

class PlaybackController {
  private recording: Recording | null = null;
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    currentFrameIndex: 0,
  };
  private animationId: number | null = null;
  private lastTickTime: number = 0;
  private onFrameUpdate: ((frame: InterpolatedFrame) => void) | null = null;
  private onStateChange: ((state: PlaybackState) => void) | null = null;

  load(recording: Recording): void {
    this.recording = recording;
    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: recording.metadata.duration,
      speed: 1,
      currentFrameIndex: 0,
    };
    this.onStateChange?.(this.state);
    
    // Emit first frame
    if (recording.frames.length > 0) {
      this.emitCurrentFrame();
    }
  }

  play(): void {
    if (!this.recording) return;
    this.state.isPlaying = true;
    this.lastTickTime = performance.now();
    this.tick();
    this.onStateChange?.({ ...this.state });
  }

  pause(): void {
    this.state.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.onStateChange?.({ ...this.state });
  }

  toggle(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.state.speed = speed;
    this.onStateChange?.({ ...this.state });
  }

  seek(timeMs: number): void {
    this.state.currentTime = Math.max(0, Math.min(timeMs, this.state.duration));
    this.updateCurrentFrame();
    this.emitCurrentFrame();
    this.onStateChange?.({ ...this.state });
  }

  seekToEvent(eventIndex: number): void {
    if (!this.recording || eventIndex >= this.recording.events.length) return;
    const event = this.recording.events[eventIndex];
    this.seek(event.timestamp);
  }

  seekToStart(): void {
    this.seek(0);
  }

  seekToEnd(): void {
    this.seek(this.state.duration);
  }

  stepForward(): void {
    if (!this.recording) return;
    const nextIndex = Math.min(this.state.currentFrameIndex + 1, this.recording.frames.length - 1);
    if (nextIndex < this.recording.frames.length) {
      this.seek(this.recording.frames[nextIndex].timestamp);
    }
  }

  stepBackward(): void {
    if (!this.recording) return;
    const prevIndex = Math.max(this.state.currentFrameIndex - 1, 0);
    this.seek(this.recording.frames[prevIndex].timestamp);
  }

  private tick(): void {
    if (!this.state.isPlaying || !this.recording) return;
    
    const now = performance.now();
    const deltaMs = (now - this.lastTickTime) * this.state.speed;
    this.lastTickTime = now;
    
    this.state.currentTime += deltaMs;
    
    if (this.state.currentTime >= this.state.duration) {
      this.state.currentTime = this.state.duration;
      this.pause();
      return;
    }
    
    this.updateCurrentFrame();
    this.emitCurrentFrame();
    this.onStateChange?.({ ...this.state });
    
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  private updateCurrentFrame(): void {
    if (!this.recording) return;
    
    const frames = this.recording.frames;
    let low = 0, high = frames.length - 1;
    
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (frames[mid].timestamp <= this.state.currentTime) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    
    this.state.currentFrameIndex = low;
  }

  private emitCurrentFrame(): void {
    if (!this.recording || !this.onFrameUpdate) return;
    
    const frames = this.recording.frames;
    const frameA = frames[this.state.currentFrameIndex];
    const frameB = frames[this.state.currentFrameIndex + 1];
    
    const interpolated = this.interpolateFrames(frameA, frameB, this.state.currentTime);
    this.onFrameUpdate(interpolated);
  }

  private interpolateFrames(a: RecordingFrame, b: RecordingFrame | undefined, time: number): InterpolatedFrame {
    if (!b) return this.frameToInterpolated(a);
    
    const t = (time - a.timestamp) / (b.timestamp - a.timestamp);
    
    return {
      scopePosition: {
        x: lerp(a.scopePosition[0], b.scopePosition[0], t),
        y: lerp(a.scopePosition[1], b.scopePosition[1], t),
        z: lerp(a.scopePosition[2], b.scopePosition[2], t),
      },
      scopeAngle: a.scopeAngle,
      scopeRotation: lerpAngle(a.scopeRotation, b.scopeRotation, t),
      insertionDepth: lerp(a.insertionDepth, b.insertionDepth, t),
      activeTool: b.activeTool ?? a.activeTool,
      isToolActive: b.isToolActive ?? a.isToolActive,
      surgicalStep: b.surgicalStep ?? a.surgicalStep,
      bloodLevel: lerp(a.bloodLevel ?? 0, b.bloodLevel ?? a.bloodLevel ?? 0, t),
    };
  }

  private frameToInterpolated(frame: RecordingFrame): InterpolatedFrame {
    return {
      scopePosition: {
        x: frame.scopePosition[0],
        y: frame.scopePosition[1],
        z: frame.scopePosition[2],
      },
      scopeAngle: frame.scopeAngle,
      scopeRotation: frame.scopeRotation,
      insertionDepth: frame.insertionDepth,
      activeTool: frame.activeTool,
      isToolActive: frame.isToolActive,
      surgicalStep: frame.surgicalStep,
      bloodLevel: frame.bloodLevel ?? 0,
    };
  }

  setFrameCallback(callback: (frame: InterpolatedFrame) => void): void {
    this.onFrameUpdate = callback;
  }

  setStateCallback(callback: (state: PlaybackState) => void): void {
    this.onStateChange = callback;
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  getRecording(): Recording | null {
    return this.recording;
  }

  unload(): void {
    this.pause();
    this.recording = null;
    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      speed: 1,
      currentFrameIndex: 0,
    };
    this.onStateChange?.(this.state);
  }
}

export const playbackController = new PlaybackController();
