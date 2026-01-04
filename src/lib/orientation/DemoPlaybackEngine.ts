import { DemoChapter, DemoAction, PlaybackState } from './types';

type PlaybackCallback = (state: PlaybackState) => void;
type ActionCallback = (action: DemoAction) => void;
type NarrationCallback = (text: string, index: number) => void;

export class DemoPlaybackEngine {
  private chapter: DemoChapter | null = null;
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentChapterId: '',
    currentNarrationIndex: -1,
  };
  
  private animationId: number | null = null;
  private lastTickTime: number = 0;
  private executedActions: Set<number> = new Set();
  private spokenNarrations: Set<number> = new Set();
  
  private onStateChange: PlaybackCallback | null = null;
  private onAction: ActionCallback | null = null;
  private onNarration: NarrationCallback | null = null;

  loadChapter(chapter: DemoChapter): void {
    this.chapter = chapter;
    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: chapter.duration,
      currentChapterId: chapter.id,
      currentNarrationIndex: -1,
    };
    this.executedActions.clear();
    this.spokenNarrations.clear();
    this.emitState();
  }

  play(): void {
    if (!this.chapter) return;
    this.state.isPlaying = true;
    this.lastTickTime = performance.now();
    this.tick();
    this.emitState();
  }

  pause(): void {
    this.state.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emitState();
  }

  seek(timeSeconds: number): void {
    this.state.currentTime = Math.max(0, Math.min(timeSeconds, this.state.duration));
    
    // Reset executed actions/narrations that are after the seek point
    this.executedActions = new Set(
      Array.from(this.executedActions).filter(i => 
        this.chapter!.demoActions[i]?.timestamp <= this.state.currentTime
      )
    );
    this.spokenNarrations = new Set(
      Array.from(this.spokenNarrations).filter(i => 
        this.chapter!.narrationSegments[i]?.startTime <= this.state.currentTime
      )
    );
    
    this.emitState();
  }

  reset(): void {
    this.state.currentTime = 0;
    this.state.currentNarrationIndex = -1;
    this.executedActions.clear();
    this.spokenNarrations.clear();
    this.emitState();
  }

  stop(): void {
    this.pause();
    this.reset();
  }

  setCallbacks(
    onStateChange: PlaybackCallback,
    onAction: ActionCallback,
    onNarration: NarrationCallback
  ): void {
    this.onStateChange = onStateChange;
    this.onAction = onAction;
    this.onNarration = onNarration;
  }

  getState(): PlaybackState {
    return { ...this.state };
  }

  isComplete(): boolean {
    return this.state.currentTime >= this.state.duration;
  }

  private tick(): void {
    if (!this.state.isPlaying || !this.chapter) return;

    const now = performance.now();
    const deltaSeconds = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    this.state.currentTime += deltaSeconds;

    if (this.state.currentTime >= this.state.duration) {
      this.state.currentTime = this.state.duration;
      this.state.isPlaying = false;
      this.emitState();
      return;
    }

    // Check for actions to execute
    this.chapter.demoActions.forEach((action, index) => {
      if (!this.executedActions.has(index) && action.timestamp <= this.state.currentTime) {
        this.executedActions.add(index);
        this.onAction?.(action);
      }
    });

    // Check for narration segments
    this.chapter.narrationSegments.forEach((segment, index) => {
      if (!this.spokenNarrations.has(index) && segment.startTime <= this.state.currentTime) {
        this.spokenNarrations.add(index);
        this.state.currentNarrationIndex = index;
        this.onNarration?.(segment.text, index);
      }
    });

    this.emitState();
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  private emitState(): void {
    this.onStateChange?.({ ...this.state });
  }
}

export const demoPlaybackEngine = new DemoPlaybackEngine();
