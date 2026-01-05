/**
 * Audio Engine - Doppler and Surgical Sound Effects
 * Matches Schema: src/engines/audio.ts
 */

import * as THREE from 'three';
import { getNearestICADistance, getDangerLevel, ICA_PARAMS } from '../anatomy';

export interface DopplerMetrics {
  signal: number;         // 0-1 signal strength with pulsatility
  rawIntensity: number;   // 0-1 proximity-based intensity
  distance: number;       // Distance to nearest ICA in cm
  nearestSide: 'left' | 'right';
  dangerLevel: 'critical' | 'danger' | 'caution' | 'safe';
}

/**
 * Procedural Doppler Audio Engine
 * 
 * Generates real-time Doppler audio feedback based on proximity to ICA.
 * Uses Web Audio API with smooth parameter transitions.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isInitialized = false;
  private lastMetrics: DopplerMetrics | null = null;

  initialize(): boolean {
    if (this.isInitialized && this.ctx) return true;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
      console.log('[AudioEngine] Initialized');
      return true;
    } catch (e) {
      console.error('[AudioEngine] Failed to initialize:', e);
      return false;
    }
  }

  /**
   * Update Doppler signal based on tool position
   */
  updateDoppler(toolPos: THREE.Vector3, active: boolean, time?: number): DopplerMetrics {
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

    const { distance, side, nearestPoint } = getNearestICADistance(toolPos);
    
    // Inverse square law falloff with plateau for close distances
    const rawIntensity = distance < 0.1 
      ? 1.0 
      : Math.min(1.0, 1.0 / (1 + distance * distance));
    
    // Add heartbeat pulsatility (70 BPM = 1.167 Hz)
    const t = time ?? (this.ctx?.currentTime ?? Date.now() / 1000);
    const heartbeat = Math.sin(t * Math.PI * 2 * 1.167);
    const pulsatility = 0.15 + 0.85 * ((heartbeat + 1) / 2);
    
    const signal = rawIntensity * pulsatility;
    
    const metrics: DopplerMetrics = {
      signal,
      rawIntensity,
      distance,
      nearestSide: side,
      dangerLevel: getDangerLevel(distance),
    };
    
    this.lastMetrics = metrics;

    // Trigger haptic feedback for danger zones
    if (metrics.dangerLevel === 'critical' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    } else if (metrics.dangerLevel === 'danger' && navigator.vibrate) {
      navigator.vibrate(30);
    }

    if (signal < 0.02) {
      this.silence();
      return metrics;
    }

    this.playDoppler(metrics);
    return metrics;
  }

  private playDoppler(metrics: DopplerMetrics): void {
    if (!this.ctx) {
      if (!this.initialize()) return;
    }
    if (!this.ctx) return;

    if (!this.osc) {
      this.createAudioGraph();
    }

    if (!this.gain || !this.osc) return;

    const t = this.ctx.currentTime;

    // Frequency: Higher = closer (Doppler shift simulation)
    const baseFreq = 350;
    const maxFreq = 1400;
    const targetFreq = baseFreq + (metrics.rawIntensity * (maxFreq - baseFreq));
    
    this.osc.frequency.setTargetAtTime(targetFreq, t, 0.1);

    // Volume with pulsatility
    const targetGain = metrics.signal * 0.35;
    this.gain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  private createAudioGraph(): void {
    if (!this.ctx) return;

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 350;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 0.5;

    this.osc.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc.start();
  }

  silence(): void {
    if (this.gain && this.ctx) {
      const t = this.ctx.currentTime;
      this.gain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

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

    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.5);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.start(t);
    osc.stop(t + 0.5);

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }

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

    osc.frequency.setValueAtTime(523, t);
    osc.frequency.setValueAtTime(659, t + 0.1);
    osc.frequency.setValueAtTime(784, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  getMetrics(): DopplerMetrics | null {
    return this.lastMetrics;
  }

  dispose(): void {
    if (this.osc) {
      try { this.osc.stop(); } catch {}
      this.osc = null;
    }

    this.gain = null;
    this.filter = null;
    this.lastMetrics = null;

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.isInitialized = false;
  }
}

export const audioEngine = new AudioEngine();
