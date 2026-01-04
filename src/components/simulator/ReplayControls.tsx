/**
 * REPLAY CONTROLS COMPONENT
 * 
 * Provides:
 * - Play/Pause button
 * - Speed selector (0.25x to 4x)
 * - Timeline scrubber with event markers
 * - Current time / duration display
 */

import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicalCard } from '@/components/ui/medical-card';
import { cn } from '@/lib/utils';
import type { PlaybackState, PlaybackSpeed, RecordingEvent } from '@/lib/replay/types';

interface ReplayControlsProps {
  playbackState: PlaybackState;
  events: RecordingEvent[];
  onPlay: () => void;
  onPause: () => void;
  onSeek: (timeMs: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSeekToEvent: (index: number) => void;
  onSeekToStart: () => void;
  onSeekToEnd: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4];

export function ReplayControls({
  playbackState,
  events,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  onSeekToEvent,
  onSeekToStart,
  onSeekToEnd,
  onStepForward,
  onStepBackward,
}: ReplayControlsProps) {
  const { isPlaying, currentTime, duration, speed } = playbackState;
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const getEventColor = (type: RecordingEvent['type']) => {
    switch (type) {
      case 'complication': return 'bg-destructive';
      case 'step_change': return 'bg-success';
      case 'tool_change': return 'bg-primary';
      default: return 'bg-warning';
    }
  };
  
  return (
    <MedicalCard variant="default" className="p-4 space-y-4">
      {/* Timeline with event markers */}
      <div className="relative h-8">
        {/* Track background */}
        <div className="absolute inset-x-0 top-3 h-2 bg-muted rounded-full overflow-hidden">
          {/* Progress fill */}
          <div 
            className="h-full bg-primary rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Event markers */}
        {events.map((event, i) => (
          <button
            key={i}
            className="absolute top-1 w-2 h-6 -translate-x-1/2 cursor-pointer group z-10"
            style={{ left: `${(event.timestamp / duration) * 100}%` }}
            onClick={() => onSeekToEvent(i)}
          >
            <div className={cn(
              "w-full h-full rounded-sm",
              getEventColor(event.type)
            )} />
            <span className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs bg-popover px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border shadow-md z-20">
              {event.type.replace('_', ' ')}
            </span>
          </button>
        ))}
        
        {/* Scrubber input */}
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-x-0 top-0 h-8 opacity-0 cursor-pointer z-20"
        />
        
        {/* Current position indicator */}
        <div 
          className="absolute top-1 w-3 h-6 -translate-x-1/2 bg-foreground rounded-sm pointer-events-none z-10"
          style={{ left: `${progress}%` }}
        />
      </div>
      
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip to start */}
          <Button variant="ghost" size="icon" onClick={onSeekToStart} className="h-8 w-8">
            <SkipBack className="w-4 h-4" />
          </Button>
          
          {/* Step backward */}
          <Button variant="ghost" size="icon" onClick={onStepBackward} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Play/Pause */}
          <Button
            onClick={isPlaying ? onPause : onPlay}
            size="icon"
            className="h-10 w-10"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          {/* Step forward */}
          <Button variant="ghost" size="icon" onClick={onStepForward} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          {/* Skip to end */}
          <Button variant="ghost" size="icon" onClick={onSeekToEnd} className="h-8 w-8">
            <SkipForward className="w-4 h-4" />
          </Button>
          
          {/* Time display */}
          <span className="font-mono text-sm text-muted-foreground ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Speed:</span>
          {SPEED_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={speed === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSpeedChange(s)}
              className="h-7 px-2 text-xs"
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>
    </MedicalCard>
  );
}
