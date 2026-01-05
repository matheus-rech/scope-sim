import { useState, useCallback, useRef } from 'react';
import { AttendingMessage, GameState } from '@/types/simulator';

type CoachingTrigger = 'periodic' | 'collision' | 'tool_change' | 'complication' | 'milestone' | 'doppler_warning';

interface UseAICoachOptions {
  minInterval?: number;
  enabled?: boolean;
}

export function useAICoach(options: UseAICoachOptions = {}) {
  const { minInterval = 15000, enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const lastCallRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);

  const requestCoaching = useCallback(async (
    gameState: GameState,
    trigger: CoachingTrigger,
    recentActions: string[] = []
  ): Promise<AttendingMessage | null> => {
    if (!enabled) return null;
    
    const now = Date.now();
    if (trigger === 'periodic' && now - lastCallRef.current < minInterval) {
      return null;
    }
    
    if (pendingRef.current && trigger === 'periodic') {
      return null;
    }

    pendingRef.current = true;
    setIsLoading(true);

    try {
      const context = {
        currentLevel: gameState.currentLevel,
        levelName: gameState.levelState.name,
        timeElapsed: gameState.levelState.metrics.timeElapsed,
        activeTool: gameState.tool.activeTool,
        dopplerUsed: gameState.tool.dopplerState.isActive || (gameState.levelState.metrics.dopplerUsed ?? false),
        dopplerSignal: gameState.tool.dopplerState.signalStrength,
        nearestICADistance: gameState.tool.dopplerState.nearestICADistance,
        isColliding: gameState.endoscope.isColliding,
        collidingStructure: gameState.endoscope.collidingStructure,
        mucosalContacts: gameState.levelState.metrics.mucosalContacts,
        complications: gameState.complications.map(c => c.type),
        scenario: gameState.scenario ? {
          type: gameState.scenario.type,
          knospGrade: gameState.scenario.knospGrade,
          goal: gameState.scenario.goal,
        } : undefined,
        recentActions,
        objectivesCompleted: gameState.levelState.objectives.filter(o => o.isCompleted).length,
        totalObjectives: gameState.levelState.objectives.length,
      };

      const response = await fetch('/api/surgical-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, trigger })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('AI Coach error:', data.error);
        return null;
      }

      lastCallRef.current = now;

      if (data.message) {
        const message: AttendingMessage = {
          id: `ai-${Date.now()}`,
          text: data.message,
          type: data.type || 'info',
          timestamp: data.timestamp || Date.now(),
        };
        return message;
      }

      if (data.fallbackMessage) {
        return {
          id: `fallback-${Date.now()}`,
          text: data.fallbackMessage,
          type: 'info',
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('AI Coach request failed:', error);
      return null;
    } finally {
      setIsLoading(false);
      pendingRef.current = false;
    }
  }, [enabled, minInterval]);

  return {
    requestCoaching,
    isLoading,
  };
}
