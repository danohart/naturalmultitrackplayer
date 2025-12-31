// src/lib/audio/engine.ts

import { Track } from '../types';
import { getCachedTrack } from '../storage/db';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Load all tracks for a song from IndexedDB
   */
  async loadSong(songId: number, tracks: Track[]): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Clear previous buffers
    this.buffers.clear();

    for (const track of tracks) {
      const arrayBuffer = await getCachedTrack(songId, track.converted_filename);
      
      if (!arrayBuffer) {
        throw new Error(`Track not found in cache: ${track.converted_filename}`);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.buffers.set(track.converted_filename, audioBuffer);

      // Create gain node for this track
      const gainNode = this.audioContext.createGain();
      gainNode.connect(this.audioContext.destination);
      this.gainNodes.set(track.converted_filename, gainNode);
    }
  }

  /**
   * Play all tracks in sync
   */
  play(): void {
    if (!this.audioContext || this.buffers.size === 0) {
      console.error('No audio loaded');
      return;
    }

    // Resume AudioContext if suspended (iOS requirement)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Clear any existing sources
    this.sources.forEach((source) => source.stop());
    this.sources.clear();

    // Calculate start time
    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;

    // Create and start all sources
    this.buffers.forEach((buffer, filename) => {
      const source = this.audioContext!.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.gainNodes.get(filename);
      if (gainNode) {
        source.connect(gainNode);
      }

      source.start(0, offset);
      this.sources.set(filename, source);
    });

    this.isPlaying = true;
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.audioContext) return;

    this.pausedAt = this.audioContext.currentTime - this.startTime;
    
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped
      }
    });
    
    this.sources.clear();
    this.isPlaying = false;
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.pause();
    this.pausedAt = 0;
    this.startTime = 0;
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    
    return this.pausedAt;
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    
    this.pause();
    this.pausedAt = time;
    
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set track volume (0-1)
   */
  setTrackVolume(trackFilename: string, volume: number): void {
    const gainNode = this.gainNodes.get(trackFilename);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * Mute/unmute a track
   */
  setTrackMuted(trackFilename: string, muted: boolean): void {
    const gainNode = this.gainNodes.get(trackFilename);
    if (gainNode) {
      gainNode.gain.value = muted ? 0 : 1;
    }
  }

  /**
   * Solo a track (mute all others)
   */
  setTrackSolo(trackFilename: string, solo: boolean): void {
    this.gainNodes.forEach((gainNode, filename) => {
      if (solo) {
        gainNode.gain.value = filename === trackFilename ? 1 : 0;
      } else {
        gainNode.gain.value = 1;
      }
    });
  }

  /**
   * Get duration of loaded song
   */
  getDuration(): number {
    if (this.buffers.size === 0) return 0;
    
    // Return duration of first track (all should be same length)
    const firstBuffer = Array.from(this.buffers.values())[0];
    return firstBuffer.duration;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.buffers.clear();
    this.gainNodes.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
