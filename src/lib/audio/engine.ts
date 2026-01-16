// src/lib/audio/engine.ts

import { Track } from '../types';
import { getCachedTrack } from '../storage/db';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();

  // Current active song's buffers (references into decodedCache)
  private activeBuffers: Map<string, AudioBuffer> = new Map();
  private activeSongId: number | null = null;

  // Persistent cache of decoded audio buffers across all songs
  // Structure: decodedCache[songId][trackFilename] = AudioBuffer
  private decodedCache: Map<number, Map<string, AudioBuffer>> = new Map();
  private maxCachedSongs = 10;

  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Check if a song is already decoded and cached
   */
  isSongCached(songId: number): boolean {
    return this.decodedCache.has(songId);
  }

  /**
   * Load all tracks for a song - uses cache if available
   */
  async loadSong(songId: number, tracks: Track[]): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Check if already decoded in memory
    if (this.decodedCache.has(songId)) {
      // Use cached buffers - instant activation!
      this.activateSong(songId);
      return;
    }

    // Otherwise decode and cache
    await this.decodeAndCacheSong(songId, tracks);
    this.activateSong(songId);
  }

  /**
   * Preload a song in background (decode without activating)
   * Call this to warm the cache for setlist songs
   */
  async preloadSong(songId: number, tracks: Track[]): Promise<void> {
    if (!this.audioContext) {
      return;
    }

    // Skip if already cached
    if (this.decodedCache.has(songId)) {
      return;
    }

    // Decode in background
    await this.decodeAndCacheSong(songId, tracks);
  }

  /**
   * Decode all tracks for a song in parallel and cache them
   */
  private async decodeAndCacheSong(songId: number, tracks: Track[]): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Parallel decoding of all tracks
    const decodePromises = tracks.map(async (track) => {
      const arrayBuffer = await getCachedTrack(songId, track.converted_filename);

      if (!arrayBuffer) {
        throw new Error(`Track not found in cache: ${track.converted_filename}`);
      }

      // Clone the ArrayBuffer since decodeAudioData detaches it
      const clonedBuffer = arrayBuffer.slice(0);
      const audioBuffer = await this.audioContext!.decodeAudioData(clonedBuffer);

      return { filename: track.converted_filename, buffer: audioBuffer };
    });

    const results = await Promise.all(decodePromises);

    // Store all decoded buffers in cache
    const songCache = new Map<string, AudioBuffer>();
    results.forEach((r) => songCache.set(r.filename, r.buffer));
    this.decodedCache.set(songId, songCache);

    // Enforce memory limit
    this.enforceMemoryLimit();
  }

  /**
   * Activate a cached song for playback (switch to it without re-decoding)
   */
  private activateSong(songId: number): void {
    const songBuffers = this.decodedCache.get(songId);
    if (!songBuffers) {
      throw new Error(`Song ${songId} not found in decoded cache`);
    }

    // Stop current playback if any
    this.stop();

    // Clear previous gain nodes
    this.gainNodes.clear();

    // Set the active buffers reference
    this.activeBuffers = songBuffers;
    this.activeSongId = songId;

    // Create gain nodes for each track
    songBuffers.forEach((buffer, filename) => {
      const gainNode = this.audioContext!.createGain();
      gainNode.connect(this.audioContext!.destination);
      this.gainNodes.set(filename, gainNode);
    });
  }

  /**
   * Enforce memory limit by removing oldest cached songs
   */
  private enforceMemoryLimit(): void {
    while (this.decodedCache.size > this.maxCachedSongs) {
      // Get the first (oldest) entry
      const firstKey = this.decodedCache.keys().next().value;

      // Don't remove the currently active song
      if (firstKey !== this.activeSongId) {
        this.decodedCache.delete(firstKey);
      } else {
        // If the oldest is active, try the next one
        const keys = Array.from(this.decodedCache.keys());
        for (const key of keys) {
          if (key !== this.activeSongId) {
            this.decodedCache.delete(key);
            break;
          }
        }
        break;
      }
    }
  }

  /**
   * Clear a specific song from the decoded cache
   */
  clearSongFromCache(songId: number): void {
    if (songId !== this.activeSongId) {
      this.decodedCache.delete(songId);
    }
  }

  /**
   * Clear all cached buffers (call when leaving mixer)
   */
  clearAllCachedBuffers(): void {
    this.stop();
    this.decodedCache.clear();
    this.activeBuffers.clear();
    this.activeSongId = null;
  }

  /**
   * Get number of songs currently cached
   */
  getCachedSongCount(): number {
    return this.decodedCache.size;
  }

  /**
   * Play all tracks in sync
   */
  play(): void {
    if (!this.audioContext || this.activeBuffers.size === 0) {
      console.error('No audio loaded');
      return;
    }

    // Resume AudioContext if suspended (iOS requirement)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Clear any existing sources
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source might already be stopped
      }
    });
    this.sources.clear();

    // Calculate start time
    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;

    // Create and start all sources
    this.activeBuffers.forEach((buffer, filename) => {
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
      } catch {
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
    if (this.activeBuffers.size === 0) return 0;

    // Return duration of first track (all should be same length)
    const firstBuffer = Array.from(this.activeBuffers.values())[0];
    return firstBuffer.duration;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    this.decodedCache.clear();
    this.activeBuffers.clear();
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
