import { useState, useCallback, useRef } from 'react';

const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George - professional male voice

interface UseOrientationNarrationOptions {
  onNarrationStart?: () => void;
  onNarrationEnd?: () => void;
}

export function useOrientationNarration(options: UseOrientationNarrationOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    try {
      setError(null);
      setIsSpeaking(true);
      options.onNarrationStart?.();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orientation-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: VOICE_ID }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });

    } catch (err) {
      console.error('Narration error:', err);
      setError(err instanceof Error ? err.message : 'Narration failed');
    } finally {
      setIsSpeaking(false);
      options.onNarrationEnd?.();
    }
  }, [options]);

  const queueNarration = useCallback(async (text: string) => {
    queueRef.current.push(text);
    
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (queueRef.current.length > 0) {
      const nextText = queueRef.current.shift();
      if (nextText) {
        await speak(nextText);
      }
    }

    isProcessingRef.current = false;
  }, [speak]);

  const stop = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
  }, []);

  return {
    speak,
    queueNarration,
    stop,
    clearQueue,
    isSpeaking,
    error,
  };
}
