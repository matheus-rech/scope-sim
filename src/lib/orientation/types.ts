import { LucideIcon } from 'lucide-react';

export type DemoActionType = 
  | 'ai_request'
  | 'image_generate'
  | 'camera_move'
  | 'tool_switch'
  | 'overlay_show'
  | 'doppler_activate'
  | 'search_demo'
  | 'wait';

export interface DemoAction {
  type: DemoActionType;
  timestamp: number; // seconds from chapter start
  duration?: number; // how long this action takes
  data?: Record<string, unknown>;
}

export interface NarrationSegment {
  text: string;
  startTime: number; // seconds
}

export interface DemoChapter {
  id: string;
  title: string;
  description: string;
  duration: number; // total seconds
  iconName: string;
  narrationSegments: NarrationSegment[];
  demoActions: DemoAction[];
}

export interface ChapterProgress {
  chapterId: string;
  completed: boolean;
  completedAt?: number;
}

export interface OrientationProgress {
  chapters: ChapterProgress[];
  lastChapterId?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentChapterId: string;
  currentNarrationIndex: number;
}
