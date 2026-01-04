/**
 * useReplaySystem Hook
 * 
 * Provides React integration for the replay system:
 * - Automatic recording during active simulation
 * - Saved recordings list management
 * - Playback state and controls
 */

import { useState, useEffect, useCallback } from 'react';
import { recordingEngine } from '@/lib/replay/RecordingEngine';
import { playbackController } from '@/lib/replay/PlaybackController';
import { 
  saveRecordingToStorage, 
  loadRecordingFromStorage, 
  loadSavedRecordingsList, 
  deleteRecordingFromStorage 
} from '@/lib/replay/ReplayStorage';
import type { 
  InterpolatedFrame, 
  PlaybackState, 
  PlaybackSpeed, 
  SavedRecording,
  LevelId,
  Recording,
  RecordingEvent
} from '@/lib/replay/types';
import type { TumorScenario } from '@/types/simulator';

interface UseReplaySystemOptions {
  onPlaybackFrame?: (frame: InterpolatedFrame) => void;
}

export function useReplaySystem(options: UseReplaySystemOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [loadingRecording, setLoadingRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);

  // Load saved recordings from IndexedDB on mount
  useEffect(() => {
    loadSavedRecordingsList().then(setSavedRecordings).catch(console.error);
  }, []);

  // Setup playback callbacks
  useEffect(() => {
    if (options.onPlaybackFrame) {
      playbackController.setFrameCallback(options.onPlaybackFrame);
    }
    playbackController.setStateCallback(setPlaybackState);
    
    return () => {
      playbackController.setFrameCallback(() => {});
      playbackController.setStateCallback(() => {});
    };
  }, [options.onPlaybackFrame]);

  // Start recording
  const startRecording = useCallback((levelId: LevelId, scenario?: TumorScenario) => {
    recordingEngine.start(levelId, scenario);
    setIsRecording(true);
  }, []);

  // Capture frame (call this from useSimulator's update loop)
  const captureFrame = useCallback((gameState: {
    endoscope: {
      tipPosition: { x: number; y: number; z: number };
      currentAngle: number;
      rotation: number;
      insertionDepth: number;
    };
    tool: {
      activeTool: string;
      isActive: boolean;
    };
    step: string;
    bloodLevel: number;
  }) => {
    if (recordingEngine.isActive()) {
      recordingEngine.captureFrame(gameState as any);
    }
  }, []);

  // Record an event
  const recordEvent = useCallback((type: RecordingEvent['type'], data: Record<string, unknown>) => {
    recordingEngine.recordEvent(type, data);
  }, []);

  // Stop recording and save
  const stopRecording = useCallback(async (finalScore?: number): Promise<string | null> => {
    const metadata = recordingEngine.stop(finalScore);
    setIsRecording(false);
    
    if (!metadata) return null;
    
    const recording = recordingEngine.exportRecording();
    if (recording) {
      try {
        await saveRecordingToStorage(recording);
        const recordings = await loadSavedRecordingsList();
        setSavedRecordings(recordings);
        return recording.metadata.id;
      } catch (error) {
        console.error('Failed to save recording:', error);
        return null;
      }
    }
    
    return null;
  }, []);

  // Load and play a recording
  const loadRecording = useCallback(async (id: string) => {
    setLoadingRecording(true);
    
    try {
      const recording = await loadRecordingFromStorage(id);
      if (recording) {
        setCurrentRecording(recording);
        playbackController.load(recording);
      }
    } catch (error) {
      console.error('Failed to load recording:', error);
    }
    
    setLoadingRecording(false);
  }, []);

  // Unload current recording
  const unloadRecording = useCallback(() => {
    playbackController.unload();
    setCurrentRecording(null);
    setPlaybackState(null);
  }, []);

  // Playback controls
  const play = useCallback(() => playbackController.play(), []);
  const pause = useCallback(() => playbackController.pause(), []);
  const toggle = useCallback(() => playbackController.toggle(), []);
  const setSpeed = useCallback((speed: PlaybackSpeed) => playbackController.setSpeed(speed), []);
  const seek = useCallback((timeMs: number) => playbackController.seek(timeMs), []);
  const seekToEvent = useCallback((eventIndex: number) => playbackController.seekToEvent(eventIndex), []);
  const seekToStart = useCallback(() => playbackController.seekToStart(), []);
  const seekToEnd = useCallback(() => playbackController.seekToEnd(), []);
  const stepForward = useCallback(() => playbackController.stepForward(), []);
  const stepBackward = useCallback(() => playbackController.stepBackward(), []);

  // Delete a recording
  const deleteRecording = useCallback(async (id: string) => {
    try {
      await deleteRecordingFromStorage(id);
      const recordings = await loadSavedRecordingsList();
      setSavedRecordings(recordings);
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }, []);

  // Refresh recordings list
  const refreshRecordings = useCallback(async () => {
    try {
      const recordings = await loadSavedRecordingsList();
      setSavedRecordings(recordings);
    } catch (error) {
      console.error('Failed to refresh recordings:', error);
    }
  }, []);

  return {
    // Recording
    isRecording,
    startRecording,
    captureFrame,
    recordEvent,
    stopRecording,
    
    // Saved recordings
    savedRecordings,
    loadingRecording,
    loadRecording,
    unloadRecording,
    deleteRecording,
    refreshRecordings,
    currentRecording,
    
    // Playback
    playbackState,
    isPlaying: playbackState?.isPlaying ?? false,
    play,
    pause,
    toggle,
    setSpeed,
    seek,
    seekToEvent,
    seekToStart,
    seekToEnd,
    stepForward,
    stepBackward,
  };
}
