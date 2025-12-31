// src/lib/types/index.ts

export interface Track {
  original_filename: string;
  converted_filename: string;
  display_name: string;
  type: 'rhythm' | 'vocal' | 'harmonic';
  size_mb: number;
  duration_seconds: number;
  url: string;
}

export interface PDFs {
  chords?: string;
  lyrics?: string;
  chords_url?: string;
  lyrics_url?: string;
}

export interface Song {
  id: number;
  slug: string;
  title: string;
  song_name: string;
  bpm: number | null;
  key: string | null;
  time_signature: string | null;
  tracks: Track[];
  pdfs: PDFs;
  total_size_mb: number;
}

export interface Setlist {
  id: string;
  name: string;
  songs: Song[];
  created_at: string;
  updated_at: string;
}

export interface CachedTrack {
  songId: number;
  trackFilename: string;
  audioData: ArrayBuffer;
  cachedAt: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface TrackState {
  volume: number;
  muted: boolean;
  solo: boolean;
}
