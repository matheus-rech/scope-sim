import * as THREE from 'three';
import { LEFT_ICA_CURVE, RIGHT_ICA_CURVE } from '@/lib/anatomy/ICAGeometry';

/**
 * Procedural audio engine for Doppler sonography
 * Generates real-time audio feedback based on proximity to ICA
 */
export class DopplerAudio {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isInitialized = false;
  private lastIntensity = 0;

  constructor() {
    // Audio context created on first user interaction
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  initialize(): boolean {
    if (this.isInitialized && this.ctx) return true;
    
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return false;
    }
  }

  /**
   * Calculate Doppler signal intensity based on tool proximity to ICA
   * Returns signal strength 0-1
   */
  calculateSignal(toolPos: THREE.Vector3): number {
    if (!LEFT_ICA_CURVE || !RIGHT_ICA_CURVE) return 0;
    
    // Sample points along both ICA curves
    const leftPoints = LEFT_ICA_CURVE.getPoints(30);
    const rightPoints = RIGHT_ICA_CURVE.getPoints(30);
    
    // Find minimum distance to either ICA
    let minDist = Infinity;
    
    for (const p of leftPoints) {
      const d = toolPos.distanceTo(p);
      if (d < minDist) minDist = d;
    }
    
    for (const p of rightPoints) {
      const d = toolPos.distanceTo(p);
      if (d < minDist) minDist = d;
    }
    
    // Doppler physics: max signal at 0cm, silence at >2cm
    if (minDist < 2.0) {
      return 1.0 - (minDist / 2.0);
    }
    
    return 0;
  }

  /**
   * Update Doppler audio based on tool position
   * @returns Signal intensity 0-1
   */
  updateDoppler(toolPos: THREE.Vector3, active: boolean): number {
    if (!active) {
      this.silence();
      return 0;
    }

    const intensity = this.calculateSignal(toolPos);
    
    if (intensity < 0.05) {
      this.silence();
      return 0;
    }

    this.playSound(intensity);
    return intensity;
  }

  /**
   * Generate Doppler sound based on signal intensity
   */
  private playSound(intensity: number): void {
    if (!this.ctx) {
      if (!this.initialize()) return;
    }

    if (!this.ctx) return;

    // Create oscillator if not exists
    if (!this.osc) {
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      
      this.osc.type = 'sawtooth';
      this.osc.connect(this.gain!);
      this.gain!.connect(this.ctx.destination);
      this.osc.start();
    }

    if (!this.gain) return;

    const t = this.ctx.currentTime;
    
    // Pitch shift based on blood velocity simulation
    // Higher frequency = closer to vessel = faster blood flow
    const baseFreq = 400;
    const maxFreq = 1600;
    const targetFreq = baseFreq + (intensity * (maxFreq - baseFreq));
    this.osc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    
    // Heartbeat modulation (70 BPM = ~1.17 Hz)
    const heartbeatPhase = Math.sin(t * Math.PI * 2 * (70 / 60));
    const pulse = 0.6 + 0.4 * heartbeatPhase;
    
    // Volume based on intensity and pulse
    const targetGain = intensity * pulse * 0.4;
    this.gain.gain.setTargetAtTime(targetGain, t, 0.1);
    
    this.lastIntensity = intensity;
  }

  /**
   * Silence the Doppler audio
   */
  silence(): void {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        // Oscillator may already be stopped
      }
      this.osc = null;
    }
    this.gain = null;
    this.lastIntensity = 0;
  }

  /**
   * Play alarm sound for critical events (ICA injury)
   */
  triggerAlarm(): void {
    if (!this.ctx) {
      if (!this.initialize()) return;
    }

    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const t = this.ctx.currentTime;
    
    // Descending alarm sweep
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.5);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.start(t);
    osc.stop(t + 0.5);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }

  /**
   * Play success tone
   */
  playSuccess(): void {
    if (!this.ctx) {
      if (!this.initialize()) return;
    }

    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const t = this.ctx.currentTime;
    
    // Ascending success tone
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(554, t + 0.1);
    osc.frequency.setValueAtTime(659, t + 0.2);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    this.silence();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }

  /**
   * Get current signal intensity
   */
  getIntensity(): number {
    return this.lastIntensity;
  }
}

// Singleton instance
export const dopplerAudio = new DopplerAudio();
