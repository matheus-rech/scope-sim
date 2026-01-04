import * as THREE from 'three';
import { getICAMetrics, ICAMetrics } from '@/lib/anatomy/ICAGeometry';

/**
 * SURGICAL-GRADE PROCEDURAL AUDIO ENGINE
 * 
 * Generates real-time Doppler audio feedback based on proximity to ICA.
 * Uses Web Audio API with smooth parameter transitions for realistic simulation.
 * 
 * Features:
 * - Sawtooth oscillator for Doppler whoosh character
 * - Heartbeat pulsatility at 70 BPM
 * - Inverse square law falloff for realistic proximity sensing
 * - Smooth frequency/gain transitions to prevent audio artifacts
 */
export class DopplerAudio {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private lfo: OscillatorNode | null = null; // For heartbeat modulation
  private lfoGain: GainNode | null = null;
  private isInitialized = false;
  private lastMetrics: ICAMetrics | null = null;
  
  // Reusable vector to avoid GC
  private readonly _toolPos = new THREE.Vector3();

  constructor() {
    // Audio context created on first user interaction (browser requirement)
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  initialize(): boolean {
    if (this.isInitialized && this.ctx) return true;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
      console.log('[DopplerAudio] Initialized AudioContext');
      return true;
    } catch (e) {
      console.error('[DopplerAudio] Failed to create AudioContext:', e);
      return false;
    }
  }

  /**
   * Calculate and update Doppler signal based on tool position.
   * Uses the optimized ICA segment projection for smooth audio.
   * 
   * @param toolPos - Tool tip position in world coordinates
   * @param active - Whether Doppler tool is currently active
   * @returns Current ICA metrics
   */
  updateDoppler(toolPos: THREE.Vector3, active: boolean): ICAMetrics {
    if (!active) {
      this.silence();
      return {
        signal: 0,
        rawIntensity: 0,
        distance: Infinity,
        nearestSide: 'left',
        dangerLevel: 'safe',
      };
    }

    // Use ctx.currentTime for precise audio-synced time
    const time = this.ctx?.currentTime ?? Date.now() / 1000;
    const metrics = getICAMetrics(toolPos, time);
    this.lastMetrics = metrics;

    if (metrics.signal < 0.02) {
      this.silence();
      return metrics;
    }

    this.playSound(metrics);
    return metrics;
  }

  /**
   * Generate Doppler sound with smooth parameter transitions
   */
  private playSound(metrics: ICAMetrics): void {
    if (!this.ctx) {
      if (!this.initialize()) return;
    }
    if (!this.ctx) return;

    // Create oscillator graph if not exists
    if (!this.osc) {
      this.createAudioGraph();
    }

    if (!this.gain || !this.osc) return;

    const t = this.ctx.currentTime;

    // --- FREQUENCY: Pitch shift based on blood velocity simulation ---
    // Higher frequency = closer to vessel = faster blood flow (Doppler shift)
    const baseFreq = 350;  // Base frequency (Hz)
    const maxFreq = 1400;  // Maximum at closest proximity
    const targetFreq = baseFreq + (metrics.rawIntensity * (maxFreq - baseFreq));
    
    // Smooth transition to prevent clicks (100ms ramp)
    this.osc.frequency.setTargetAtTime(targetFreq, t, 0.1);

    // --- GAIN: Volume with pulsatility already baked into signal ---
    // The metrics.signal includes heartbeat modulation
    const targetGain = metrics.signal * 0.35;
    this.gain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  /**
   * Create the audio oscillator graph with LFO modulation
   */
  private createAudioGraph(): void {
    if (!this.ctx) return;

    // Main oscillator - sawtooth for that classic Doppler whoosh
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 350;

    // Main gain node
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;

    // Create low-pass filter for smoother sound (less harsh)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;

    // Connect: OSC -> Filter -> Gain -> Destination
    this.osc.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc.start();
    console.log('[DopplerAudio] Audio graph created');
  }

  /**
   * Silence the Doppler audio gracefully
   */
  silence(): void {
    if (this.gain && this.ctx) {
      // Fade out over 100ms to prevent clicks
      const t = this.ctx.currentTime;
      this.gain.gain.setTargetAtTime(0, t, 0.1);
    }

    // Don't destroy oscillator immediately - let it fade
    // We'll reuse it for next activation
  }

  /**
   * Play critical alarm for ICA injury event
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

    // Descending alarm sweep (classic medical emergency tone)
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
   * Play success chime for completed objectives
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

    // Ascending major triad (C5 -> E5 -> G5)
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.setValueAtTime(659, t + 0.1);
    osc.frequency.setValueAtTime(784, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Get last calculated metrics
   */
  getMetrics(): ICAMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get current signal intensity (legacy compatibility)
   */
  getIntensity(): number {
    return this.lastMetrics?.rawIntensity ?? 0;
  }

  /**
   * Clean up all audio resources
   */
  dispose(): void {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        // Oscillator may already be stopped
      }
      this.osc = null;
    }

    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch {
        // LFO may already be stopped
      }
      this.lfo = null;
    }

    this.gain = null;
    this.lfoGain = null;
    this.lastMetrics = null;

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.isInitialized = false;
    console.log('[DopplerAudio] Disposed');
  }
}

// Singleton instance
export const dopplerAudio = new DopplerAudio();
