/**
 * SURGICAL-GRADE HAPTIC FEEDBACK ENGINE
 * 
 * Provides tactile warnings based on ICA proximity using the Vibration API.
 * Patterns are designed for intuitive danger recognition:
 * - Safe: No vibration
 * - Caution (1.0-0.5cm): Gentle single pulse every 800ms
 * - Warning (0.5-0.3cm): Rapid double-pulse every 400ms  
 * - Critical (<0.3cm): Continuous heavy vibration
 */

export type DangerLevel = 'safe' | 'caution' | 'warning' | 'critical';

interface HapticPattern {
  pattern: number[];      // Vibration pattern [vibrate, pause, vibrate...]
  interval: number;       // Repeat interval (ms)
  description: string;
}

const HAPTIC_PATTERNS: Record<DangerLevel, HapticPattern> = {
  safe: { 
    pattern: [], 
    interval: 0, 
    description: 'No feedback' 
  },
  caution: { 
    pattern: [25], 
    interval: 800, 
    description: 'Gentle pulse' 
  },
  warning: { 
    pattern: [40, 60, 40], 
    interval: 400, 
    description: 'Rapid double-pulse' 
  },
  critical: { 
    pattern: [100, 30, 100, 30, 100], 
    interval: 200, 
    description: 'Continuous alarm' 
  },
};

class HapticFeedbackEngine {
  private currentLevel: DangerLevel = 'safe';
  private intervalId: number | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Update the danger level and adjust haptic pattern accordingly
   */
  updateDangerLevel(level: DangerLevel): void {
    if (level === this.currentLevel) return;
    
    this.currentLevel = level;
    this.startPattern(level);
  }

  /**
   * Start the haptic pattern for the given danger level
   */
  private startPattern(level: DangerLevel): void {
    this.stop();
    
    if (level === 'safe' || !this.isSupported) return;

    const { pattern, interval } = HAPTIC_PATTERNS[level];
    
    // Immediate feedback
    navigator.vibrate(pattern);
    
    // Continuous pattern for sustained danger
    this.intervalId = window.setInterval(() => {
      navigator.vibrate(pattern);
    }, interval);
  }

  /**
   * Stop all haptic feedback
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.isSupported) {
      navigator.vibrate(0); // Cancel any ongoing vibration
    }
    
    this.currentLevel = 'safe';
  }

  /**
   * Trigger single-shot haptic event for discrete actions
   */
  triggerEvent(type: 'toolActivate' | 'wallContact' | 'boneHit' | 'alarm' | 'success'): void {
    if (!this.isSupported) return;
    
    const patterns: Record<string, number[]> = {
      toolActivate: [25],
      wallContact: [15],
      boneHit: [50, 30, 50],
      alarm: [100, 50, 100, 50, 200],
      success: [20, 50, 40],
    };
    
    navigator.vibrate(patterns[type] || [25]);
  }

  /**
   * Get current danger level
   */
  getCurrentLevel(): DangerLevel {
    return this.currentLevel;
  }

  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return this.isSupported;
  }
}

// Singleton instance for app-wide use
export const hapticEngine = new HapticFeedbackEngine();

/**
 * Convert ICA distance to danger level
 */
export function distanceToDangerLevel(distance: number): DangerLevel {
  if (distance < 0.3) return 'critical';
  if (distance < 0.5) return 'warning';
  if (distance < 1.0) return 'caution';
  return 'safe';
}
